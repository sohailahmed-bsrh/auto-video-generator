import { useState } from 'react';
import { OutputFormat, FORMAT_OPTIONS } from '../../types/video';

export interface ScriptData {
  title: string;
  topic: string;
  coreConcept: string;
  targetAudience: string;
  language: string;
  estimatedDuration: number;
  estimatedWordCount: number;
  hook: string;
  introduction: string;
  storyBeats: string[];
  transitions: string;
  climax: string;
  conclusion: string;
  completeNarration: string;
}

interface ScriptReviewProps {
  topic: string;
  format: OutputFormat;
  script: ScriptData;
  onGenerateVoice: (finalNarration: string) => void;
  onRegenerate: () => void;
  onBack: () => void;
}

export default function ScriptReview({
  topic,
  format,
  script,
  onGenerateVoice,
  onRegenerate,
  onBack
}: ScriptReviewProps) {
  const formatOption = FORMAT_OPTIONS.find((f: any) => f.id === format);
  const [editedNarration, setEditedNarration] = useState(script.completeNarration);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateClick = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    onGenerateVoice(editedNarration);
    // If it fails, App.tsx handles the error and we might unmount or remount, 
    // but we should clear it just in case.
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="review-container animate-fade-in">
      <div className="app-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-heading">Review Generated Script</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span className="badge badge-info">Topic: {topic}</span>
            <span className="badge badge-info">Format: {formatOption?.label}</span>
            <span className="badge badge-warning">Est. Duration: ~{script.estimatedDuration}s</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="script-section">
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Title</h3>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>{script.title}</p>
          </div>
          
          <div className="script-section">
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Hook</h3>
            <p style={{ margin: 0 }}>{script.hook}</p>
          </div>
          
          <div className="script-section">
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Core Concept</h3>
            <p style={{ margin: 0 }}>{script.coreConcept}</p>
          </div>
          
          <div className="script-section">
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Story Beats</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-primary)' }}>
              {script.storyBeats.map((beat, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{beat}</li>
              ))}
            </ul>
          </div>
          
          <div className="script-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Complete Narration (Editable)</h3>
            <p className="supporting-text" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              This is the exact text that will be sent to ElevenLabs. Edit it if necessary.
            </p>
            <textarea 
              className="input-field" 
              value={editedNarration}
              onChange={(e) => setEditedNarration(e.target.value)}
              rows={12}
              disabled={isGenerating}
            />
          </div>
        </div>
      </div>

      <div className="action-row">
        <button onClick={onBack} className="btn btn-secondary" disabled={isGenerating}>
          Back / Edit Topic
        </button>
        <button onClick={onRegenerate} className="btn btn-secondary" disabled={isGenerating}>
          Regenerate Script
        </button>
        <button 
          onClick={handleGenerateClick} 
          className="btn btn-primary" 
          style={{ marginLeft: 'auto' }}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Voice'}
        </button>
      </div>
    </div>
  );
}
