export type VideoGenerationStatus = 'PENDING' | 'PLANNED' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'APPROVED';

export interface VideoScene {
  id: string; // e.g. VSCENE_01
  sceneNumber: number;
  
  // References to previous phases
  imageId: string; // The ID of the approved generated image
  scriptSegmentId?: string; // Optional reference to original script
  narrationText: string;
  
  // Estimated duration in seconds based on narration length
  estimatedNarrationDuration: number;
  recommendedDuration: number; // e.g., 2, 4, 5, 8 seconds
  
  // Context & Intelligence
  scenePurpose: string;
  characterAction: string;
  characterEmotion: string;
  
  // Motion Rules (Separated from visual prompt)
  primaryMotion: string;
  secondaryMotion: string;
  backgroundMotion: string;
  
  cameraMovement: string;
  cameraSpeed: string; // e.g., 'Slow', 'Fast', 'Static'
  motionIntensity: number; // 0.0 to 1.0 or 1 to 255 depending on API
  
  // Final composite prompt to be sent to provider
  motionPrompt: string;
  negativeMotionPrompt?: string;
  
  continuityNotes: string;
  futureTransitionSuggestion?: string;
  
  status: VideoGenerationStatus;
}

export interface VideoScenePlan {
  projectId: string;
  scenes: VideoScene[];
}

export interface VideoClip {
  id: string;
  sceneId: string;
  sceneNumber: number;
  generationStatus: VideoGenerationStatus;
  
  // Storage
  videoUrl?: string; // If using cloud storage or local file
  videoData?: string; // Base64 encoded video (if feasible for short clips)
  mimeType?: string;
  
  durationSecs?: number;
  providerJobId?: string;
  
  promptUsed: string;
  modelUsed: string;
  generatedAt: string;
  generationAttempt: number;
  error?: string;
}
