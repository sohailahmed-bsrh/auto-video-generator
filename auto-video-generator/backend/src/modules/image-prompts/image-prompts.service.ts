import { GoogleGenAI, Type, Schema } from '@google/genai';
import { config } from '../../config/env';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export interface ImagePromptPlan {
  id: string;
  scriptId: string;
  sceneNumber: number;
  narration: string;
  visualIntent: string;
  prompt: string;
  negativePrompt?: string;
  consistencyReferences: {
    characterIds: string[];
    locationIds: string[];
    objectIds: string[];
    styleId: string;
  };
}

export interface ImagePromptMasterPlan {
  visualBible: {
    overallStyle: string;
    styleDescription: string;
    colorPalette: string[];
    lightingStyle: string;
    cameraLanguage: string;
    worldRules: string;
    visualMood: string;
    timePeriod: string;
    realismLevel: string;
    aspectRatio: string;
  };
  characters: Array<{
    id: string;
    role: string;
    displayName: string;
    isRecurring: boolean;
    permanentTraits: {
      apparentAge: string;
      presentation: string;
      faceStructure: string;
      skinTone: string;
      hair: string;
      eyes: string;
      bodyType: string;
      wardrobeIdentity: string;
      accessories: string;
      distinctiveFeatures: string[];
    };
    consistencyRules: string[];
  }>;
  locations: Array<{
    id: string;
    name: string;
    description: string;
    permanentVisualRules: string[];
    architecture: string;
    environment: string;
    timeOfDayDefault: string;
    lightingCharacteristics: string;
    recurringObjects: string[];
  }>;
  objects: Array<{
    id: string;
    name: string;
    description: string;
    visualTraits: string[];
    importance: string;
    isRecurring: boolean;
  }>;
  imagePrompts: ImagePromptPlan[];
}

const imagePromptMasterPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    visualBible: {
      type: Type.OBJECT,
      properties: {
        overallStyle: { type: Type.STRING },
        styleDescription: { type: Type.STRING },
        colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
        lightingStyle: { type: Type.STRING },
        cameraLanguage: { type: Type.STRING },
        worldRules: { type: Type.STRING },
        visualMood: { type: Type.STRING },
        timePeriod: { type: Type.STRING },
        realismLevel: { type: Type.STRING },
        aspectRatio: { type: Type.STRING }
      },
      required: ['overallStyle', 'styleDescription', 'colorPalette', 'lightingStyle', 'cameraLanguage', 'worldRules', 'visualMood', 'timePeriod', 'realismLevel', 'aspectRatio']
    },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          role: { type: Type.STRING },
          displayName: { type: Type.STRING },
          isRecurring: { type: Type.BOOLEAN },
          permanentTraits: {
            type: Type.OBJECT,
            properties: {
              apparentAge: { type: Type.STRING },
              presentation: { type: Type.STRING },
              faceStructure: { type: Type.STRING },
              skinTone: { type: Type.STRING },
              hair: { type: Type.STRING },
              eyes: { type: Type.STRING },
              bodyType: { type: Type.STRING },
              wardrobeIdentity: { type: Type.STRING },
              accessories: { type: Type.STRING },
              distinctiveFeatures: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['apparentAge', 'presentation', 'faceStructure', 'skinTone', 'hair', 'eyes', 'bodyType', 'wardrobeIdentity', 'accessories', 'distinctiveFeatures']
          },
          consistencyRules: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['id', 'role', 'displayName', 'isRecurring', 'permanentTraits', 'consistencyRules']
      }
    },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          permanentVisualRules: { type: Type.ARRAY, items: { type: Type.STRING } },
          architecture: { type: Type.STRING },
          environment: { type: Type.STRING },
          timeOfDayDefault: { type: Type.STRING },
          lightingCharacteristics: { type: Type.STRING },
          recurringObjects: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['id', 'name', 'description', 'permanentVisualRules', 'architecture', 'environment', 'timeOfDayDefault', 'lightingCharacteristics', 'recurringObjects']
      }
    },
    objects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          visualTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
          importance: { type: Type.STRING },
          isRecurring: { type: Type.BOOLEAN }
        },
        required: ['id', 'name', 'description', 'visualTraits', 'importance', 'isRecurring']
      }
    },
    imagePrompts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          scriptId: { type: Type.STRING },
          sceneNumber: { type: Type.INTEGER },
          narration: { type: Type.STRING },
          visualIntent: { type: Type.STRING },
          prompt: { type: Type.STRING },
          negativePrompt: { type: Type.STRING },
          consistencyReferences: {
            type: Type.OBJECT,
            properties: {
              characterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              locationIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              objectIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              styleId: { type: Type.STRING }
            },
            required: ['characterIds', 'locationIds', 'objectIds', 'styleId']
          }
        },
        required: ['id', 'scriptId', 'sceneNumber', 'narration', 'visualIntent', 'prompt', 'consistencyReferences']
      }
    }
  },
  required: ['visualBible', 'characters', 'locations', 'objects', 'imagePrompts']
};

const singleImagePromptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    scriptId: { type: Type.STRING },
    sceneNumber: { type: Type.INTEGER },
    narration: { type: Type.STRING },
    visualIntent: { type: Type.STRING },
    prompt: { type: Type.STRING },
    negativePrompt: { type: Type.STRING },
    consistencyReferences: {
      type: Type.OBJECT,
      properties: {
        characterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        locationIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        objectIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        styleId: { type: Type.STRING }
      },
      required: ['characterIds', 'locationIds', 'objectIds', 'styleId']
    }
  },
  required: ['id', 'scriptId', 'sceneNumber', 'narration', 'visualIntent', 'prompt', 'consistencyReferences']
};

export function generateFallbackMasterPlan(scriptData: any, userInstructions?: string): ImagePromptMasterPlan {
  console.log('[Image Prompt Planning] Executing deterministic fallback planner.');
  
  const styleDescription = userInstructions?.trim() 
    ? userInstructions.trim() 
    : "3D animated cartoon, vibrant, polished, Pixar/Disney quality.";

  const fallbackPlan: ImagePromptMasterPlan = {
    visualBible: {
      overallStyle: "Fallback Style",
      styleDescription,
      colorPalette: ["#FF5733", "#33FF57", "#3357FF"],
      lightingStyle: "Warm, cinematic, soft shadows",
      cameraLanguage: "Mix of wide, medium, and close-up shots",
      worldRules: "Consistent physics, engaging visuals",
      visualMood: "Engaging and bright",
      timePeriod: "Contemporary",
      realismLevel: "Stylized",
      aspectRatio: "16:9"
    },
    characters: [{
      id: "CHAR_01",
      role: "Main Character",
      displayName: "Protagonist",
      isRecurring: true,
      permanentTraits: {
        apparentAge: "Young adult",
        presentation: "Friendly and approachable",
        faceStructure: "Soft features",
        skinTone: "Warm",
        hair: "Neat",
        eyes: "Bright",
        bodyType: "Average",
        wardrobeIdentity: "Casual everyday wear",
        accessories: "None",
        distinctiveFeatures: ["Expressive eyebrows"]
      },
      consistencyRules: ["Always maintain a friendly expression", "Keep wardrobe colors consistent"]
    }],
    locations: [{
      id: "LOC_01",
      name: "Main Setting",
      description: "A generic but visually pleasing environment suited for the topic.",
      permanentVisualRules: ["Well-lit", "Uncluttered background"],
      architecture: "Simple and stylized",
      environment: "Clean and vibrant",
      timeOfDayDefault: "Daytime",
      lightingCharacteristics: "Bright and cheerful",
      recurringObjects: []
    }],
    objects: [],
    imagePrompts: []
  };

  // Generate one image prompt per story beat
  const storyBeats = Array.isArray(scriptData?.storyBeats) ? scriptData.storyBeats : [scriptData?.hook || "Scene 1"];
  
  fallbackPlan.imagePrompts = storyBeats.map((beat: string, index: number) => ({
    id: `PROMPT_FB_${index + 1}`,
    scriptId: "fallback_script_id",
    sceneNumber: index + 1,
    narration: beat,
    visualIntent: "Illustrate the narration clearly",
    prompt: `[FALLBACK] ${styleDescription} Scene: ${beat}. Featuring the main character in the main setting. Well-lit, cinematic composition.`,
    negativePrompt: "text, watermark, ugly, deformed, blurry",
    consistencyReferences: {
      characterIds: ["CHAR_01"],
      locationIds: ["LOC_01"],
      objectIds: [],
      styleId: "STYLE_01"
    }
  }));

  return fallbackPlan;
}

