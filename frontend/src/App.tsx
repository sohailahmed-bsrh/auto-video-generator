import React, { useState } from 'react';
import TopicForm from './features/script/TopicForm';
import ScriptReview from './features/script/ScriptReview';
import VoiceReview from './features/audio/VoiceReview';
import ImageGenerationReview from './features/images/ImageGenerationReview';
import ImagePromptReview from './features/image-prompts/ImagePromptReview';
import { OutputFormat } from './types/video';
import { GeneratedSceneImage } from './types/image';
import { ImagePromptMasterPlan } from './types/image-prompts';
import { VideoScenePlan, VideoClip } from './types/video-scene';
import VideoSceneReview from './features/video-scenes/VideoSceneReview';
import VideoClipReview from './features/video/VideoClipReview';
import FinalVideoReview from './features/video/FinalVideoReview';
import ThumbnailReview from './features/thumbnail/ThumbnailReview';
import { apiClient } from './api/apiClient';

type Screen = 'form' | 'scriptLoading' | 'scriptReview' | 'voiceLoading' | 'voiceReview' | 'imagePromptLoading' | 'imagePromptReview' | 'sceneLoading' | 'sceneReview' | 'imageReview' | 'videoSceneLoading' | 'videoSceneReview' | 'videoClipReview' | 'finalVideoReview' | 'thumbnailLoading' | 'thumbnailReview' | 'futurePhase';

