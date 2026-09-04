import React, { useState } from 'react';
import { apiClient } from '../../api/apiClient';

interface ThumbnailReviewProps {
  thumbnailPrompt: string;
  onApprove: (thumbnailUrl: string) => void;
  onBack: () => void;
}

export default function ThumbnailReview({ thumbnailPrompt, onApprove, onBack }: ThumbnailReviewProps) {
  const [editablePrompt, setEditablePrompt] = useState(thumbnailPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await apiClient.post<any>('/thumbnail/generate', {
        prompt: editablePrompt
      });

      if (response.success && response.thumbnailUrl) {
        setThumbnailUrl(response.thumbnailUrl);
      } else {
        throw new Error(response.error || 'Failed to generate thumbnail.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during thumbnail generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinish = () => {
    if (thumbnailUrl) {
      onApprove(thumbnailUrl);
    }
  };

  return (
    <div className="review-container animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <header className="review-header" style={{ marginBottom: '2rem' }}>
        <h2>Thumbnail Generation</h2>
        <p className="supporting-text">Review the thumbnail prompt and generate the final eye-catching thumbnail using Qwen Image 3.0.</p>
      </header>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3>Thumbnail Prompt</h3>
        </div>
        <div className="card-body">
          <textarea
            className="input-field"
            rows={5}
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            disabled={isGenerating || !!thumbnailUrl}
            style={{ width: '100%', marginBottom: '1rem', padding: '1rem', fontFamily: 'monospace' }}
          />
          
          {!thumbnailUrl && (
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={isGenerating || !editablePrompt.trim()}
            >
              {isGenerating ? 'Generating...' : 'Generate Thumbnail'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-error" style={{ marginBottom: '2rem' }}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {thumbnailUrl && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3>Generated Thumbnail</h3>
          </div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <img 
              src={thumbnailUrl.startsWith('data:') ? thumbnailUrl : `/api/media${thumbnailUrl}`} 
              alt="Generated Thumbnail" 
              style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
            />
            <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Provider: <strong>Qwen Image 3.0</strong>
            </div>
          </div>
        </div>
      )}

      <footer className="action-row" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
        <button className="btn btn-secondary" onClick={onBack} disabled={isGenerating}>
          ← Back to Final Video
        </button>
        {thumbnailUrl && (
          <button className="btn btn-primary" onClick={handleFinish} style={{ marginLeft: 'auto' }}>
            Finish Project
          </button>
        )}
      </footer>
    </div>
  );
}
