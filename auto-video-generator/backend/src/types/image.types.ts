export interface ReferenceAsset {
  id: string;
  type: 'character' | 'location' | 'object' | 'style';
  entityId: string; // The ID of the character or location this references
  imageUrl: string;
  approved: boolean;
  priority: number;
  createdAt: string;
}

export interface ConsistencyIssue {
  type: 'error' | 'warning';
  description: string;
}

export interface ImageValidationResult {
  overallStatus: 'approved' | 'warning' | 'failed';
  overallScore: number;
  sceneMatch: {
    score: number;
    issues: ConsistencyIssue[];
  };
  characterConsistency: {
    score: number;
    issues: ConsistencyIssue[];
  };
  locationConsistency: {
    score: number;
    issues: ConsistencyIssue[];
  };
  visualQuality: {
    score: number;
    issues: ConsistencyIssue[];
  };
  continuityIssues: ConsistencyIssue[];
  warnings: ConsistencyIssue[];
  recommendedAction: 'approve' | 'regenerate';
}

export type GenerationStatus = 'queued' | 'generating' | 'generated' | 'validating' | 'approved' | 'warning' | 'failed';

export interface GeneratedSceneImage {
  id: string;
  sceneId: string;
  sceneNumber: number;
  generationStatus: GenerationStatus;
  imageUrl?: string;
  imageData?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  aspectRatio: string;
  promptUsed: string;
  modelUsed: string;
  generatedAt: string;
  generationAttempt: number;
  validationResult?: ImageValidationResult;
  error?: string;
}
