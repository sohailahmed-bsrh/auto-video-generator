import { ImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult, NormalizedImageError, NormalizedImageErrorType } from './image.provider';
import { config } from '../../config/env';

const QWEN_API_BASE = 'https://dashscope-intl.aliyuncs.com/api/v1';
const QWEN_MODEL = 'qwen-image-3.0';

export class QwenImageProvider implements ImageGenerationProvider {
  getProviderName(): string {
    return 'qwen-image';
  }

  isAvailable(): boolean {
    return !!config.qwenApiKey;
  }

  private mapSize(aspectRatio: string): string {
    switch (aspectRatio) {
      case '16:9': return '1280*720';
      case '9:16': return '720*1280';
      case '1:1': return '1024*1024';
      default: return '1280*720';
    }
  }

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.isAvailable()) {
      throw new NormalizedImageError('CONFIGURATION_ERROR', 'Missing Qwen API key', this.getProviderName());
    }

    const apiKey = config.qwenApiKey;
    const size = this.mapSize(options.aspectRatio);

    const requestBody = {
      model: QWEN_MODEL,
      input: {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || undefined
      },
      parameters: {
        size: size
      }
    };

    console.log(`[Qwen] Submitting task. Model: ${QWEN_MODEL}, Size: ${size}`);

    // 1. Submit async task
    const response = await fetch(`${QWEN_API_BASE}/services/aigc/text2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
       await this.handleErrorResponse(response);
    }

    const submitData: any = await response.json();
    if (submitData.code) {
       await this.handleErrorResponse(response, submitData);
    }

    const taskId = submitData.output?.task_id;
    if (!taskId) {
      throw new NormalizedImageError('GENERATION_FAILED', 'No task_id returned from Qwen', this.getProviderName(), submitData);
    }

    console.log(`[Qwen] Task submitted successfully: ${taskId}`);

    // 2. Poll for status
    let status = 'PENDING';
    let outputUrl = '';
    
    while (status === 'PENDING' || status === 'RUNNING') {
      await new Promise(r => setTimeout(r, 2000));
      
      const pollRes = await fetch(`${QWEN_API_BASE}/tasks/${taskId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!pollRes.ok) {
        await this.handleErrorResponse(pollRes);
      }

      const pollData: any = await pollRes.json();
      if (pollData.code) {
        await this.handleErrorResponse(pollRes, pollData);
      }

      status = pollData.output?.task_status || 'UNKNOWN';
      
      if (status === 'SUCCEEDED') {
        const results = pollData.output?.results;
        if (results && results.length > 0) {
          outputUrl = results[0].url;
        }
        break;
      } else if (status === 'FAILED') {
        const msg = pollData.output?.message || pollData.message || 'Generation failed';
        let errType: NormalizedImageErrorType = 'GENERATION_FAILED';
        if (msg.includes('safety') || msg.includes('content')) errType = 'SAFETY_REJECTION';
        throw new NormalizedImageError(errType, msg, this.getProviderName(), pollData);
      }
    }

    if (!outputUrl) {
      throw new NormalizedImageError('GENERATION_FAILED', 'Task succeeded but no image URL found', this.getProviderName());
    }

    // 3. Download the image
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      throw new NormalizedImageError('GENERATION_FAILED', 'Failed to download generated image from Qwen', this.getProviderName());
    }
    const imgBuffer = await imgRes.arrayBuffer();

    return {
      imageBuffer: Buffer.from(imgBuffer),
      mimeType: imgRes.headers.get('content-type') || 'image/png',
      provider: this.getProviderName(),
      model: QWEN_MODEL
    };
  }

  private async handleErrorResponse(response: Response, preParsedData?: any) {
    let errorData = preParsedData;
    if (!errorData) {
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: await response.text() };
      }
    }
    
    let errorType: NormalizedImageErrorType = 'GENERATION_FAILED';
    const status = response.status;
    const msg = errorData.message || errorData.code || 'Unknown error';

    if (status === 429) errorType = 'RATE_LIMITED';
    else if (status === 401 || status === 403) errorType = 'AUTHENTICATION_ERROR';
    else if (status >= 500) errorType = 'TEMPORARY_UNAVAILABLE';
    else if (status === 400 || errorData.code === 'Throttling.AllocationQuota') {
       if (msg.includes('quota') || msg.includes('balance') || msg.includes('Throttling')) errorType = 'QUOTA_EXHAUSTED';
       else if (msg.includes('safety') || msg.includes('content')) errorType = 'SAFETY_REJECTION';
       else errorType = 'INVALID_REQUEST';
    }

    throw new NormalizedImageError(errorType, `Qwen API Error: ${msg}`, this.getProviderName(), errorData);
  }
}