function App() {
  const [screen, setScreen] = useState<Screen>('form');
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState<OutputFormat>('tiktok');
  
  // ── User Instructions (persist across screen transitions) ──────────────
  const [scriptInstructions, setScriptInstructions] = useState('');
  const [imageInstructions, setImageInstructions] = useState('');
  const [videoInstructions, setVideoInstructions] = useState('');

  // ── Pipeline data state ─────────────────────────────────────────────────
  const [scriptData, setScriptData] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imagePromptPlan, setImagePromptPlan] = useState<ImagePromptMasterPlan | null>(null);
  const [approvedImagePromptPlan, setApprovedImagePromptPlan] = useState<ImagePromptMasterPlan | null>(null);
  const [approvedImages, setApprovedImages] = useState<GeneratedSceneImage[]>([]);
  const [videoScenePlan, setVideoScenePlan] = useState<VideoScenePlan | null>(null);
  const [approvedVideoClips, setApprovedVideoClips] = useState<VideoClip[]>([]);
  const [thumbnailPrompt, setThumbnailPrompt] = useState<any>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleGenerateScript = async (
    submittedTopic: string,
    submittedFormat: OutputFormat,
    submittedScriptInstructions: string,
    isRegeneration: boolean = false,
    previousScript: any = null
  ) => {
    setTopic(submittedTopic);
    setFormat(submittedFormat);
    setScriptInstructions(submittedScriptInstructions);
    setScreen('scriptLoading');
    setErrorMsg(null);

    try {
      const data = await apiClient.post<any>('/script/generate', { 
        topic: submittedTopic, 
        format: submittedFormat,
        isRegeneration,
        previousScript,
        // Pass current instructions — trimmed empty string means "use default"
        scriptInstructions: submittedScriptInstructions.trim() || undefined,
      });
      setScriptData(data.script);
      setScreen('scriptReview');
    } catch (err: any) {
      setErrorMsg(err.message);
      if (isRegeneration) {
        setScreen('scriptReview'); 
      } else {
        setScreen('form');
      }
    }
  };

  const handleGenerateVoice = async (finalNarration: string) => {
    if (!scriptData) return;
    
    setScreen('voiceLoading');
    setErrorMsg(null);

    try {
      const data = await apiClient.post<{ success: boolean; audioUrl: string }>('/audio/generate', { text: finalNarration });
      if (data.success && data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setScreen('voiceReview');
      } else {
        throw new Error('Failed to generate audio URL');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setScreen('scriptReview');
    }
  };

  const handleGenerateImagePrompts = async (_audioDuration: number, submittedImageInstructions: string) => {
    if (!scriptData) return;

    setImageInstructions(submittedImageInstructions);
    setScreen('imagePromptLoading');
    setErrorMsg(null);

    try {
      const data = await apiClient.post<any>('/image-prompts/plan', {
        script: scriptData,
        topic,
        format,
        // Pass current instructions — trimmed empty string means "use default"
        imageInstructions: submittedImageInstructions.trim() || undefined,
      });

      setImagePromptPlan(data.imagePromptPlan);
      setScreen('imagePromptReview');
    } catch (err: any) {
      setErrorMsg(err.message);
      setScreen('voiceReview');
    }
  };

  const handleApproveImagePrompts = (approvedPlan: ImagePromptMasterPlan, submittedVideoInstructions: string) => {
    setApprovedImagePromptPlan(approvedPlan);
    setVideoInstructions(submittedVideoInstructions);
    setScreen('imageReview');
  };

  const handleGenerateVideoScenes = async (images: GeneratedSceneImage[]) => {
    setApprovedImages(images);
    setScreen('videoSceneLoading');
    setErrorMsg(null);

    const estimatedAudioDuration = scriptData.completeNarration.split(' ').length / 2.5;

    try {
      const data = await apiClient.post<any>('/video-scenes/plan', {
        topic,
        scriptData,
        masterPlan: approvedImagePromptPlan,
        approvedImages: images,
        audioDuration: estimatedAudioDuration,
        // Pass current video instructions — trimmed empty string means "use default"
        videoInstructions: videoInstructions.trim() || undefined,
      });

      setVideoScenePlan(data.videoScenePlan);
      setScreen('videoSceneReview');
    } catch (err: any) {
      setErrorMsg(err.message);
      setScreen('imageReview');
    }
  };

  const handleFinalReviewComplete = async () => {
    // Next is Thumbnail Generation Phase
    setScreen('thumbnailLoading');
    try {
      const response = await apiClient.post<any>('/image-prompts/thumbnail-plan', {
        topic: topic,
        masterPlan: videoScenePlan
      });
      setThumbnailPrompt(response.thumbnailPrompt);
      setScreen('thumbnailReview');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate thumbnail prompt plan.');
      setScreen('videoClipReview');
    }
  };

  const handleThumbnailGenerated = (thumbnailUrl: string) => {
    // This completes the end-to-end pipeline.
    alert(`Final Video and Thumbnail generation complete! Pipeline is finished. Thumbnail saved to: ${thumbnailUrl}`);
    setScreen('futurePhase');
  };

  const handleReset = () => {
    setTopic('');
    setFormat('tiktok');
    setScriptInstructions('');
    setImageInstructions('');
    setVideoInstructions('');
    setScriptData(null);
    setAudioUrl(null);
    setApprovedImages([]);
    setVideoScenePlan(null);
    setApprovedVideoClips([]);
    setThumbnailPrompt(null);
    setErrorMsg(null);
    setScreen('form');
  };

  const phases = ['script', 'voiceover', 'image prompts', 'images', 'scenes', 'render', 'thumbnail'];
  
  let phaseIndex = -1;
  if (screen === 'scriptLoading' || screen === 'scriptReview') phaseIndex = 0;
  else if (screen === 'voiceLoading' || screen === 'voiceReview') phaseIndex = 1;
  else if (screen === 'imagePromptLoading' || screen === 'imagePromptReview') phaseIndex = 2;
  else if (screen === 'imageReview') phaseIndex = 3;
  else if (screen === 'videoSceneLoading' || screen === 'videoSceneReview' || screen === 'videoClipReview') phaseIndex = 4;
  else if (screen === 'finalVideoReview') phaseIndex = 5;
  else if (screen === 'thumbnailLoading' || screen === 'thumbnailReview') phaseIndex = 6;
  else if (screen === 'futurePhase') phaseIndex = 7;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <span className="app-name">Auto Video Generator</span>
          <span className="small-label">AI VIDEO STUDIO</span>
        </div>
      </header>
      
      <main className="main-content">
        {screen === 'form' && (
          <section className="hero-section">
            <h1 className="main-heading">Turn an idea into a talking video.</h1>
            <p className="supporting-text">
              Enter your topic and select a format. We'll generate the script, scenes, voiceover, and captions automatically.
            </p>
          </section>
        )}

        {errorMsg && (
          <div className="alert-banner alert-error animate-fade-in" style={{ marginBottom: '1rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span><strong>Error:</strong> {errorMsg}</span>
          </div>
        )}

        <section className="pipeline-indicator">
          {phases.map((phase, idx) => {
            const isActive = phaseIndex === idx;
            const isCompleted = phaseIndex > idx;
            const label = phase.charAt(0).toUpperCase() + phase.slice(1);
            return (
              <React.Fragment key={phase}>
                <div className={`pipeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  {label}
                </div>
                {idx < phases.length - 1 && (
                  <div className={`pipeline-divider ${isCompleted ? 'completed' : ''}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </section>

        <section className="form-section animate-fade-in" key={screen}>
          {screen === 'form' && (
            <TopicForm 
              initialTopic={topic} 
              initialFormat={format}
              initialScriptInstructions={scriptInstructions}
              onSubmit={(t, f, si) => handleGenerateScript(t, f, si)} 
            />
          )}

          {screen === 'scriptLoading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>Generating Script...</h2>
              <p>Analyzing topic and creating the hook and narration.</p>
            </div>
          )}

          {screen === 'scriptReview' && scriptData && (
            <ScriptReview
              topic={topic}
              format={format}
              script={scriptData}
              onGenerateVoice={handleGenerateVoice}
              onRegenerate={() => handleGenerateScript(topic, format, scriptInstructions, true, scriptData)}
              onBack={() => setScreen('form')}
            />
          )}

          {screen === 'voiceLoading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>Generating AI Voice...</h2>
              <p>Connecting to ElevenLabs to synthesize your narration.</p>
            </div>
          )}

          {screen === 'voiceReview' && audioUrl && (
            <VoiceReview
              audioUrl={audioUrl}
              initialImageInstructions={imageInstructions}
              onRegenerate={() => handleGenerateVoice(scriptData.completeNarration)}
              onContinue={(duration, ii) => handleGenerateImagePrompts(duration, ii)}
              onBack={() => setScreen('scriptReview')}
            />
          )}

          {screen === 'imagePromptLoading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>Generating Image Prompt Master Plan...</h2>
              <p>Designing visual bible, extracting characters and locations, and writing precise image prompts.</p>
            </div>
          )}

          {screen === 'imagePromptReview' && imagePromptPlan && (
            <ImagePromptReview
              topic={topic}
              format={format}
              script={scriptData}
              masterPlan={imagePromptPlan}
              initialVideoInstructions={videoInstructions}
              onApprove={(plan, vi) => handleApproveImagePrompts(plan, vi)}
              onBack={() => setScreen('voiceReview')}
            />
          )}

          {screen === 'sceneLoading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>Generating Scene Plan...</h2>
              <p>Designing visual bible, characters, locations, and structural scenes.</p>
            </div>
          )}


          {screen === 'imageReview' && approvedImagePromptPlan && (
            <ImageGenerationReview
              masterPlan={approvedImagePromptPlan}
              onApprove={handleGenerateVideoScenes}
              onBack={() => setScreen('imagePromptReview')}
            />
          )}

          {screen === 'videoSceneLoading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>Generating Video Scene Motion Plans...</h2>
              <p>Analyzing story continuity and designing motion prompts for each image.</p>
            </div>
          )}

          {screen === 'videoSceneReview' && videoScenePlan && (
            <VideoSceneReview
              topic={topic}
              scriptData={scriptData}
              masterPlan={approvedImagePromptPlan}
              approvedImages={approvedImages}
              videoScenePlan={videoScenePlan}
              onApprove={(plan) => {
                setVideoScenePlan(plan);
                setScreen('videoClipReview');
              }}
              onBack={() => setScreen('imageReview')}
            />
          )}

          {screen === 'videoClipReview' && videoScenePlan && (
            <VideoClipReview
              videoScenePlan={videoScenePlan}
              approvedImages={approvedImages}
              onApproveAll={(clips) => {
                setApprovedVideoClips(clips);
                setScreen('finalVideoReview');
              }}
              onBack={() => setScreen('videoSceneReview')}
            />
          )}

          {screen === 'finalVideoReview' && (
            <FinalVideoReview
              approvedVideoClips={approvedVideoClips}
              audioUrl={audioUrl}
              onBack={() => setScreen('videoClipReview')}
              onComplete={handleFinalReviewComplete}
            />
          )}

          {screen === 'thumbnailLoading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>Designing Thumbnail...</h2>
              <p>Creating a highly engaging, click-optimized thumbnail prompt.</p>
            </div>
          )}

          {screen === 'thumbnailReview' && thumbnailPrompt && (
            <ThumbnailReview
              thumbnailPrompt={thumbnailPrompt}
              onApprove={handleThumbnailGenerated}
              onBack={() => setScreen('videoClipReview')}
            />
          )}

          {screen === 'futurePhase' && (
            <section className="success-section animate-fade-in" style={{ textAlign: 'center', marginTop: '4rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', marginBottom: '1rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2>Video Complete!</h2>
              <p className="supporting-text" style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>
                Your AI-generated video and thumbnail have been successfully created. The final mp4 and image are saved in the backend data folder.
              </p>
              <button className="btn btn-primary" onClick={handleReset}>Create Another Video</button>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
