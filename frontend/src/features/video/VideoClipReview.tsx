/**
 * VideoClipReview
 * 
 * Handles video generation for all approved scenes.
 * 
 * Flow per scene:
 *   User clicks Generate → POST /video/generate-single (202 + jobId)
 *   → Component polls GET /video/job/:jobId every 15s
 *   → On COMPLETED: show video preview + expiry warning
 *   → On FAILED: show error + Retry button
 * 
 * Concurrency: max 2 simultaneous generations (configurable via MAX_CONCURRENT).
 * Deduplication: backend rejects duplicate submissions per sceneId.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoScenePlan, VideoScene, VideoClip } from '../../types/video-scene';
import { GeneratedSceneImage } from '../../types/image';
import { apiClient } from '../../api/apiClient';

const MAX_CONCURRENT = 2;           // simultaneous video jobs
const POLL_INTERVAL_MS = 15_000;    // poll every 15 seconds
const URL_EXPIRY_WARNING_H = 20;    // warn after 20 hours

interface VideoClipReviewProps {
  videoScenePlan: VideoScenePlan;
  approvedImages: GeneratedSceneImage[];
  onApproveAll: (clips: VideoClip[]) => void;
  onBack: () => void;
}

type SceneStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'SUBMITTING'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED';

interface SceneState {
  status: SceneStatus;
  clip?: VideoClip;
  error?: string;
}

// Check if a video URL is likely expired (Wan URLs ~24h TTL)
function isUrlExpired(clip: VideoClip): boolean {
  if (!clip.generatedAt || !clip.videoUrl) return false;
  const ageMs = Date.now() - new Date(clip.generatedAt).getTime();
  return ageMs > URL_EXPIRY_WARNING_H * 60 * 60 * 1000;
}

const VideoClipReview: React.FC<VideoClipReviewProps> = ({
  videoScenePlan,
  approvedImages,
  onApproveAll,
  onBack,
}) => {
  const [sceneStates, setSceneStates] = useState<Record<string, SceneState>>(() => {
    const initial: Record<string, SceneState> = {};
    for (const scene of videoScenePlan.scenes) {
      initial[scene.id] = { status: 'IDLE' };
    }
    return initial;
  });

  const [providerStatus, setProviderStatus] = useState<'UNKNOWN' | 'CONFIGURED' | 'NOT_CONFIGURED'>('UNKNOWN');
  const [providerMessage, setProviderMessage] = useState<string>('');
  const [activeJobs, setActiveJobs] = useState(0);

  // Poll intervals: sceneId → interval handle
  const pollIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Clear all intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollIntervals.current).forEach(clearInterval);
    };
  }, []);

  const updateScene = useCallback((sceneId: string, update: Partial<SceneState>) => {
    setSceneStates(prev => ({
      ...prev,
      [sceneId]: { ...prev[sceneId], ...update },
    }));
  }, []);

  const stopPolling = useCallback((sceneId: string) => {
    if (pollIntervals.current[sceneId]) {
      clearInterval(pollIntervals.current[sceneId]);
      delete pollIntervals.current[sceneId];
    }
  }, []);

  const startPolling = useCallback((sceneId: string, jobId: string) => {
    // Clear any existing interval for this scene
    stopPolling(sceneId);

    const interval = setInterval(async () => {
      try {
        const data = await apiClient.get<any>(`/video/job/${jobId}?sceneId=${encodeURIComponent(sceneId)}`);

        if (!data.success) {
          // Unexpected error from poll endpoint
          stopPolling(sceneId);
          updateScene(sceneId, {
            status: 'FAILED',
            error: data.error || 'Status check failed',
          });
          setActiveJobs(j => Math.max(0, j - 1));
          return;
        }

        const job = data.job;
        const updatedClip: VideoClip | undefined = data.videoClip;

        if (job.status === 'COMPLETED') {
          stopPolling(sceneId);
          setActiveJobs(j => Math.max(0, j - 1));
          updateScene(sceneId, {
            status: 'COMPLETED',
            clip: updatedClip,
          });
        } else if (job.status === 'FAILED') {
          stopPolling(sceneId);
          setActiveJobs(j => Math.max(0, j - 1));
          updateScene(sceneId, {
            status: 'FAILED',
            error: job.error || 'Video generation failed',
            clip: updatedClip,
          });
        }
        // If still GENERATING, do nothing — poll again next interval
      } catch (pollErr: any) {
        // Network error during polling — don't stop, try again next cycle
        console.warn(`[VideoClip] Poll error for scene ${sceneId}:`, pollErr.message);
      }
    }, POLL_INTERVAL_MS);

    pollIntervals.current[sceneId] = interval;
  }, [stopPolling, updateScene]);

  const generateClip = useCallback(async (scene: VideoScene, attempt = 1) => {
    const image = approvedImages.find(img => img.sceneNumber === scene.sceneNumber);
    if (!image?.imageData) {
      updateScene(scene.id, {
        status: 'FAILED',
        error: `No image data found for Scene ${scene.sceneNumber}. Please re-approve images.`,
      });
      return;
    }

    updateScene(scene.id, { status: 'SUBMITTING', error: undefined });

    try {
      const data = await apiClient.post<any>('/video/generate-single', {
        videoScene: scene,
        imageBase64: image.imageData,
        attempt,
      });

      // Provider not configured — show informational state
      if (!data.success && data.status === 'VIDEO_PROVIDER_NOT_CONFIGURED') {
        setProviderStatus('NOT_CONFIGURED');
        setProviderMessage(data.message || 'Video provider is not configured.');
        updateScene(scene.id, { status: 'IDLE' });
        return;
      }

      setProviderStatus('CONFIGURED');

      if (!data.success) {
        throw new Error(data.error || 'Submission failed');
      }

      const clip: VideoClip = data.videoClip;
      const jobId = clip.providerJobId;

      updateScene(scene.id, {
        status: 'GENERATING',
        clip,
      });

      setActiveJobs(j => j + 1);

      // Start polling for status
      if (jobId) {
        startPolling(scene.id, jobId);
      } else {
        // No jobId — provider may have completed synchronously (unusual)
        updateScene(scene.id, {
          status: clip.generationStatus === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          clip,
          error: clip.error,
        });
        setActiveJobs(j => Math.max(0, j - 1));
      }
    } catch (err: any) {
      console.error(`[VideoClip] Submit failed for Scene ${scene.sceneNumber}:`, err.message);
      updateScene(scene.id, {
        status: 'FAILED',
        error: err.message,
      });
    }
  }, [approvedImages, startPolling, updateScene]);

  const handleGenerateSingle = useCallback((scene: VideoScene) => {
    const current = sceneStates[scene.id];
    const attempt = (current?.clip?.generationAttempt ?? 0) + 1;
    stopPolling(scene.id); // Stop any existing poll before retrying
    generateClip(scene, attempt);
  }, [sceneStates, generateClip, stopPolling]);

  const handleGenerateAll = useCallback(() => {
    const pending = videoScenePlan.scenes.filter(scene => {
      const s = sceneStates[scene.id]?.status;
      return s === 'IDLE' || s === 'FAILED';
    });

    let launched = 0;
    const queue = [...pending];

    const launchNext = () => {
      while (activeJobs + launched < MAX_CONCURRENT && queue.length > 0) {
        const scene = queue.shift()!;
        launched++;
        const attempt = (sceneStates[scene.id]?.clip?.generationAttempt ?? 0) + 1;
        generateClip(scene, attempt).finally(() => {
          launched = Math.max(0, launched - 1);
          launchNext();
        });
      }
    };

    launchNext();
  }, [videoScenePlan.scenes, sceneStates, activeJobs, generateClip]);

  const allCompleted = videoScenePlan.scenes.every(
    s => sceneStates[s.id]?.status === 'COMPLETED'
  );

  const anyGenerating = videoScenePlan.scenes.some(
    s => sceneStates[s.id]?.status === 'GENERATING' || sceneStates[s.id]?.status === 'SUBMITTING' || sceneStates[s.id]?.status === 'QUEUED'
  );

  const completedCount = videoScenePlan.scenes.filter(
    s => sceneStates[s.id]?.status === 'COMPLETED'
  ).length;

  const failedCount = videoScenePlan.scenes.filter(
    s => sceneStates[s.id]?.status === 'FAILED'
  ).length;

  // ── Provider Not Configured screen ─────────────────────────────────────
  if (providerStatus === 'NOT_CONFIGURED') {
    return (
      <div className="review-container animate-fade-in">
        <div className="app-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 className="section-heading">Video Clip Generation</h2>
            <p className="supporting-text">Generate the final animated video clips for each scene.</p>
          </div>
        </div>

        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>Wan 2.7 Not Configured</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            {providerMessage}
          </p>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 600 }}># Add to backend/.env:</div>
            <div>VIDEO_PROVIDER=WAN</div>
            <div>WAN_API_KEY=your_dashscope_api_key</div>
          </div>
          <div className="action-row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={onBack}>← Back to Motion Plans</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Review Screen ──────────────────────────────────────────────────
  return (
    <div className="review-container animate-fade-in">
      {/* Header */}
      <div className="app-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-heading">Video Clip Generation</h2>
          <p className="supporting-text">
            Generate animated video clips from your approved scene images. Videos are created by Wan 2.7 and may take 2–5 minutes per clip.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGenerateAll}
          disabled={anyGenerating || allCompleted}
        >
          {anyGenerating ? 'Generating...' : 'Generate All Missing'}
        </button>
      </div>

      {/* Progress banner */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <span><strong style={{ color: 'var(--text-secondary)' }}>Total:</strong> {videoScenePlan.scenes.length}</span>
        <span><strong style={{ color: 'var(--text-secondary)' }}>Completed:</strong> <span style={{ color: 'var(--color-success)' }}>{completedCount}</span></span>
        <span><strong style={{ color: 'var(--text-secondary)' }}>Failed:</strong> <span style={{ color: failedCount > 0 ? 'var(--color-error)' : 'inherit' }}>{failedCount}</span></span>
        {anyGenerating && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontSize: '0.875rem' }}>
            <div className="spinner spinner-small"/>
            Generating... polling every 15s
          </span>
        )}
      </div>

      {/* Scene Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {videoScenePlan.scenes.map(scene => {
          const state = sceneStates[scene.id] || { status: 'IDLE' };
          const image = approvedImages.find(img => img.sceneNumber === scene.sceneNumber);
          const isGenerating = state.status === 'GENERATING' || state.status === 'SUBMITTING';
          const isQueued = state.status === 'QUEUED';
          const isCompleted = state.status === 'COMPLETED';
          const isFailed = state.status === 'FAILED';
          const canGenerate = !isGenerating && !isQueued;
          const expired = isCompleted && state.clip ? isUrlExpired(state.clip) : false;

          return (
            <div key={scene.id} className="card">
              {/* Card Header */}
              <div className="card-header">
                <h3>Scene {scene.sceneNumber}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    ~{scene.recommendedDuration}s
                  </span>
                  <span className={`badge ${
                    isCompleted ? 'badge-success' :
                    isFailed ? 'badge-error' :
                    isGenerating ? 'badge-warning' :
                    isQueued ? 'badge-warning' :
                    'badge-neutral'
                  }`}>
                    {state.status === 'SUBMITTING' ? 'SUBMITTING...' :
                     state.status === 'GENERATING' ? 'GENERATING...' :
                     state.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="card-body" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Source Image */}
                <div style={{ flexShrink: 0, width: '220px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Source Frame
                  </div>
                  {image?.imageData ? (
                    <img
                      src={image.imageData}
                      alt={`Scene ${scene.sceneNumber} source`}
                      style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No Image
                    </div>
                  )}
                </div>

                {/* Video Area */}
                <div style={{ flex: '1', minWidth: '220px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Generated Video
                  </div>

                  {isGenerating || isQueued ? (
                    <div style={{ aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <div className="spinner"/>
                      <span>{state.status === 'SUBMITTING' ? 'Submitting task...' : 'Generating video (polling every 15s)...'}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Wan 2.7 typically takes 2–5 minutes</span>
                    </div>
                  ) : isCompleted && (state.clip?.videoUrl || state.clip?.videoData) ? (
                    <div>
                      <video
                        src={state.clip.videoUrl || state.clip.videoData}
                        controls
                        loop
                        style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'block' }}
                      />
                      {expired && (
                        <div className="alert-banner alert-error" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
                          ⚠ This video URL may have expired (generated over {URL_EXPIRY_WARNING_H}h ago). Regenerate if it fails to load.
                        </div>
                      )}
                    </div>
                  ) : isFailed ? (
                    <div style={{ aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', gap: '0.5rem', padding: '1rem' }}>
                      <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Generation Failed</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', wordBreak: 'break-word' }}>{state.error}</span>
                    </div>
                  ) : (
                    <div style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Not yet generated
                    </div>
                  )}
                </div>

                {/* Prompt & Controls Column */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Motion Prompt</strong>
                    <p style={{ margin: '0.4rem 0 0', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderLeft: '3px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {scene.motionPrompt}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className={`btn btn-small ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleGenerateSingle(scene)}
                      disabled={!canGenerate}
                    >
                      {isGenerating ? '⏳ Generating...' :
                       isFailed ? '↺ Retry' :
                       isCompleted ? '↺ Regenerate' :
                       '▶ Generate'}
                    </button>
                    {isGenerating && state.clip?.providerJobId && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        job: {state.clip.providerJobId.slice(0, 16)}…
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="action-row" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
        <button className="btn btn-secondary" onClick={onBack} disabled={anyGenerating}>
          ← Back to Motion Plans
        </button>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            const completedClips = videoScenePlan.scenes
              .map(s => sceneStates[s.id]?.clip)
              .filter((c): c is VideoClip => !!c && c.generationStatus === 'COMPLETED');
            onApproveAll(completedClips);
          }}
          disabled={!allCompleted || anyGenerating}
        >
          Approve All Clips →
        </button>
      </footer>
    </div>
  );
};

export default VideoClipReview;
