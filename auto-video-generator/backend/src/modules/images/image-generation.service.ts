import { ImagePromptMasterPlan, ImagePromptPlan } from '../image-prompts/image-prompts.service';
import { GeneratedSceneImage } from '../../types/image.types';
import { CloudflareProvider } from '../../providers/image/cloudflare.provider';
import { QwenImageProvider } from '../../providers/image/qwen-image.provider';
import { ImageGenerationProvider, NormalizedImageError } from '../../providers/image/image.provider';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const cloudflareProvider = new CloudflareProvider();
const qwenProvider = new QwenImageProvider();

const MEDIA_DIR = path.join(process.cwd(), 'data', 'images');

// Ensure directory exists
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Global batch circuit breaker state.
// In a real multi-user app, this would be tied to a specific project ID or batch ID in a database.
// For our single-user local flow, a module-level variable is sufficient for short-lived batches.
let batchFailedProviders = new Set<string>();

export function resetBatchCircuitBreaker() {
  batchFailedProviders.clear();
}

export function buildFinalPrompt(
  promptPlan: ImagePromptPlan, 
  masterPlan: ImagePromptMasterPlan
): { finalPrompt: string; originalLength: number; finalLength: number } {
  const vb = masterPlan.visualBible;
  const MAX_LENGTH = 1900;
  
  // Priority 1: Characters (Only active ones)
  let charsStr = '';
  if (promptPlan.consistencyReferences?.characterIds?.length > 0) {
    promptPlan.consistencyReferences.characterIds.forEach(charId => {
      const char = masterPlan.characters.find(c => c.id === charId);
      if (char) {
        const t = char.permanentTraits;
        charsStr += `${char.displayName} (${t.apparentAge}, ${t.skinTone} skin, ${t.faceStructure}, ${t.hair}, ${t.wardrobeIdentity}). `;
      }
    });
  }

  // Priority 2: Action
  const actionStr = `Action: ${promptPlan.prompt}. `;

  // Priority 3: Environment/Location
  let envStr = '';
  if (promptPlan.consistencyReferences?.locationIds?.length > 0) {
    promptPlan.consistencyReferences.locationIds.forEach(locId => {
      const loc = masterPlan.locations.find(l => l.id === locId);
      if (loc) {
        envStr += `Location: ${loc.name} (${loc.environment}). `;
      }
    });
  }

  // Priority 4: Camera / Composition (Enforce scene-aware environment)
  let cameraStr = `Camera: ${vb.cameraLanguage}. Show full environment. `;
  if (!cameraStr.toLowerCase().includes('wide')) {
    cameraStr += `Wide establishing shot. `;
  }

  // Priority 5: Style Modifiers
  let styleStr = `${vb.overallStyle}. ${vb.styleDescription}. Realism: ${vb.realismLevel}. Mood: ${vb.visualMood}. Lighting: ${vb.lightingStyle}. `;

  // Assemble with prioritization and strict budgeting
  const components = [
    { text: charsStr, priority: 1 },
    { text: actionStr, priority: 2 },
    { text: envStr, priority: 3 },
    { text: cameraStr, priority: 4 },
    { text: styleStr, priority: 5 }
  ];

  let rawPrompt = components.map(c => c.text).join('').trim();
  const originalLength = rawPrompt.length;

  let finalPrompt = '';
  let currentLength = 0;

  for (const comp of components) {
    if (currentLength + comp.text.length <= MAX_LENGTH) {
      finalPrompt += comp.text;
      currentLength += comp.text.length;
    } else {
      // If we can't fit the whole component, truncate it safely (if it's not a critical one)
      const remainingSpace = MAX_LENGTH - currentLength;
      if (remainingSpace > 50) {
        finalPrompt += comp.text.substring(0, remainingSpace - 3) + '...';
      }
      break; // Stop adding lower priority components
    }
  }

  return {
    finalPrompt: finalPrompt.trim(),
    originalLength,
    finalLength: finalPrompt.trim().length
  };
}

export async function generateImageFromPrompt(
  promptPlan: ImagePromptPlan, 
  masterPlan: ImagePromptMasterPlan, 
  attempt: number = 1
): Promise<GeneratedSceneImage> {
  const { finalPrompt, originalLength, finalLength } = buildFinalPrompt(promptPlan, masterPlan);
  
  console.log(`[Image Generation] Scene ${promptPlan.sceneNumber} Prompt Budgeting: Original Length: ${originalLength} chars | Final Length: ${finalLength} chars`);
  
  const aspectRatio = masterPlan.visualBible.aspectRatio || '16:9';
  
  const providers: ImageGenerationProvider[] = [cloudflareProvider, qwenProvider];
  
  let result;
  let errorMsg = 'All image providers failed';
  let finalProviderUsed = 'none';

  for (const provider of providers) {
    if (!provider.isAvailable()) continue;
    
    const providerName = provider.getProviderName();
    
    // Circuit breaker check
    if (batchFailedProviders.has(providerName)) {
      console.log(`[Image Generation] Skipping ${providerName} due to previous failure in this batch.`);
      continue;
    }

    try {
      result = await provider.generateImage({
        prompt: finalPrompt,
        aspectRatio: aspectRatio,
        outputFormat: 'jpeg'
      });
      finalProviderUsed = providerName;
      break; // Success! Break out of provider fallback loop
    } catch (error: any) {
      console.error(`[Image Generation] ${providerName} failed for scene ${promptPlan.sceneNumber}:`, error.message);
      
      if (error instanceof NormalizedImageError) {
        // If it's a quota or rate limit error, break the circuit for this batch
        if (['QUOTA_EXHAUSTED', 'RATE_LIMITED', 'TEMPORARY_UNAVAILABLE'].includes(error.type)) {
          console.warn(`[Image Generation] Circuit breaker activated for ${providerName} due to ${error.type}. Fallback to next provider.`);
          batchFailedProviders.add(providerName);
        } else if (error.type === 'SAFETY_REJECTION' || error.type === 'INVALID_REQUEST') {
          // If the prompt itself is bad, don't fallback to another provider and waste credits, just fail this scene
          errorMsg = error.message;
          break; 
        }
      }
      errorMsg = error.message;
      // Continue to next fallback provider
    }
  }

  if (result) {
    const base64Image = result.imageBuffer.toString('base64');
    const imageDataUrl = `data:${result.mimeType || 'image/jpeg'};base64,${base64Image}`;

    return {
      id: crypto.randomUUID(),
      sceneId: promptPlan.id,
      sceneNumber: promptPlan.sceneNumber,
      generationStatus: 'generated',
      imageData: imageDataUrl,
      mimeType: result.mimeType,
      aspectRatio: aspectRatio,
      promptUsed: finalPrompt,
      modelUsed: `${result.provider}-${result.model}`,
      generatedAt: new Date().toISOString(),
      generationAttempt: attempt
    };
  } else {
    return {
      id: crypto.randomUUID(),
      sceneId: promptPlan.id,
      sceneNumber: promptPlan.sceneNumber,
      generationStatus: 'failed',
      aspectRatio: aspectRatio,
      promptUsed: finalPrompt,
      modelUsed: finalProviderUsed === 'none' ? 'cloudflare-flux' : finalProviderUsed,
      generatedAt: new Date().toISOString(),
      generationAttempt: attempt,
      error: errorMsg
    };
  }
}
