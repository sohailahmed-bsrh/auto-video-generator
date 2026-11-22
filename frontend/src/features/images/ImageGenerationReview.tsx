import { useState, useEffect } from 'react';
import { ImagePromptMasterPlan, ImagePromptPlan } from '../../types/image-prompts';
import { GeneratedSceneImage } from '../../types/image';
import { apiClient } from '../../api/apiClient';

interface ImageGenerationReviewProps {
  masterPlan: ImagePromptMasterPlan;
  onApprove: (images: GeneratedSceneImage[]) => void;
  onBack: () => void;
}

export default function ImageGenerationReview({ masterPlan, onApprove, onBack }: ImageGenerationReviewProps) {
  const [images, setImages] = useState<Record<string, GeneratedSceneImage>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Auto-start batch generation on mount
  useEffect(() => {
    startBatchGeneration();
  }, []);

  const generateImage = async (promptPlan: ImagePromptPlan, attempt: number = 1): Promise<GeneratedSceneImage> => {
    // Optimistic update to 'generating'
    setImages(prev => ({
      ...prev,
      [promptPlan.id]: {
        id: 'temp',
        sceneId: promptPlan.id,
        sceneNumber: promptPlan.sceneNumber,
        generationStatus: 'generating',
        aspectRatio: masterPlan.visualBible.aspectRatio || '16:9',
        promptUsed: '',
        modelUsed: '',
        generatedAt: '',
        generationAttempt: attempt
      }
    }));

    try {
      const data = await apiClient.post<any>('/images/generate-single', { 
        promptPlan, 
        masterPlan, 
        attempt 
      });

      setImages(prev => ({ ...prev, [promptPlan.id]: data.image }));
      return data.image;
    } catch (error: any) {
      console.error(error);
      const failedImg: GeneratedSceneImage = {
        id: 'failed',
        sceneId: promptPlan.id,
        sceneNumber: promptPlan.sceneNumber,
        generationStatus: 'failed',
        aspectRatio: masterPlan.visualBible.aspectRatio || '16:9',
        promptUsed: '',
        modelUsed: '',
        generatedAt: '',
        generationAttempt: attempt,
        error: error.message
      };
      setImages(prev => ({ ...prev, [promptPlan.id]: failedImg }));
      return failedImg;
    }
  };

  const startBatchGeneration = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);

    for (let i = 0; i < masterPlan.imagePrompts.length; i++) {
      const promptPlan = masterPlan.imagePrompts[i];
      // Only generate if it doesn't exist or failed
      const existing = images[promptPlan.id];
      if (!existing || existing.generationStatus === 'failed') {
        setCurrentIndex(i);
        await generateImage(promptPlan, existing ? existing.generationAttempt + 1 : 1);
      }
    }
    
    setCurrentIndex(-1);
    setIsGeneratingAll(false);
  };

  const handleRegenerate = (promptPlan: ImagePromptPlan) => {
    const existing = images[promptPlan.id];
    const attempt = existing ? existing.generationAttempt + 1 : 1;
    generateImage(promptPlan, attempt);
  };

  const allGenerated = masterPlan.imagePrompts.every((p: ImagePromptPlan) => {
    const st = images[p.id]?.generationStatus;
    return st === 'approved' || st === 'generated' || st === 'warning';
  });

  const completedCount = Object.values(images).filter(img => 
    img.generationStatus === 'generated' || img.generationStatus === 'approved' || img.generationStatus === 'warning'
  ).length;

  const failedCount = Object.values(images).filter(img => img.generationStatus === 'failed').length;

  return (
    <div className="review-container animate-fade-in">
      <div className="app-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-heading">Generated Images</h2>
          <p className="supporting-text">Reviewing the images generated from your approved Image Prompt Master Plan.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '2rem', width: '100%' }}>
          <div><strong style={{ color: 'var(--text-secondary)' }}>Total Images:</strong> {masterPlan.imagePrompts.length}</div>
          <div><strong style={{ color: 'var(--text-secondary)' }}>Completed:</strong> <span style={{ color: 'var(--color-success)' }}>{completedCount}</span></div>
          <div style={{ color: failedCount > 0 ? 'var(--color-error)' : 'inherit' }}><strong style={{ color: 'var(--text-secondary)' }}>Failed:</strong> {failedCount}</div>
        </div>
      </div>

      {isGeneratingAll && currentIndex >= 0 && (
        <div className="alert-banner" style={{ marginBottom: '2rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)' }}>
          <div className="spinner spinner-small"></div>
          <strong>Batch Generation in Progress:</strong> Generating Image {currentIndex + 1} of {masterPlan.imagePrompts.length}...
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {masterPlan.imagePrompts.map((promptPlan: ImagePromptPlan, index: number) => {
          const image = images[promptPlan.id];
          return (
            <div key={promptPlan.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <h3>Image {index + 1} of {masterPlan.imagePrompts.length}</h3>
                <span className={`badge ${
                    image?.generationStatus === 'generating' ? 'badge-warning' :
                    image?.generationStatus === 'generated' || image?.generationStatus === 'approved' ? 'badge-success' :
                    image?.generationStatus === 'failed' ? 'badge-error' : 'badge-neutral'
                }`}>
                  {image?.generationStatus?.toUpperCase() || 'QUEUED'}
                </span>
              </div>
              
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="narration-box">
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Story Segment</div>
                  <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid var(--border-color)' }}>"{promptPlan.narration}"</p>
                </div>
              
              {image?.imageData ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={image.imageData} alt={`Generated Image ${index + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                  {image?.modelUsed && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Provider: <strong>{image.modelUsed}</strong> {image.modelUsed.includes('qwen') && '(Fallback)'}
                    </div>
                  )}
                </div>
              ) : image?.imageUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={image.imageUrl.startsWith('data:') ? image.imageUrl : `/api/media${image.imageUrl}`} alt={`Generated Image ${index + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                  {image?.modelUsed && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Provider: <strong>{image.modelUsed}</strong> {image.modelUsed.includes('qwen') && '(Fallback)'}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: '300px', maxWidth: '600px', margin: '0 auto', width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                  {image?.generationStatus === 'generating' ? 'Generating Image...' : 
                   image?.generationStatus === 'failed' ? 'Generation Failed' : 'Waiting in Queue...'}
                </div>
              )}

              {image?.error && (
                <div className="alert-banner alert-error">
                  <strong>Error:</strong> {image.error}
                </div>
              )}

              <div style={{ alignSelf: 'flex-start' }}>
                <button 
                  className="btn btn-secondary btn-small" 
                  onClick={() => handleRegenerate(promptPlan)}
                  disabled={image?.generationStatus === 'generating'}
                >
                  {image?.generationStatus === 'generating' ? 'Regenerating...' : 'Regenerate Image'}
                </button>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      <footer className="action-row" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
        <button onClick={onBack} className="btn btn-secondary" disabled={isGeneratingAll}>
          Back to Prompt Review
        </button>
        <button 
          onClick={() => onApprove(Object.values(images))} 
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          disabled={!allGenerated || isGeneratingAll}
        >
          Approve Images & Continue
        </button>
      </footer>
    </div>
  );
}
