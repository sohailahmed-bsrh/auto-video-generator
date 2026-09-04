import { GoogleGenAI, Type, Schema } from '@google/genai';
import { config } from '../../config/env';

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

export interface ScriptData {
  title: string;
  topic: string;
  coreConcept: string;
  targetAudience: string;
  language: string;
  estimatedDuration: number;
  estimatedWordCount: number;
  hook: string;
  introduction: string;
  storyBeats: string[];
  transitions: string;
  climax: string;
  conclusion: string;
  completeNarration: string;
  // Deprecated/kept for older logic if needed:
  narration?: string;
}

const scriptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    topic: { type: Type.STRING, description: "The exact topic the script is about" },
    coreConcept: { type: Type.STRING, description: "The crucial facts or concepts required for a real explanation" },
    targetAudience: { type: Type.STRING },
    language: { type: Type.STRING },
    estimatedDuration: { type: Type.INTEGER, description: "Estimated duration in seconds" },
    estimatedWordCount: { type: Type.INTEGER },
    hook: { type: Type.STRING, description: "Strong, curiosity-inducing hook" },
    introduction: { type: Type.STRING },
    storyBeats: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Main sections or story beats of the script"
    },
    transitions: { type: Type.STRING, description: "How the script smoothly transitions between ideas" },
    climax: { type: Type.STRING, description: "Climax or key insight" },
    conclusion: { type: Type.STRING },
    completeNarration: { 
      type: Type.STRING, 
      description: "The ONE complete, continuous narration text that will be sent to the text-to-speech engine. Must sound natural when spoken." 
    }
  },
  required: [
    'title', 'topic', 'coreConcept', 'targetAudience', 'language',
    'estimatedDuration', 'estimatedWordCount', 'hook', 'introduction',
    'storyBeats', 'transitions', 'climax', 'conclusion', 'completeNarration'
  ]
};

export async function generateVideoScript(
  topic: string, 
  format: string, 
  isRegeneration: boolean = false, 
  previousScript?: any,
  userInstructions?: string
): Promise<ScriptData> {

  // ── PERMANENT SYSTEM RULES (never overridden) ──────────────────────────
  const systemRules = `
You are an expert video script writer. Your output MUST conform exactly to the provided JSON schema.
The \`completeNarration\` field must be ONE continuous, spoken-aloud narrative text — not disconnected bullet points.
SCRIPT LENGTH based on format '${format}':
- Short (tiktok/shorts): ~120-150 words (~45-60 seconds).
- Medium/long (youtube): ~300-500 words (~2-3 minutes).
Do not leave any required field empty.
`;

  // ── DEFAULT STYLE (used only when user writes NO instructions) ─────────
  const defaultStyle = `
DEFAULT STYLE (apply this when no custom instructions are provided):
- Write a highly engaging children's narrative story in Roman Urdu.
- Roman Urdu = Urdu language written in the English alphabet (e.g., "Ek dafa ka zikr hai...").
- Dynamically create a main character inspired by the topic.
- Build a clear beginning, middle, and end with a meaningful moral.
- Fill ALL text fields (title, hook, storyBeats, etc.) in Roman Urdu.
- Do NOT write a documentary or explainer. It MUST be a narrative story.
`;

  // ── USER INSTRUCTIONS (override default style when present) ───────────
  const userStyleBlock = userInstructions?.trim()
    ? `
CUSTOM USER INSTRUCTIONS (these OVERRIDE the default style completely — follow them precisely):
${userInstructions.trim()}
`
    : defaultStyle;

  // ── PROJECT CONTEXT ────────────────────────────────────────────────────
  const projectContext = `
TOPIC: "${topic}"
OUTPUT FORMAT: ${format}
`;

  const formatInstructions = `${systemRules}\n${userStyleBlock}\n${projectContext}`;

  let prompt = formatInstructions;

  if (isRegeneration && previousScript) {
    prompt += `
\n\n--- TRUE REGENERATION INSTRUCTION ---
The user rejected the previous script. You MUST create a SUBSTANTIALLY DIFFERENT script.
Use a completely different hook, a different storytelling angle, different structure, different examples, and different flow/wording.
BUT you must still accurately answer the EXACT SAME topic.
DO NOT merely change a few words. DO NOT repeat the style or flow of the previous script.

Previous Script (Do NOT reuse this):
${JSON.stringify(previousScript, null, 2)}
`;
  }

  const response = await ai.models.generateContent({
    model: config.geminiTextModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: scriptSchema,
      temperature: 0.8 // Slightly higher temperature for better storytelling variation, especially in regeneration
    }
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response.');
  }

  let rawText = response.text.trim();
  rawText = rawText.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

  const parsedScript = JSON.parse(rawText) as ScriptData;
  
  // Basic Topic Fidelity Validation
  if (!parsedScript.completeNarration || parsedScript.completeNarration.length < 50) {
    throw new Error('Generated script is too short or missing completeNarration.');
  }
  
  // Backwards compatibility for older code that might read 'narration'
  parsedScript.narration = parsedScript.completeNarration;

  return parsedScript;
}
