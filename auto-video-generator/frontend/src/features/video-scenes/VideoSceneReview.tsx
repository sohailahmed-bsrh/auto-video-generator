import React, { useState } from 'react';
import { VideoScenePlan, VideoScene } from '../../types/video-scene';
import { GeneratedSceneImage } from '../../types/image';
import { apiClient } from '../../api/apiClient';


interface VideoSceneReviewProps {
  topic: string;
  scriptData: any;
  masterPlan: any;
  approvedImages: GeneratedSceneImage[];
  videoScenePlan: VideoScenePlan;
  onApprove: (approvedPlan: VideoScenePlan) => void;
  onBack: () => void;
}

const VideoSceneReview: React.FC<VideoSceneReviewProps> = ({
  topic,
  scriptData,
  masterPlan,
  approvedImages,
  videoScenePlan,
  onApprove,
  onBack
}) => {
  const [scenes, setScenes] = useState<VideoScene[]>(videoScenePlan.scenes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<VideoScene>>({});
  const [loadingSceneId, setLoadingSceneId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEditClick = (scene: VideoScene) => {
    setEditingId(scene.id);
    setEditForm({ ...scene });
  };

  const handleSaveClick = (id: string) => {
    setScenes(scenes.map(s => (s.id === id ? { ...s, ...editForm } as VideoScene : s)));
    setEditingId(null);
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleRegenerate = async (index: number) => {
    const sceneToRegen = scenes[index];
    setLoadingSceneId(sceneToRegen.id);
    setErrorMsg(null);

    try {
      const data = await apiClient.post<any>('/video-scenes/plan/regenerate-scene', {
        topic,
        scriptData,
        masterPlan,
        approvedImages,
        sceneIndexToRegenerate: index,
        existingPlan: { ...videoScenePlan, scenes }
      });

      const updatedScenes = [...scenes];
      updatedScenes[index] = data.regeneratedScene;
      setScenes(updatedScenes);
    } catch (err: any) {
      setErrorMsg(`Failed to regenerate Scene ${sceneToRegen.sceneNumber}: ${err.message}`);
    } finally {
      setLoadingSceneId(null);
    }
  };

  return (
    <div className="review-container animate-fade-in">
      <div className="app-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-heading">Video Scene Motion Planning</h2>
          <p className="supporting-text">
            Review the generated motion instructions for each scene before passing them to the video generator.
          </p>
        </div>
      </div>
      {errorMsg && (
        <div className="alert-banner alert-error" style={{ marginBottom: '1rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <div className="scene-list">
        {scenes.map((scene, index) => {
          const image = approvedImages.find(img => img.sceneNumber === scene.sceneNumber);
          const isEditing = editingId === scene.id;
          const isLoading = loadingSceneId === scene.id;

          return (
            <div key={scene.id} className="card">
              <div className="card-header">
                <h3>Scene {scene.sceneNumber}</h3>
                <span className="badge badge-info">~{scene.recommendedDuration}s</span>
              </div>
              
              <div className="card-body split-layout">
                <div className="scene-image-col" style={{ width: '100%', maxWidth: '300px' }}>
                  {image?.imageData ? (
                    <img src={image.imageData} alt={`Scene ${scene.sceneNumber}`} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>No Image Available</div>
                  )}
                </div>

                <div className="scene-content-col" style={{ flex: '1', width: '100%' }}>
                  {isLoading ? (
                    <div className="loading-state" style={{ minHeight: '200px' }}>
                      <div className="spinner"></div>
                      <p>Regenerating motion plan...</p>
                    </div>
                  ) : isEditing ? (
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label className="form-label">Motion Prompt</label>
                        <textarea
                          className="input-field"
                          value={editForm.motionPrompt || ''}
                          onChange={(e) => setEditForm({ ...editForm, motionPrompt: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="form-label">Camera Movement</label>
                        <input
                          className="input-field"
                          type="text"
                          value={editForm.cameraMovement || ''}
                          onChange={(e) => setEditForm({ ...editForm, cameraMovement: e.target.value })}
                        />
                      </div>
                      <div className="action-row" style={{ marginTop: '0.5rem' }}>
                        <button className="btn btn-primary btn-small" onClick={() => handleSaveClick(scene.id)}>Save</button>
                        <button className="btn btn-secondary btn-small" onClick={handleCancelClick}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="scene-details" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Narration:</strong> 
                        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>"{scene.narrationText}"</p>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Motion Prompt:</strong>
                        <p style={{ margin: 0, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid var(--color-primary)', borderRadius: 'var(--radius-sm)' }}>{scene.motionPrompt}</p>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Camera:</strong> <span style={{ color: 'var(--text-primary)' }}>{scene.cameraMovement} ({scene.cameraSpeed})</span>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Continuity:</strong> <span style={{ color: 'var(--text-muted)' }}>{scene.continuityNotes}</span>
                      </div>
                      
                      <div className="action-row" style={{ marginTop: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary btn-small" 
                          onClick={() => handleEditClick(scene)}
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-secondary btn-small" 
                          onClick={() => handleRegenerate(index)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Regenerating...' : 'Regenerate Plan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="action-row" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>Back to Images</button>
        <button 
          className="btn btn-primary" 
          style={{ marginLeft: 'auto' }}
          onClick={() => onApprove({ ...videoScenePlan, scenes })}
          disabled={editingId !== null || loadingSceneId !== null}
        >
          Approve All Video Scenes
        </button>
      </footer>
    </div>
  );
};

export default VideoSceneReview;
