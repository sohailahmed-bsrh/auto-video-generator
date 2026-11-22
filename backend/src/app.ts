import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes';
import scriptRoutes from './modules/script/script.routes';
import audioRoutes from './modules/audio/audio.routes';
import imagePromptRoutes from './modules/image-prompts/image-prompts.routes';
import imageRoutes from './modules/images/image.routes';
import videoSceneRoutes from './modules/video-scenes/video-scene.routes';
import videoRoutes from './modules/video/video.routes';
import thumbnailRoutes from './modules/thumbnail/thumbnail.routes';
import { config } from './config/env';
import path from 'path';

const app = express();

app.use((req, res, next) => {
  console.log(`[BACKEND DEBUG] Incoming Request: ${req.method} ${req.url} from origin ${req.headers.origin}`);
  next();
});

const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173', 
  'http://localhost:5174', 
  'http://127.0.0.1:5174',
  config.frontendUrl
];

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Increase limit for base64-encoded image payloads (each image can be 2-5MB)
app.use(express.json({ limit: '50mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/image-prompts', imagePromptRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/video-scenes', videoSceneRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/thumbnail', thumbnailRoutes);

// Serve static files from the data directory
app.use('/api/media/images', express.static(path.join(process.cwd(), 'data', 'images')));
app.use('/api/media/videos', express.static(path.join(process.cwd(), 'data', 'videos')));
app.use('/api/media/audio', express.static(path.join(process.cwd(), 'data', 'audio')));
app.use('/api/media/thumbnails', express.static(path.join(process.cwd(), 'data', 'thumbnails')));

export default app;
