/**
 * Wan 2.7 Image-to-Video Provider
 * 
 * Uses Alibaba DashScope API (Wan 2.7 / wan2.1-i2v-turbo model).
 * Official async workflow:
 *   1. POST task → receive task_id
 *   2. GET /tasks/{task_id} → poll status
 * 
 * Documentation: https://help.aliyun.com/zh/model-studio/wan-vl
 * 
 * API Key: Never hardcoded. Must be set via WAN_API_KEY env variable.
 */

import { VideoGenerationProvider, VideoGenerationOptions, VideoGenerationJob } from './video.provider';
import { config } from '../../config/env';

// Wan 2.7 API base URL (International)
const WAN_API_BASE = 'https://dashscope-intl.aliyuncs.com/api/v1';
// Model to use
const WAN_MODEL = 'wan2.7-i2v';

// Wan task status returned by the polling endpoint
type WanTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'UNKNOWN';

interface WanSubmitResponse {
  output: {
    task_id: string;
    task_status: WanTaskStatus;
  };
  request_id: string;
  code?: string;
  message?: string;
}

interface WanPollResponse {
  output: {
    task_id: string;
    task_status: WanTaskStatus;
    video_url?: string;
    error?: {
      code: string;
      message: string;
    };
    code?: string;
    message?: string;
  };
  usage?: {
    video_duration: number;
    video_ratio: string;
    video_count: number;
  };
  request_id: string;
  code?: string;
  message?: string;
}

function mapWanStatusToJob(
  wanStatus: WanTaskStatus,
  taskId: string,
  videoUrl?: string,
  errorMsg?: string
): VideoGenerationJob {
  switch (wanStatus) {
    case 'PENDING':
    case 'RUNNING':
      return { jobId: taskId, status: 'GENERATING' };
    case 'SUCCEEDED':
      return { jobId: taskId, status: 'COMPLETED', videoUrl };
    case 'FAILED':
      return { jobId: taskId, status: 'FAILED', error: errorMsg || 'Wan task failed' };
    case 'CANCELED':
      return { jobId: taskId, status: 'FAILED', error: 'Task was canceled' };
    default:
      return { jobId: taskId, status: 'FAILED', error: `Unknown Wan status: ${wanStatus}` };
  }
}

export class Wan27Provider implements VideoGenerationProvider {
  private getApiKey(): string {
    const key = config.wanApiKey;
    if (!key) {
      throw new Error(
        'Wan API key is not configured. Set WAN_API_KEY in the backend .env file.'
      );
    }
    return key;
  }

  /**
   * Submit an image-to-video generation task to Wan 2.7.
   * Returns immediately with the task_id — caller must poll checkJobStatus().
   */
  async submitVideoJob(options: VideoGenerationOptions): Promise<VideoGenerationJob> {
    const apiKey = this.getApiKey();

    if (!options.imageBase64) {
      throw new Error('Wan 2.7 requires a base64-encoded first_frame image.');
    }
    if (!options.motionPrompt?.trim()) {
      throw new Error('Wan 2.7 requires a non-empty motion prompt.');
    }

    // Ensure the base64 string has the proper data URL format
    let imageUrl = options.imageBase64;
    if (!imageUrl.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageUrl}`;
    }

    const requestBody = {
      model: WAN_MODEL,
      input: {
        media: [
          { type: 'first_frame', url: imageUrl }
        ],
        prompt: options.motionPrompt.trim(),
      },
      parameters: {
        resolution: '720P',
        duration: Math.round(options.duration ?? 5),
        // prompt_extend: false so our generated prompts are used verbatim
        prompt_extend: false,
      }
    };

    console.log('[Wan 2.7] Submitting video task...', {
      model: WAN_MODEL,
      resolution: requestBody.parameters.resolution,
      duration: requestBody.parameters.duration,
      promptLength: options.motionPrompt.length,
    });

    const response = await fetch(`${WAN_API_BASE}/services/aigc/video-generation/video-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Required for async mode — tells DashScope we want task_id back
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(requestBody),
    });

    let responseData: WanSubmitResponse;
    try {
      responseData = await response.json() as WanSubmitResponse;
    } catch {
      throw new Error(`Wan API returned non-JSON response (HTTP ${response.status})`);
    }

    if (!response.ok || responseData.code) {
      const msg = responseData.message || `Wan API HTTP error ${response.status}`;
      const code = responseData.code ? ` [${responseData.code}]` : '';
      throw new Error(`Wan API Error${code}: ${msg}`);
    }

    const taskId = responseData.output?.task_id;
    if (!taskId) {
      throw new Error('Wan API did not return a task_id. Full response: ' + JSON.stringify(responseData));
    }

    console.log('[Wan 2.7] Task submitted successfully. task_id:', taskId);

    return {
      jobId: taskId,
      status: 'GENERATING',
    };
  }

  /**
   * Poll Wan 2.7 for the status of a submitted task.
   */
  async checkJobStatus(jobId: string): Promise<VideoGenerationJob> {
    const apiKey = this.getApiKey();

    const response = await fetch(`${WAN_API_BASE}/tasks/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    let responseData: WanPollResponse;
    try {
      responseData = await response.json() as WanPollResponse;
    } catch {
      throw new Error(`Wan status check returned non-JSON (HTTP ${response.status})`);
    }

    if (!response.ok || responseData.code) {
      const msg = responseData.message || `Wan status check HTTP error ${response.status}`;
      const code = responseData.code ? ` [${responseData.code}]` : '';
      throw new Error(`Wan API Status Error${code}: ${msg}`);
    }

    const output = responseData.output;
    const wanStatus = output?.task_status as WanTaskStatus;
    const videoUrl = output?.video_url;
    
    // Extract the exact error message from DashScope's nested structures
    const errorMsg = output?.error?.message 
                  || output?.message 
                  || responseData.message 
                  || (output?.code ? `Code: ${output.code}` : undefined);

    console.log('[Wan 2.7] Status poll:', { taskId: jobId, status: wanStatus, hasUrl: !!videoUrl, error: errorMsg });

    return mapWanStatusToJob(wanStatus, jobId, videoUrl, errorMsg);
  }

  /**
   * Cancel a running Wan task.
   * Note: DashScope may not support cancellation for all task types.
   */
  async cancelJob(jobId: string): Promise<void> {
    const apiKey = this.getApiKey();
    await fetch(`${WAN_API_BASE}/tasks/${jobId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    console.log('[Wan 2.7] Cancel request sent for task:', jobId);
  }
}
