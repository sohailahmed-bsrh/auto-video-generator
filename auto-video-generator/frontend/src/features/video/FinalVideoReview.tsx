import { useState, useEffect } from 'react';
import { VideoClip } from '../../types/video-scene';
import { apiClient } from '../../api/apiClient';

interface FinalVideoReviewProps {
  approvedVideoClips: VideoClip[];
  audioUrl: string | null;
  onBack: () => void;
  onComplete: () => void;
}

export default function FinalVideoReview({
  approvedVideoClips,
  audioUrl,
  onBack,
  onComplete
}: FinalVideoReviewProps) {
  const [isAssembling, setIsAssembling] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-start assembly on mount if not already assembled
  useEffect(() => {
    if (!finalVideoUrl && !isAssembling && !error) {
      assembleVideo();
    }
  }, []);

  const assembleVideo = async () => {
    setIsAssembling(true);
    setError(null);
    try {
      const videoUrls = approvedVideoClips
        .map(clip => clip.videoUrl)
        .filter((url): url is string => !!url);
      
      const response = await apiClient.post<{ success: boolean; finalVideoUrl: string; error?: string }>('/video/assemble', {
        videoUrls,
        audioPath: audioUrl
      });

      if (response.success && response.finalVideoUrl) {
        setFinalVideoUrl(response.finalVideoUrl);
      } else {
        throw new Error(response.error || 'Failed to assemble video');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during video assembly');
    } finally {
      setIsAssembling(false);
    }
  };

  return (
    <div className="review-container animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <header className="review-header" style={{ marginBottom: '2rem' }}>
        <h2>Final Video Assembly</h2>
        <p className="supporting-text">Merging your generated scenes and audio track into a final MP4 video.</p>
      </header>

      {isAssembling && (
        <div className="loading-state" style={{ padding: '4rem 0' }}>
          <div className="spinner"></div>
          <h3>Assembling Video...</h3>
          <p className="supporting-text" style={{ maxWidth: '400px', margin: '0 auto' }}>
            This process may take up to a minute depending on the number of clips. We are merging the high-resolution video streams and synchronizing the audio track.
          </p>
        </div>
      )}

      {error && !isAssembling && (
        <div className="alert-banner alert-error" style={{ marginBottom: '2rem' }}>
          <p><strong>Assembly Error:</strong> {error}</p>
          <button className="btn btn-secondary" onClick={assembleVideo} style={{ marginTop: '1rem' }}>
            Retry Assembly
          </button>
        </div>
      )}

      {finalVideoUrl && !isAssembling && (
        <div className="final-video-container" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <video 
              src={finalVideoUrl} 
              controls 
              autoPlay 
              style={{ width: '100%', borderRadius: '8px', display: 'block' }}
            />
          </div>
          
          <div className="action-row" style={{ marginTop: '2rem', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={onBack}>
              ← Back to Clips
            </button>
            <a href={finalVideoUrl} download className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download Final Video
            </a>
          </div>
          <div style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary" onClick={onComplete} style={{ width: '100%', maxWidth: '300px' }}>
              Generate Thumbnail & Finish Workflow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
