import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required for voice generation' });
    }

    const apiKey = config.elevenlabsApiKey;
    const voiceId = config.elevenlabsVoiceId;
    const modelId = config.elevenlabsModelId;

    if (!apiKey || !voiceId) {
      return res.status(500).json({ success: false, error: 'ElevenLabs configuration missing' });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      })
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      
      console.error('[ElevenLabs API Error]', {
        status: response.status,
        endpoint: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        model_id: modelId,
        voiceId: voiceId,
        errorData: errorData
      });

      const errorCode = errorData?.detail?.code || errorData?.detail?.status;
      const upstreamMessage = errorData?.detail?.message || errorData?.message || response.statusText;
      let safeErrorMessage = upstreamMessage;
      
      if (errorCode === 'quota_exceeded') {
        safeErrorMessage = `ElevenLabs quota/credits exhausted. ${upstreamMessage}`;
      } else if (response.status === 401) {
        safeErrorMessage = 'ElevenLabs authentication failed (invalid API key)';
      } else if (response.status === 429) {
        safeErrorMessage = 'ElevenLabs rate limit exceeded';
      } else if (response.status === 400) {
        safeErrorMessage = `Invalid voice configuration or request: ${upstreamMessage}`;
      }

      return res.status(response.status).json({
        success: false,
        error: safeErrorMessage,
        source: 'elevenlabs',
        httpStatus: response.status,
        code: errorCode,
        type: errorData?.detail?.type || 'unknown_error',
        providerMessage: upstreamMessage,
        requestId: errorData?.detail?.request_id
      });
    }

    const audioBuffer = await response.arrayBuffer();

    // Save locally for later assembly
    const tempDir = path.join(process.cwd(), 'data', 'audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filename = `voiceover_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    fs.writeFileSync(path.join(tempDir, filename), Buffer.from(audioBuffer));

    return res.json({
      success: true,
      audioUrl: `/api/media/audio/${filename}`
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Audio generation failed',
      message: error.message
    });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required for voice test' });
    }

    const apiKey = config.elevenlabsApiKey;
    const voiceId = config.elevenlabsVoiceId;
    const modelId = config.elevenlabsModelId;

    if (!apiKey || !voiceId) {
      return res.status(500).json({ success: false, error: 'ElevenLabs configuration missing' });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      })
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      
      console.error('[ElevenLabs API Test Error]', {
        status: response.status,
        endpoint: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        model_id: modelId,
        voiceId: voiceId,
        errorData: errorData
      });

      const errorCode = errorData?.detail?.code || errorData?.detail?.status;
      const upstreamMessage = errorData?.detail?.message || errorData?.message || response.statusText;
      let safeErrorMessage = upstreamMessage;
      
      if (errorCode === 'quota_exceeded') {
        safeErrorMessage = `ElevenLabs quota/credits exhausted. ${upstreamMessage}`;
      } else if (response.status === 401 || response.status === 403) {
        safeErrorMessage = 'ElevenLabs authentication failed (invalid API key or permissions)';
      } else if (response.status === 429) {
        safeErrorMessage = 'ElevenLabs rate limit exceeded';
      } else if (response.status === 400) {
        safeErrorMessage = `Invalid voice configuration or request: ${upstreamMessage}`;
      }

      return res.status(response.status).json({
        success: false,
        error: safeErrorMessage,
        source: 'elevenlabs',
        httpStatus: response.status,
        code: errorCode,
        type: errorData?.detail?.type || 'unknown_error',
        providerMessage: upstreamMessage,
        requestId: errorData?.detail?.request_id
      });
    }

    const audioBuffer = await response.arrayBuffer();

    // Save locally
    const tempDir = path.join(process.cwd(), 'data', 'audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const filename = `test_voiceover_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    fs.writeFileSync(path.join(tempDir, filename), Buffer.from(audioBuffer));

    return res.json({
      success: true,
      audioUrl: `/api/media/audio/${filename}`,
      metadata: {
        voiceId,
        modelId
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Audio generation failed',
      message: error.message
    });
  }
});

export default router;
