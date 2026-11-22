export interface VideoGenerationOptions {
  imageBase64: string; // The base64 string of the image
  motionPrompt: string; // The specific prompt for how it should move
  seed?: number;
  duration?: number;
}

export interface VideoGenerationJob {
  jobId: string;
  status: 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  videoUrl?: string;
  error?: string;
}

export interface VideoGenerationProvider {
  /**
   * Submits a video generation request to the provider.
   * Real providers are asynchronous and should return a job ID to poll.
   */
  submitVideoJob(options: VideoGenerationOptions): Promise<VideoGenerationJob>;
  
  /**
   * Polls the provider for the status of an existing job.
   */
  checkJobStatus(jobId: string): Promise<VideoGenerationJob>;
  
  /**
   * Optional method to cancel a running job.
   */
  cancelJob?(jobId: string): Promise<void>;
}
