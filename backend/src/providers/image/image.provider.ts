export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string; // e.g. '16:9', '9:16', '1:1'
  outputFormat?: 'jpeg' | 'png' | 'webp';
  seed?: number;
}

export interface ImageGenerationResult {
  imageBuffer: Buffer;
  mimeType: string;
  provider: string;
  model: string;
  seed?: number;
  finishReason?: string;
  metadata?: any;
}

export type NormalizedImageErrorType = 
  | 'QUOTA_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'TEMPORARY_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'SAFETY_REJECTION'
  | 'GENERATION_FAILED';

export class NormalizedImageError extends Error {
  constructor(
    public type: NormalizedImageErrorType,
    public message: string,
    public providerName: string,
    public originalError?: any
  ) {
    super(`[${providerName}] ${type}: ${message}`);
    this.name = 'NormalizedImageError';
  }
}

export interface ImageGenerationProvider {
  getProviderName(): string;
  isAvailable(): boolean;
  generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
}
