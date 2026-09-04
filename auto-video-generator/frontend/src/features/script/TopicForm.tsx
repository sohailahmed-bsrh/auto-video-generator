import React, { useState } from 'react';
import { OutputFormat, FORMAT_OPTIONS } from '../../types/video';
import InstructionBox from '../../components/InstructionBox';
import ElevenLabsTestControl from '../../components/ElevenLabsTestControl';

interface TopicFormProps {
  initialTopic: string;
  initialFormat: OutputFormat;
  initialScriptInstructions?: string;
  onSubmit: (topic: string, format: OutputFormat, scriptInstructions: string) => void;
}

export default function TopicForm({ initialTopic, initialFormat, initialScriptInstructions = '', onSubmit }: TopicFormProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [format, setFormat] = useState<OutputFormat>(initialFormat || 'tiktok');
  const [scriptInstructions, setScriptInstructions] = useState(initialScriptInstructions);

  const maxChars = 200;
  
  // Need at least 5 non-space characters
  const isValid = topic.replace(/\s/g, '').length >= 5;

  const handleTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxChars) {
      setTopic(e.target.value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(topic, format, scriptInstructions);
    }
  };

  return (
    <div className="topic-form-container">
      <form onSubmit={handleSubmit} className="topic-form">
        <div className="form-group">
          <label htmlFor="topic-input" className="form-label">
            What should the video be about?
          </label>
          <div className="input-wrapper">
            <textarea
              id="topic-input"
              className="input-field"
              placeholder="Enter a topic for your video..."
              value={topic}
              onChange={handleTopicChange}
              maxLength={maxChars}
              rows={3}
            />
            <div className="char-counter">
              {topic.length}/{maxChars}
            </div>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Select output format</label>
          <div className="format-options">
            {FORMAT_OPTIONS.map((option: any) => (
              <label 
                key={option.id} 
                className={`format-card ${format === option.id ? 'selected' : ''}`}
              >
                <input 
                  type="radio" 
                  name="format" 
                  value={option.id} 
                  checked={format === option.id}
                  onChange={() => setFormat(option.id)}
                  className="hidden-radio"
                />
                <div className="format-ratio">{option.ratio}</div>
                <div className="format-details">
                  <span className="format-label">{option.label}</span>
                  <span className="format-resolution">{option.resolution}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Script Generation Instructions */}
        <InstructionBox
          id="script-instructions"
          title="Script Instructions"
          description="Control the writing style, language, tone, characters, setting, and story type. Leave blank to use the default (Roman Urdu kids story)."
          placeholder="Describe how you want the script written..."
          exampleHint="Write a realistic jungle adventure story in English with human characters. Use cinematic storytelling with a suspenseful tone."
          value={scriptInstructions}
          onChange={setScriptInstructions}
        />

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ padding: '1rem 2rem', fontSize: '1.1rem', marginTop: '1rem' }}
          disabled={!isValid}
        >
          Generate Script
        </button>
      </form>
      
      <p className="privacy-note">
        Our AI will automatically write the script, generate images, synthesize voiceover, and sync captions.
      </p>

      <ElevenLabsTestControl />
    </div>
  );
}