export async function planImagePrompts(
  scriptData: any,
  topic: string,
  format: string,
  userInstructions?: string,
  isRetry: boolean = false
): Promise<ImagePromptMasterPlan> {
  const systemRules = `
You are an expert AI Video Art Director. Create a structured Image Prompt Master Plan.
RULES:
1. ONLY describe static visual frames. Do not describe motion.
2. Assign stable IDs (CHAR_01, LOC_01, OBJ_01).
3. Embed full canonical physical descriptions from Character Bible directly into EACH image prompt.
4. Maintain visual consistency for recurring elements.
5. Return ONLY valid JSON matching the schema. DO NOT include markdown formatting like \`\`\`json. Return raw JSON text.
`;

  const defaultStyle = `
DEFAULT STYLE (use if no custom instructions given):
- Style: "3D animated cartoon" (vibrant, polished Pixar/Disney quality).
- Framing: Mix of shots (wide for environments, medium for interaction, close-up for emotion). Avoid repetitive portrait framing.
- Lighting: Warm, cinematic, soft shadows.
`;

  const userStyleBlock = userInstructions?.trim()
    ? `\nCUSTOM INSTRUCTIONS (OVERRIDE default style; apply precisely):\n${userInstructions.trim()}\n`
    : defaultStyle;

  const prompt = `${systemRules}\n${userStyleBlock}\nProject Context:\nTopic: "${topic}"\nFormat: "${format}"\n\nScript:\n${JSON.stringify(scriptData)}\n
INSTRUCTIONS FOR THE JSON OUTPUT:
You MUST return a JSON object matching EXACTLY this structure (no extra fields, no missing fields):

{
  "visualBible": {
    "overallStyle": "string",
    "styleDescription": "string",
    "colorPalette": ["string"],
    "lightingStyle": "string",
    "cameraLanguage": "string",
    "worldRules": "string",
    "visualMood": "string",
    "timePeriod": "string",
    "realismLevel": "string",
    "aspectRatio": "string"
  },
  "characters": [
    {
      "id": "string",
      "role": "string",
      "displayName": "string",
      "isRecurring": true,
      "permanentTraits": {
        "apparentAge": "string",
        "presentation": "string",
        "faceStructure": "string",
        "skinTone": "string",
        "hair": "string",
        "eyes": "string",
        "bodyType": "string",
        "wardrobeIdentity": "string",
        "accessories": "string",
        "distinctiveFeatures": ["string"]
      },
      "consistencyRules": ["string"]
    }
  ],
  "locations": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "permanentVisualRules": ["string"],
      "architecture": "string",
      "environment": "string",
      "timeOfDayDefault": "string",
      "lightingCharacteristics": "string",
      "recurringObjects": ["string"]
    }
  ],
  "objects": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "visualTraits": ["string"],
      "importance": "string",
      "isRecurring": true
    }
  ],
  "imagePrompts": [
    {
      "id": "string",
      "scriptId": "string",
      "sceneNumber": 1,
      "narration": "string",
      "visualIntent": "string",
      "prompt": "YOUR DETAILED IMAGE GENERATION PROMPT HERE",
      "negativePrompt": "string",
      "consistencyReferences": {
        "characterIds": ["string"],
        "locationIds": ["string"],
        "objectIds": ["string"],
        "styleId": "string"
      }
    }
  ]
}

${isRetry ? 'OUTPUT STRICTLY RAW JSON matching the exact structure above. DO NOT output anything else.' : 'Output ONLY JSON.'}`;

  try {
    const response = await ai.models.generateContent({
      model: config.geminiTextModel,
      contents: prompt,
      config: {
        // Removed strict responseSchema to prevent empty response issues on complex objects
        temperature: 0.7,
        maxOutputTokens: 8192
      }
    });

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason || 'Unknown';
    // Safely extract text from multiple possible paths
    const extractedText = response.text || candidate?.content?.parts?.[0]?.text || '';

    console.log('[Gemini Request Metadata]', JSON.stringify({
      model: config.geminiTextModel,
      promptLength: prompt.length,
      userInstructionsLength: userInstructions?.length || 0,
      timestamp: new Date().toISOString(),
      isRetry
    }, null, 2));

    console.log('[Gemini Response Diagnostic]', JSON.stringify({
      httpStatus: 200,
      model: config.geminiTextModel,
      finishReason,
      candidateCount: response.candidates?.length || 0,
      hasText: !!extractedText,
      textLength: extractedText?.length || 0,
      safetyRatings: candidate?.safetyRatings || []
    }, null, 2));

    if (!extractedText) {
      throw new Error(JSON.stringify({
        message: 'Gemini returned an empty response for image prompt planning.',
        diagnostic: {
          httpStatus: 200,
          model: config.geminiTextModel,
          finishReason,
          candidateCount: response.candidates?.length || 0,
          errorInfo: 'Empty content parts returned by Gemini.'
        }
      }));
    }

    let rawText = extractedText.trim();
    rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    rawText = rawText.replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(rawText) as ImagePromptMasterPlan;
    } catch (parseError: any) {
      console.error('[Image Prompt Planning] JSON Parse Error. Raw Text:', rawText.substring(0, 500) + '...');
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error('[Image Prompt Planning Error]', error.message || error);

    const isQuotaError = error.status === 429 || (error.message && error.message.includes('429'));
    
    if (!isRetry && !isQuotaError) {
      console.log('[Image Prompt Planning] Attempting 1-time retry due to error.');
      try {
        return await planImagePrompts(scriptData, topic, format, userInstructions, true);
      } catch (retryError) {
        console.error('[Image Prompt Planning] Retry failed, executing fallback.');
        return generateFallbackMasterPlan(scriptData, userInstructions);
      }
    }

    console.log('[Image Prompt Planning] Executing fallback due to quota or final error.');
    return generateFallbackMasterPlan(scriptData, userInstructions);
  }
}

