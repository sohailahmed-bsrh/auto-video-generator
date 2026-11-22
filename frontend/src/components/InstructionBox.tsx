import React, { useState } from 'react';

interface InstructionBoxProps {
  /** Unique id for accessibility */
  id: string;
  /** Label shown above the box */
  title: string;
  /** Short description of what the instructions control */
  description: string;
  /** Placeholder shown when the box is empty */
  placeholder: string;
  /** Current instruction value */
  value: string;
  /** Called when user edits instructions */
  onChange: (value: string) => void;
  /** When true, the box is disabled (generation running) */
  disabled?: boolean;
  /** Optional default/example hint text shown in the collapsed state */
  exampleHint?: string;
  /** Max character limit */
  maxLength?: number;
}

const InstructionBox: React.FC<InstructionBoxProps> = ({
  id,
  title,
  description,
  placeholder,
  value,
  onChange,
  disabled = false,
  exampleHint,
  maxLength = 2048,
}) => {
  const [isExpanded, setIsExpanded] = useState(value.length > 0);

  const handleToggle = () => {
    if (disabled) return;
    setIsExpanded((prev) => !prev);
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className={`instruction-box ${hasContent ? 'instruction-box--active' : ''} ${disabled ? 'instruction-box--disabled' : ''}`}>
      {/* Header row — always visible */}
      <button
        type="button"
        className="instruction-box__header"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={`${id}-content`}
        disabled={disabled}
      >
        <div className="instruction-box__header-left">
          {/* Icon */}
          <span className="instruction-box__icon" aria-hidden="true">
            {hasContent ? (
              // Pencil (active)
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            ) : (
              // Sparkles (empty)
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
              </svg>
            )}
          </span>
          <div>
            <span className="instruction-box__title">{title}</span>
            {hasContent && !isExpanded && (
              <span className="instruction-box__preview">
                &nbsp;·&nbsp;{value.slice(0, 60)}{value.length > 60 ? '…' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="instruction-box__header-right">
          {hasContent && (
            <span className="instruction-box__badge">Custom</span>
          )}
          <span className="instruction-box__chevron" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div id={`${id}-content`} className="instruction-box__body">
          <p className="instruction-box__description">{description}</p>

          {exampleHint && (
            <div className="instruction-box__example">
              <span className="instruction-box__example-label">Example:</span> {exampleHint}
            </div>
          )}

          <div className="instruction-box__field-wrapper">
            <textarea
              id={id}
              className="input-field instruction-box__textarea"
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  onChange(e.target.value);
                }
              }}
              disabled={disabled}
              rows={5}
              maxLength={maxLength}
              aria-label={title}
            />
            <div className="instruction-box__footer">
              <span className={`instruction-box__char-count ${value.length > maxLength * 0.9 ? 'instruction-box__char-count--near-limit' : ''}`}>
                {value.length} / {maxLength}
              </span>
              {hasContent && (
                <button
                  type="button"
                  className="instruction-box__clear-btn"
                  onClick={() => onChange('')}
                  disabled={disabled}
                  title="Clear instructions"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="instruction-box__info-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {hasContent
              ? 'Your instructions will be sent to the AI and applied to the next generation.'
              : 'Leave blank to use smart defaults. Instructions only apply to the next generation.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructionBox;
