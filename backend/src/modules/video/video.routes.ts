/**
 * Video generation routes.
 * 
 * POST /video/generate-single  — Submit a video generation task, return jobId immediately (202)
 * GET  /video/job/:jobId       — Poll status of a submitted job
 * POST /video/job/:jobId/cancel — Cancel a running job
 * 
 * Architecture:
 * - Provider-neutral: uses VideoGenerationProvider interface
 * - In-memory job store for runtime deduplication and status caching
 * - Idempotency: rejects duplicate submissions for the same sceneId
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { VideoClip, VideoGenerationStatus } from '../../types/video-scene.types';
import { VideoGenerationJob } from '../../providers/video/video.provider';
import { config } from '../../config/env';
import { VideoAssemblyService } from './assembly.service';

const router = express.Router();
const assemblyService = new VideoAssemblyService();

// ── Provider Factory ──────────────────────────────────────────────────────
function getVideoProvider() {
  const provider = config.videoProvider;

  if (provider === 'WAN') {
    const { Wan27Provider } = require('../../providers/video/wan27.provider');
    return new Wan27Provider();
  }

  return null;
}

// ── In-Memory Job Store ───────────────────────────────────────────────────
// Maps sceneId → active VideoClip record (persisted for the runtime session)
const jobStore = new Map<string, VideoClip>();
// Tracks which sceneIds are currently being submitted (prevents duplicates)
const submittingScenes = new Set<string>();

function buildVideoClip(
  sceneId: string,
  sceneNumber: number,
  status: VideoGenerationStatus,
  job: Partial<VideoGenerationJob> = {},
  promptUsed: string = '',
  attempt: number = 1,
  overrides: Partial<VideoClip> = {}
): VideoClip {
  return {
    id: job.jobId || `clip_${sceneId}_${Date.now()}`,
    sceneId,
    sceneNumber,
    generationStatus: status,
    videoUrl: job.videoUrl,
    mimeType: job.videoUrl ? 'video/mp4' : undefined,
    providerJobId: job.jobId,
    promptUsed,
    modelUsed: config.videoProvider === 'WAN' ? 'wan2.1-i2v-turbo' : 'unknown',
    generatedAt: new Date().toISOString(),
    generationAttempt: attempt,
    error: job.error,
    ...overrides,
  };
}

// ── POST /video/generate-single ───────────────────────────────────────────
router.post('/generate-single', async (req, res) => {
  const { videoScene, imageBase64, attempt = 1 } = req.body;

  if (!videoScene || !imageBase64) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: videoScene and imageBase64',
    });
  }

  const sceneId: string = videoScene.id;
  const sceneNumber: number = videoScene.sceneNumber;

  // Check for duplicate submission
  if (submittingScenes.has(sceneId)) {
    return res.status(429).json({
      success: false,
      error: `Scene ${sceneNumber} is already being submitted. Please wait.`,
    });
  }

  // Check provider availability
  const provider = getVideoProvider();
  if (!provider) {
    return res.status(200).json({
      success: false,
      status: 'VIDEO_PROVIDER_NOT_CONFIGURED',
      message: `Video provider is set to "${config.videoProvider}". Set VIDEO_PROVIDER=WAN and WAN_API_KEY in backend .env to enable video generation.`,
    });
  }

  // Check API key is set
  if (config.videoProvider === 'WAN' && !config.wanApiKey) {
    return res.status(200).json({
      success: false,
      status: 'VIDEO_PROVIDER_NOT_CONFIGURED',
      message: 'Wan API key is not configured. Add WAN_API_KEY to the backend .env file.',
    });
  }

  submittingScenes.add(sceneId);

  try {
    const motionPrompt = `${videoScene.motionPrompt}\n\nCRITICAL REQUIREMENT: External voiceover narration plays over the scene. Characters do not speak and must not lip-sync to the narration. Keep the mouth neutral/non-speaking. Do not animate dialogue or speech mouth movement. Tell the story through physical actions, gestures, facial reactions, eye direction, body language and interaction with the environment.`;

    // Submit job to provider (returns immediately with task_id)
    const job = await provider.submitVideoJob({
      imageBase64,
      motionPrompt,
      duration: Math.min(videoScene.recommendedDuration || 5, 10), // cap at 10s
    });

    const clip = buildVideoClip(
      sceneId,
      sceneNumber,
      'GENERATING',
      job,
      videoScene.motionPrompt,
      attempt
    );

    // Store in job store for status polling
    jobStore.set(sceneId, clip);

    console.log(`[Video] Task submitted for Scene ${sceneNumber}. jobId: ${job.jobId}`);

    // Return 202 Accepted — client must poll GET /video/job/:jobId
    return res.status(202).json({
      success: true,
      videoClip: clip,
    });
  } catch (error: any) {
    console.error(`[Video] Submission failed for Scene ${sceneNumber}:`, error.message);

    const failedClip = buildVideoClip(
      sceneId,
      sceneNumber,
      'FAILED',
      { jobId: `fail_${sceneId}`, error: error.message },
      videoScene.motionPrompt,
      attempt
    );

    jobStore.set(sceneId, failedClip);

    return res.status(500).json({
      success: false,
      error: error.message,
      videoClip: failedClip,
    });
  } finally {
    submittingScenes.delete(sceneId);
  }
});

// ── GET /video/job/:jobId ─────────────────────────────────────────────────
// sceneId is passed as query param to look up the right clip in the store
router.get('/job/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { sceneId } = req.query as { sceneId?: string };

  const provider = getVideoProvider();
  if (!provider) {
    return res.status(200).json({
      success: false,
      status: 'VIDEO_PROVIDER_NOT_CONFIGURED',
      message: 'No video provider configured.',
    });
  }

  try {
    // Poll the actual provider for current status
    const job = await provider.checkJobStatus(jobId);

    // Update our local job store if we have a sceneId
    if (sceneId && jobStore.has(sceneId)) {
      const existing = jobStore.get(sceneId)!;
      let finalVideoUrl = job.videoUrl ?? existing.videoUrl;

      // Async Video Downloading:
      // If the provider returned a temporary URL and we haven't downloaded it yet, download it now.
      if (job.status === 'COMPLETED' && job.videoUrl && job.videoUrl.startsWith('http')) {
        try {
          console.log(`[Video] Downloading completed video for scene ${sceneId} from ${job.videoUrl}`);
          const vidRes = await fetch(job.videoUrl);
          if (vidRes.ok) {
            const buffer = await vidRes.arrayBuffer();
            const videosDir = path.join(process.cwd(), 'data', 'videos');
            if (!fs.existsSync(videosDir)) {
              fs.mkdirSync(videosDir, { recursive: true });
            }
            const filename = `scene_${sceneId}_${Date.now()}.mp4`;
            fs.writeFileSync(path.join(videosDir, filename), Buffer.from(buffer));
            finalVideoUrl = `/api/media/videos/${filename}`;
            job.videoUrl = finalVideoUrl; // Update job so the response sends the local URL
            console.log(`[Video] Saved video to ${finalVideoUrl}`);
          }
        } catch (downloadErr: any) {
          console.error(`[Video] Failed to download video for scene ${sceneId}:`, downloadErr.message);
          // We will leave the temporary URL in place if download fails, but it's not ideal.
        }
      }

      const updated: VideoClip = {
        ...existing,
        generationStatus: job.status as VideoGenerationStatus,
        videoUrl: finalVideoUrl,
        error: job.error,
      };
      jobStore.set(sceneId, updated);
    }

    return res.json({
      success: true,
      job,
      // Return updated clip if we have sceneId
      videoClip: sceneId && jobStore.has(sceneId) ? jobStore.get(sceneId) : undefined,
    });
  } catch (error: any) {
    console.error(`[Video] Status poll failed for job ${jobId}:`, error.message);
    return res.status(500).json({
      success: false,
      error: `Failed to check job status: ${error.message}`,
    });
  }
});

// ── POST /video/job/:jobId/cancel ─────────────────────────────────────────
router.post('/job/:jobId/cancel', async (req, res) => {
  const { jobId } = req.params;

  const provider = getVideoProvider();
  if (!provider || !provider.cancelJob) {
    return res.status(501).json({
      success: false,
      error: 'Cancel not supported by current provider.',
    });
  }

  try {
    await provider.cancelJob(jobId);
    return res.json({ success: true, message: `Cancel requested for job ${jobId}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /video/assemble ──────────────────────────────────────────────────
router.post('/assemble', async (req, res) => {
  try {
    const { videoUrls, audioPath } = req.body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return res.status(400).json({ success: false, error: 'videoUrls array is required.' });
    }

    let finalAudioPath: string | undefined = undefined;
    if (audioPath) {
      if (audioPath.startsWith('/api/media/audio/')) {
        const filename = audioPath.replace('/api/media/audio/', '');
        finalAudioPath = require('path').join(process.cwd(), 'data', 'audio', filename);
      } else {
        finalAudioPath = audioPath;
      }
    }

    // Assembly process might take 10-60 seconds depending on video length,
    // so we just await it directly in this endpoint. Express has a default 2m timeout.
    const result = await assemblyService.assembleVideo({
      videoUrls,
      audioPath: finalAudioPath
    });

    return res.json({ success: true, finalVideoUrl: result.finalVideoUrl });
  } catch (error: any) {
    console.error('[Video] Assembly failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
