import { ImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult, NormalizedImageError, NormalizedImageErrorType } from './image.provider';
import { config } from '../../config/env';
import crypto from 'crypto';

export class CloudflareProvider implements ImageGenerationProvider {
  getProviderName(): string {
    return 'cloudflare';
  }

  isAvailable(): boolean {
    return !!config.cloudflareApiToken && !!config.cloudflareAccountId;
  }

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const accountId = config.cloudflareAccountId?.trim();
    const model = config.cloudflareImageModel?.trim();

    if (!this.isAvailable()) {
      throw new NormalizedImageError('CONFIGURATION_ERROR', 'Missing Cloudflare credentials', this.getProviderName());
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    console.log('[Cloudflare API Request]', {
      method: 'POST',
      url: url,
      model: model,
      hasAccountId: !!accountId
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.cloudflareApiToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: options.prompt
      })
    });

    if (!response.ok) {
      let errorData: any;
      try {
         errorData = await response.json();
      } catch (e) {
         errorData = await response.text();
      }
      
      let errorType: NormalizedImageErrorType = 'GENERATION_FAILED';
      const status = response.status;
      
      if (status === 429) errorType = 'RATE_LIMITED';
      else if (status === 401 || status === 403) errorType = 'AUTHENTICATION_ERROR';
      else if (status >= 500) errorType = 'TEMPORARY_UNAVAILABLE';
      else if (status === 400) {
        const errorStr = JSON.stringify(errorData);
        if (errorStr.includes('limit') || errorStr.includes('quota') || errorStr.includes('exceeded')) {
          errorType = 'QUOTA_EXHAUSTED';
        } else {
          errorType = 'INVALID_REQUEST';
        }
      }

      throw new NormalizedImageError(errorType, `Cloudflare API Error (${status}): ${JSON.stringify(errorData)}`, this.getProviderName(), errorData);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Cloudflare returns JSON if it fails gracefully or wraps base64 in some AI models.
    // However, for @cf/black-forest-labs/flux-1-schnell, it returns binary image bytes by default 
    // unless there is an error. We can attempt to parse it as JSON to check for wrapped errors/base64.
    
    let finalBuffer = buffer;
    try {
        const json = JSON.parse(buffer.toString('utf8'));
        // If it's a Cloudflare standard JSON response format
        if (json && typeof json === 'object') {
            if (json.success === false) {
                const errorStr = JSON.stringify(json.errors);
                let errType: NormalizedImageErrorType = 'GENERATION_FAILED';
                if (errorStr.includes('limit') || errorStr.includes('quota') || errorStr.includes('exceeded')) {
                  errType = 'QUOTA_EXHAUSTED';
                } else if (errorStr.includes('safety') || errorStr.includes('content')) {
                  errType = 'SAFETY_REJECTION';
                }
                throw new NormalizedImageError(errType, errorStr, this.getProviderName(), json);
            }
            if (json.result && json.result.image) {
                // If it returned base64 wrapped in JSON
                finalBuffer = Buffer.from(json.result.image, 'base64');
            }
        }
    } catch (e) {
        // Not JSON, it's raw binary image data
    }

    return {
      imageBuffer: finalBuffer,
      mimeType: `image/jpeg`, // Cloudflare flux returns jpeg
      provider: 'cloudflare',
      model: config.cloudflareImageModel,
      seed: options.seed
    };
  }
}
