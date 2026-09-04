import React, { useState } from 'react';
import { apiClient } from '../api/apiClient';

export default function ElevenLabsTestControl() {
  const [testSentence, setTestSentence] = useState('Assalam-o-Alaikum! Ye Basirah Tech ki test voice hai.');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTestVoice = async () => {
    if (!testSentence.trim()) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    setAudioUrl(null);

    try {
      const data = await apiClient.post<{ success: boolean; audioUrl: string; error?: string }>('/audio/test', {
        text: testSentence
      });

      if (data.success && data.audioUrl) {
        // Need to prefix with backend URL if not handled by apiClient
        // But since we use Vite proxy or absolute URL, apiClient should handle it or it's just relative.
        // In the app, they use the relative URL directly in <audio src={audioUrl}> because of Vite proxy or it's absolute.
        setAudioUrl(data.audioUrl);
      } else {
        throw new Error(data.error || 'Failed to generate test audio');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during audio generation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Test ElevenLabs Voice</h3>
      
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Test Sentence</label>
        <textarea
          className="input-field"
          value={testSentence}
          onChange={(e) => setTestSentence(e.target.value)}
          rows={2}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          onClick={handleTestVoice} 
          className="btn btn-secondary" 
          disabled={isLoading || !testSentence.trim()}
        >
          {isLoading ? 'Testing...' : 'Test ElevenLabs Voice'}
        </button>
        
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'var(--primary-color)' }}></div>
            <span style={{ fontSize: '0.9rem' }}>Generating audio...</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="alert-banner alert-error animate-fade-in" style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {audioUrl && !isLoading && (
        <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ marginBottom: '0.5rem', color: 'var(--success-color)', fontWeight: 500 }}>
            ✓ Audio generated successfully!
          </div>
          <audio controls src={audioUrl} style={{ width: '100%', height: '40px' }} autoPlay>
            Your browser does not support the audio element.
          </audio>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            Generated URL: <a href={audioUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>{audioUrl}</a>
          </div>
        </div>
      )}
    </div>
  );
}
