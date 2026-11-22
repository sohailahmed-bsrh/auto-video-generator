import { GoogleGenAI, Type, Schema } from '@google/genai';
import { config } from '../../config/env';
import { VideoScenePlan, VideoScene } from '../../types/video-scene.types';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const videoScenePlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectId: { type: Type.STRING },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          sceneNumber: { type: Type.INTEGER },
          imageId: { type: Type.STRING },
          scriptSegmentId: { type: Type.STRING },
          narrationText: { type: Type.STRING },
          estimatedNarrationDuration: { type: Type.NUMBER },
          recommendedDuration: { type: Type.NUMBER },
          scenePurpose: { type: Type.STRING },
          characterAction: { type: Type.STRING },
          characterEmotion: { type: Type.STRING },
          primaryMotion: { type: Type.STRING },
          secondaryMotion: { type: Type.STRING },
          backgroundMotion: { type: Type.STRING },
          cameraMovement: { type: Type.STRING },
          cameraSpeed: { type: Type.STRING },
          motionIntensity: { type: Type.NUMBER },
          motionPrompt: { type: Type.STRING },
          negativeMotionPrompt: { type: Type.STRING },
          continuityNotes: { type: Type.STRING },
          futureTransitionSuggestion: { type: Type.STRING },
          status: { type: Type.STRING }
        },
        required: [
          'id', 'sceneNumber', 'imageId', 'narrationText', 'estimatedNarrationDuration', 
          'recommendedDuration', 'scenePurpose', 'characterAction', 'characterEmotion', 
          'primaryMotion', 'secondaryMotion', 'backgroundMotion', 'cameraMovement', 
          'cameraSpeed', 'motionIntensity', 'motionPrompt', 'continuityNotes', 'status'
        ]
      }
    }
  },
  required: ['projectId', 'scenes']
};

export function generateFallbackVideoScenePlan(
  topic: string,
  approvedImages: any[],
  audioDuration: number
): VideoScenePlan {
  console.log('[Video Scene Planning] Executing deterministic fallback planner.');
  
  const estimatedDurationPerScene = audioDuration / (approvedImages.length || 1);
  const recommendedDuration = Math.ceil(estimatedDurationPerScene) + 2; // pad by 2 seconds

  const scenes: VideoScene[] = approvedImages.map((img, index) => ({
    id: `VSCENE_FB_${index + 1}`,
    sceneNumber: img.sceneNumber || index + 1,
    imageId: img.id,
    scriptSegmentId: 'fallback_segment',
    narrationText: img.promptUsed?.narration || 'Fallback narration',
    estimatedNarrationDuration: estimatedDurationPerScene,
    recommendedDuration: recommendedDuration,
    scenePurpose: 'Maintain visual flow',
    characterAction: 'Subtle ambient motion',
    characterEmotion: 'Neutral',
    primaryMotion: 'Subtle zoom',
    secondaryMotion: 'None',
    backgroundMotion: 'Slight ambient movement',
    cameraMovement: 'Slow zoom in',
    cameraSpeed: 'Slow',
    motionIntensity: 0.3,
    motionPrompt: 'Subtle slow zoom in. Ambient environmental motion. High quality.',
    negativeMotionPrompt: 'fast motion, blurry, morphed',
    continuityNotes: 'Follows previous scene',
    futureTransitionSuggestion: 'Cut to next scene',
    status: 'planned'
  }));

  return {
    projectId: `fallback_proj_${Date.now()}`,
    scenes
  };
}

