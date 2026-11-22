import { useRef, useState } from 'react';
import InstructionBox from '../../components/InstructionBox';

interface VoiceReviewProps {
  audioUrl: string;
  initialImageInstructions?: string;
  onRegenerate: () => void;
  onContinue: (audioDuration: number, imageInstructions: string) => void;
  onBack: () => void;
}

export default function VoiceReview({
  audioUrl,
  initialImageInstructions = '',
  onRegenerate,
  onContinue,
  onBack
}: VoiceReviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [imageInstructions, setImageInstructions] = useState(initialImageInstructions);

  const handleContinue = () => {
    let duration = 0;
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      duration = audioRef.current.duration;
    }
    // Fallback if metadata hasn't fully loaded
    if (duration === 0) duration = 30;
    
    onContinue(duration, imageInstructions);
  };

  return (
    <div className="review-container animate-fade-in">
      <div className="app-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-heading">Review Generated Voice</h2>
          <p className="supporting-text">Listen to the AI-generated voiceover, then set your image generation preferences below.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <audio 
          ref={audioRef}
          controls 
          src={audioUrl}
          style={{ width: '100%', maxWidth: '600px' }}
          autoPlay
        >
          Your browser does not support the audio element.
        </audio>
      </div>

      {/* Image / Scene Instructions */}
      <div style={{ marginTop: '1.5rem' }}>
        <InstructionBox
          id="image-instructions"
          title="Image & Scene Instructions"
          description="Control the visual style, camera framing, composition, lighting, and environment for all generated images. Leave blank to use the default (3D animated cartoon with mixed framing)."
          placeholder="Describe how images should look..."
          exampleHint="Use wide cinematic shots. Show the full environment and background. If a jungle is present, show trees, depth and sky. Avoid portrait-only close-ups. Realistic 3D render style."
          value={imageInstructions}
          onChange={setImageInstructions}
        />
      </div>

      <div className="action-row">
        <button onClick={onBack} className="btn btn-secondary">
          Back to Script
        </button>
        <button onClick={onRegenerate} className="btn btn-secondary">
          Regenerate Voice
        </button>
        <button onClick={handleContinue} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
          Continue to Scenes
        </button>
      </div>
    </div>
  );
}
