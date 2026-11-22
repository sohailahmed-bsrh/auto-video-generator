import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export const requireEnv = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const optionalEnv = (key: string, fallback: string = ''): string => {
  return process.env[key]?.trim() || fallback;
};

export const config = {
  // LLM — Gemini
  get geminiApiKey() { return requireEnv('GEMINI_API_KEY'); },
  get geminiTextModel() { return optionalEnv('GEMINI_TEXT_MODEL', 'gemini-3.6-flash'); },
  get geminiImageModel() { return optionalEnv('GEMINI_IMAGE_MODEL', 'imagen-3.0-generate-002'); },

  // TTS — ElevenLabs
  get elevenlabsApiKey() { return requireEnv('ELEVENLABS_API_KEY'); },
  get elevenlabsVoiceId() { return requireEnv('ELEVENLABS_VOICE_ID'); },
  get elevenlabsModelId() { return optionalEnv('ELEVENLABS_MODEL_ID', 'eleven_multilingual_v2'); },

  // Image — Cloudflare
  get cloudflareApiToken() { return requireEnv('CLOUDFLARE_API_TOKEN'); },
  get cloudflareAccountId() { return requireEnv('CLOUDFLARE_ACCOUNT_ID'); },
  get cloudflareImageModel() { return optionalEnv('CLOUDFLARE_IMAGE_MODEL', '@cf/black-forest-labs/flux-1-schnell'); },

  // Video — Wan 2.7 & Qwen Image (Alibaba / DashScope)
  get videoProvider() { return optionalEnv('VIDEO_PROVIDER', 'DISABLED').toUpperCase(); },
  get wanApiKey() { return optionalEnv('WAN_API_KEY', ''); },
  get qwenApiKey() { return optionalEnv('QWEN_API_KEY', optionalEnv('WAN_API_KEY', '')); }, // Fallback to WAN key if Qwen key not explicitly set

  // Server
  get frontendUrl() { return optionalEnv('FRONTEND_URL', 'http://localhost:5173'); },
  get port() { return parseInt(optionalEnv('PORT', '5000'), 10); },
  get nodeEnv() { return optionalEnv('NODE_ENV', 'development'); },
};
