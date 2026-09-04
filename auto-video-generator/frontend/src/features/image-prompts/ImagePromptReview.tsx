import React, { useState } from 'react';
import { ImagePromptMasterPlan, ImagePromptPlan } from '../../types/image-prompts';
import { apiClient } from '../../api/apiClient';
import { ScriptData } from '../script/ScriptReview';
import InstructionBox from '../../components/InstructionBox';

interface ImagePromptReviewProps {
  topic: string;
  format: string;
  script: ScriptData;
  masterPlan: ImagePromptMasterPlan;
  initialVideoInstructions?: string;
  onApprove: (approvedPlan: ImagePromptMasterPlan, videoInstructions: string) => void;
  onBack: () => void;
}

const ImagePromptReview: React.FC<ImagePromptReviewProps> = ({
  topic,
  format,
  script,
  masterPlan,
  initialVideoInstructions = '',
  onApprove,
  onBack,
}) => {
  const [editablePlan, setEditablePlan] = useState<ImagePromptMasterPlan>(masterPlan);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoInstructions, setVideoInstructions] = useState(initialVideoInstructions);

  const startEditing = (promptPlan: ImagePromptPlan) => {
    setEditingPromptId(promptPlan.id);
    setEditValue(promptPlan.prompt);
  };

  const saveEdit = () => {
    if (!editingPromptId) return;
    
    setEditablePlan((prev) => {
      const updatedPrompts = prev.imagePrompts.map(p => 
        p.id === editingPromptId ? { ...p, prompt: editValue } : p
      );
      return { ...prev, imagePrompts: updatedPrompts };
    });
    setEditingPromptId(null);
  };

  const cancelEdit = () => {
    setEditingPromptId(null);
    setEditValue('');
  };

  const handleRegeneratePrompt = async (promptId: string) => {
    setRegeneratingIds(prev => new Set(prev).add(promptId));
    setErrorMsg(null);

    try {
      const prompt = editablePlan.imagePrompts.find(p => p.id === promptId);
      if (!prompt) throw new Error('Prompt not found');

      const data = await apiClient.post<any>('/image-prompts/regenerate-single', {
        topic,
        script,
        masterPlan: editablePlan,
        targetPromptId: promptId
      });

      setEditablePlan((prev) => {
        const updatedPrompts = prev.imagePrompts.map(p => 
          p.id === promptId ? data.prompt : p
        );
        return { ...prev, imagePrompts: updatedPrompts };
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setRegeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(promptId);
        return newSet;
      });
    }
  };

  return (
    <div className="review-container animate-fade-in">
      <header className="app-header">
        <div>
          <h2 className="section-heading">Image Prompt Master Plan</h2>
          <p className="supporting-text">Review the visual instructions before generating images.</p>
        </div>
      </header>

      {errorMsg && (
        <div className="alert-banner alert-error" style={{ marginBottom: '1rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <div className="split-layout" style={{ marginBottom: '2.5rem' }}>
        <section className="card" style={{ flex: 1, width: '100%' }}>
          <div className="card-header">
            <h3>Project Summary</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Topic:</strong> <br/>{topic}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Total Images:</strong> <br/>{editablePlan.imagePrompts.length}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Format:</strong> <br/>{format}</div>
          </div>
        </section>

        <section className="card" style={{ flex: 2, width: '100%' }}>
          <div className="card-header">
            <h3>Global Visual Style</h3>
          </div>
          <div className="card-body">
            <p style={{ margin: '0 0 0.5rem 0' }}><strong style={{ color: 'var(--color-primary)' }}>Style:</strong> {editablePlan.visualBible.overallStyle}</p>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{editablePlan.visualBible.styleDescription}</p>
          </div>
        </section>
      </div>

      <section className="review-section prompt-segments">
        <h3 className="section-heading" style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Image Prompts</h3>
        <div className="prompt-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {editablePlan.imagePrompts.map((promptPlan, index) => {
            const isRegenerating = regeneratingIds.has(promptPlan.id);
            const isEditing = editingPromptId === promptPlan.id;

            return (
              <div key={promptPlan.id || index} className="card" style={{ 
                opacity: isRegenerating ? 0.6 : 1,
                pointerEvents: isRegenerating ? 'none' : 'auto'
              }}>
                <div className="card-header">
                  <h3>Image {index + 1} of {editablePlan.imagePrompts.length}</h3>
                  <span className="badge badge-neutral">Segment {promptPlan.sceneNumber}</span>
                </div>
                
                <div className="card-body">
                  <div className="narration-box" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Script Context</div>
                    <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '6px', borderLeft: '3px solid var(--border-color)' }}>"{promptPlan.narration}"</p>
                  </div>
                  
                  <div className="actual-prompt-box" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Image Prompt</div>
                    
                    {isEditing ? (
                      <div className="edit-mode">
                        <textarea 
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="input-field"
                          rows={6}
                          disabled={isRegenerating}
                        />
                        <div className="edit-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                          <button className="btn btn-primary btn-small" onClick={saveEdit} disabled={isRegenerating}>Save Changes</button>
                          <button className="btn btn-secondary btn-small" onClick={cancelEdit} disabled={isRegenerating}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="view-mode">
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '6px', color: 'var(--color-success)', lineHeight: 1.5 }}>
                          {promptPlan.prompt}
                        </div>
                        
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                          <button 
                            className="btn btn-secondary btn-small"
                            onClick={() => startEditing(promptPlan)}
                            disabled={isRegenerating || editingPromptId !== null}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-secondary btn-small"
                            onClick={() => handleRegeneratePrompt(promptPlan.id)}
                            disabled={isRegenerating || editingPromptId !== null}
                          >
                            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="references-box" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                    <strong>Consistency Info: </strong>
                    Characters: {promptPlan.consistencyReferences?.characterIds?.length ? promptPlan.consistencyReferences.characterIds.join(', ') : 'None'} | 
                    Locations: {promptPlan.consistencyReferences?.locationIds?.length ? promptPlan.consistencyReferences.locationIds.join(', ') : 'None'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Video Generation Instructions — set here, stored in App.tsx, used at video scene stage */}
      <section style={{ marginTop: '2rem' }}>
        <InstructionBox
          id="video-instructions"
          title="Video Motion Instructions"
          description="Control camera movement, motion style, motion intensity, and sound requirements for the video generation stage. These are saved and applied when you generate video scenes."
          placeholder="Describe how the video should move..."
          exampleHint="Use slow cinematic camera pans and zooms. Show realistic environmental motion (wind, leaves). No background music — environmental sound effects only. Motion intensity: subtle."
          value={videoInstructions}
          onChange={setVideoInstructions}
          disabled={regeneratingIds.size > 0}
        />
      </section>

      <footer className="action-row" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
        <button onClick={onBack} className="btn btn-secondary">Back</button>
        <button onClick={() => onApprove(editablePlan, videoInstructions)} className="btn btn-primary" style={{ marginLeft: 'auto' }} disabled={regeneratingIds.size > 0 || editingPromptId !== null}>
          Generate All Images
        </button>
      </footer>
    </div>
  );
};

export default ImagePromptReview;