export async function regenerateSinglePrompt(
  topic: string,
  scriptData: any,
  masterPlan: ImagePromptMasterPlan,
  targetPromptId: string
): Promise<ImagePromptPlan> {
  const targetPrompt = masterPlan.imagePrompts.find(p => p.id === targetPromptId);
  if (!targetPrompt) {
    throw new Error(`Prompt with ID ${targetPromptId} not found in the master plan.`);
  }

  // To save context tokens and focus the model, we can omit the other prompts.
  const contextMasterPlan = {
    visualBible: masterPlan.visualBible,
    characters: masterPlan.characters,
    locations: masterPlan.locations,
    objects: masterPlan.objects,
  };

  const prompt = `
You are an expert AI Video Art Director. Your task is to REGENERATE a single static image prompt that was rejected by the user.

Topic: "${topic}"

Approved Script (for context):
${JSON.stringify(scriptData, null, 2)}

Global Visual Master Plan (MUST BE STRICTLY FOLLOWED):
${JSON.stringify(contextMasterPlan, null, 2)}

--- PREVIOUS PROMPT DATA ---
The user rejected this prompt. You MUST create a meaningfully improved/different prompt while preserving the same narrative purpose and strict consistency.
${JSON.stringify(targetPrompt, null, 2)}
----------------------------

Instructions:
1. Generate exactly one Image Prompt Plan object for this specific segment.
2. The 'id', 'scriptId', 'sceneNumber', and 'narration' MUST remain identical to the Previous Prompt Data.
3. The 'prompt' field MUST contain an exhaustive, highly descriptive visual instruction for a single static frame that is DIFFERENT from the previous version. Perhaps change the camera angle, the character action, or the framing, while still fitting the narration.
4. DO NOT break the Visual Bible aesthetic.
5. DO NOT mutate characters or locations. If a character or location is referenced, you must use their physical description from the Master Plan.

OUTPUT RAW JSON MATCHING EXACTLY THIS STRUCTURE:
{
  "id": "string",
  "scriptId": "string",
  "sceneNumber": 1,
  "narration": "string",
  "visualIntent": "string",
  "prompt": "YOUR DETAILED IMAGE GENERATION PROMPT HERE",
  "negativePrompt": "string",
  "consistencyReferences": {
    "characterIds": ["string"],
    "locationIds": ["string"],
    "objectIds": ["string"],
    "styleId": "string"
  }
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
    throw new Error('Gemini returned an empty response for single prompt regeneration.');
  }

  let rawText = response.text.trim();
  rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

  const parsedPrompt = JSON.parse(rawText) as ImagePromptPlan;
  
  // Enforce ID stability
  parsedPrompt.id = targetPromptId;
  parsedPrompt.sceneNumber = targetPrompt.sceneNumber;
  parsedPrompt.scriptId = targetPrompt.scriptId;
  parsedPrompt.narration = targetPrompt.narration;

  return parsedPrompt;
}

export async function planThumbnailPrompt(
  topic: string,
  masterPlan: ImagePromptMasterPlan
): Promise<string> {
  // To save context tokens and focus the model
  const contextMasterPlan = {
    visualBible: masterPlan.visualBible,
    characters: masterPlan.characters,
    locations: masterPlan.locations,
    objects: masterPlan.objects,
  };

  const prompt = `
You are an expert YouTube Thumbnail Designer and AI Video Art Director. Your task is to generate exactly ONE highly-optimized, click-worthy Image Prompt for the video's thumbnail.

Topic: "${topic}"

Global Visual Master Plan (MUST BE STRICTLY FOLLOWED):
${JSON.stringify(contextMasterPlan, null, 2)}

Instructions:
1. Generate an image generation prompt for a YouTube thumbnail that perfectly preserves the visual identity of the main character(s) defined in the Character Bible.
2. The thumbnail must be eye-catching, vibrant, and perfectly matched to the visual style ("3D animated cartoon" by default).
3. Frame the composition for maximum impact (e.g., close-up on an expressive face, dynamic action pose).
4. Do NOT include any text in the image generation prompt itself. Text overlays will be added later in post-production.
5. Provide ONLY the raw prompt text. Do not wrap it in JSON, markdown blocks, or any other formatting. Just the raw string prompt.
  `;

  const response = await ai.models.generateContent({
    model: config.geminiTextModel,
    contents: prompt,
    config: {
      temperature: 0.7
    }
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response for thumbnail prompt planning.');
  }

  let rawText = response.text.trim();
  // Strip markdown if mistakenly added
  rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

  return rawText;
}
