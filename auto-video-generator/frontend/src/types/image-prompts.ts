/**
 * Frontend types for Image Prompt Master Plan.
 * These mirror the backend schema produced by image-prompts.service.ts.
 */

// ── Visual Bible ───────────────────────────────────────────────────────────
export interface VisualBible {
  overallStyle: string;
  styleDescription: string;
  realismLevel: string;
  visualMood: string;
  colorPalette: string[];
  lightingStyle: string;
  cameraLanguage: string;
  aspectRatio: string;
}

// ── Character / Location / Object Profiles ────────────────────────────────
export interface PermanentTraits {
  apparentAge: string;
  gender: string;
  skinTone: string;
  eyes: string;
  faceStructure: string;
  hair: string;
  bodyType: string;
  wardrobeIdentity: string;
  accessories: string;
  distinctiveFeatures: string;
}

export interface CharacterProfile {
  id: string;
  displayName: string;
  role: string;
  permanentTraits: PermanentTraits;
}

export interface LocationProfile {
  id: string;
  name: string;
  type: string;
  architecture: string;
  environment: string;
  atmosphere: string;
  recurringDetails: string;
}

export interface ObjectProfile {
  id: string;
  name: string;
  description: string;
  importance: string;
}

// ── Image Prompt Plan ─────────────────────────────────────────────────────
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

// ── Master Plan ───────────────────────────────────────────────────────────
export interface ImagePromptMasterPlan {
  visualBible: VisualBible;
  characters: CharacterProfile[];
  locations: LocationProfile[];
  objects: ObjectProfile[];
  imagePrompts: ImagePromptPlan[];
}