export async function generateVideoScenePlan(
  topic: string,
  scriptData: any,
  masterPlan: any,
  approvedImages: any[],
  audioDuration: number,
  userInstructions?: string,
  isRetry: boolean = false
): Promise<VideoScenePlan> {

  // ── PERMANENT SYSTEM RULES ─────────────────────────────────────────────
  const systemRules = `
You are an expert AI Video Motion Director. Your task is to take approved images and produce a Video Scene Plan that dictates how each static image is animated.
MANDATORY TECHNICAL RULES (never skip):
- Every video scene MUST correspond to one approved image. Keep the 'imageId' unchanged.
- Calculate narration duration per scene from text length relative to total audio duration.
- Recommended video duration must slightly exceed narration duration (e.g., 5 or 10 seconds).
- motionIntensity: 0.0 (static) to 1.0 (very dynamic).
- Every 'motionPrompt' must describe: character action + camera movement + background movement + sound guidance.
- Preserve the EXACT visual identity of each image in the motionPrompt.
- 'continuityNotes' must describe how the scene connects to the previous one.
`;

  // ── DEFAULT MOTION STYLE (used when no user instructions given) ────────
  const defaultMotionStyle = `
DEFAULT MOTION STYLE:
- Camera: Gentle cinematic movement (slow zoom, slow pan, or static).
- Motion intensity: 0.2 to 0.5 (subtle, not jarring).
- Sound: Specify NO background music unless story calls for it. Suggest ambient environmental sound effects only.
- Character movement: Natural, gentle, story-driven.
`;

  // ── USER MOTION INSTRUCTIONS (override defaults when present) ─────────
  const userMotionBlock = userInstructions?.trim()
    ? `
CUSTOM USER VIDEO INSTRUCTIONS (OVERRIDE the default motion style — apply to every scene):
${userInstructions.trim()}
`
    : defaultMotionStyle;

  // ── PROJECT CONTEXT ────────────────────────────────────────────────────
  const projectContext = `
Topic: "${topic}"
Total Audio Duration: ${audioDuration} seconds

Approved Script:
${JSON.stringify(scriptData, null, 2)}

Approved Images (Visual Baseline):
${JSON.stringify(approvedImages.map((img: any) => ({
  id: img.id,
  sceneNumber: img.sceneNumber,
  promptUsed: img.promptUsed
})), null, 2)}
`;

  const prompt = `${systemRules}\n${userMotionBlock}\n${projectContext}

INSTRUCTIONS FOR THE JSON OUTPUT:
You MUST return a JSON object matching EXACTLY this structure (no extra fields, no missing fields):

{
  "projectId": "string",
  "scenes": [
    {
      "id": "string",
      "sceneNumber": 1,
      "imageId": "string (MUST MATCH INPUT)",
      "scriptSegmentId": "string",
      "narrationText": "string",
      "estimatedNarrationDuration": 5.5,
      "recommendedDuration": 6.5,
      "scenePurpose": "string",
      "characterAction": "string",
      "characterEmotion": "string",
      "primaryMotion": "string",
      "secondaryMotion": "string",
      "backgroundMotion": "string",
      "cameraMovement": "string",
      "cameraSpeed": "string",
      "motionIntensity": 0.5,
      "motionPrompt": "string",
      "negativeMotionPrompt": "string",
      "continuityNotes": "string",
      "futureTransitionSuggestion": "string",
      "status": "planned"
    }
  ]
}

${isRetry ? 'OUTPUT STRICTLY RAW JSON matching the exact structure above. DO NOT output anything else.' : 'Output ONLY JSON.'}`;

  try {
    const responsePromise = ai.models.generateContent({
      model: config.geminiTextModel,
      contents: prompt,
      config: {
        temperature: 0.5
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('CUSTOM_TIMEOUT: Gemini took too long (45s)')), 45000)
    );

    const response = await Promise.race([responsePromise, timeoutPromise]) as any;

    const candidate = response.candidates?.[0];
    const extractedText = response.text || candidate?.content?.parts?.[0]?.text || '';

    if (!extractedText) {
      throw new Error('Gemini returned an empty response for video scene planning.');
    }

    let rawText = extractedText.trim();
    rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    rawText = rawText.replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(rawText) as VideoScenePlan;
    } catch (parseError: any) {
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error('[Video Scene Planning Error]', error.message || error);

    const isQuotaError = error.status === 429 || (error.message && error.message.includes('429'));
    const isTimeout = error.message && error.message.toUpperCase().includes('TIMEOUT');
    
    if (!isRetry && !isQuotaError && !isTimeout) {
      console.log('[Video Scene Planning] Attempting 1-time retry due to error.');
      try {
        return await generateVideoScenePlan(topic, scriptData, masterPlan, approvedImages, audioDuration, userInstructions, true);
      } catch (retryError) {
        console.error('[Video Scene Planning] Retry failed, executing fallback.');
        return generateFallbackVideoScenePlan(topic, approvedImages, audioDuration);
      }
    }

    console.log('[Video Scene Planning] Executing fallback due to quota, timeout, or final error.');
    return generateFallbackVideoScenePlan(topic, approvedImages, audioDuration);
  }
}

export async function regenerateVideoScene(
  topic: string,
  scriptData: any,
  masterPlan: any,
  approvedImages: any[],
  sceneIndexToRegenerate: number,
  existingPlan: VideoScenePlan
): Promise<VideoScene> {
  const prompt = `
You are an expert AI Video Motion Director. Your task is to regenerate the motion plan for ONE specific video scene, while preserving the context of the surrounding scenes.

Topic: "${topic}"

Approved Script:
${JSON.stringify(scriptData, null, 2)}

Approved Images (Visual Baseline):
${JSON.stringify(approvedImages.map((img: any) => ({
  id: img.id,
  sceneNumber: img.sceneNumber,
  promptUsed: img.promptUsed
})), null, 2)}

Existing Video Scene Plan (For Context):
${JSON.stringify(existingPlan.scenes, null, 2)}

Instructions:
1. Regenerate ONLY the scene at index ${sceneIndexToRegenerate} (Scene Number: ${existingPlan.scenes[sceneIndexToRegenerate].sceneNumber}).
2. Improve the motionPrompt, cameraMovement, and characterAction to better fit the script and story continuity.
3. Keep the same 'imageId', 'sceneNumber', and 'estimatedNarrationDuration'.

OUTPUT RAW JSON MATCHING EXACTLY THIS STRUCTURE:
{
  "id": "string",
  "sceneNumber": 1,
  "imageId": "string",
  "scriptSegmentId": "string",
  "narrationText": "string",
  "estimatedNarrationDuration": 5.5,
  "recommendedDuration": 6.5,
  "scenePurpose": "string",
  "characterAction": "string",
  "characterEmotion": "string",
  "primaryMotion": "string",
  "secondaryMotion": "string",
  "backgroundMotion": "string",
  "cameraMovement": "string",
  "cameraSpeed": "string",
  "motionIntensity": 0.5,
  "motionPrompt": "string",
  "negativeMotionPrompt": "string",
  "continuityNotes": "string",
  "futureTransitionSuggestion": "string",
  "status": "planned"
}
`;

  const response = await ai.models.generateContent({
    model: config.geminiTextModel,
    contents: prompt,
    config: {
      temperature: 0.7
    }
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response for scene regeneration.');
  }

  const regeneratedScene = JSON.parse(response.text) as VideoScene;
  return regeneratedScene;
}
