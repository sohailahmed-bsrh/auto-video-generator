import { Router, Request, Response } from 'express';
import { QwenImageProvider } from '../../providers/image/qwen-image.provider';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const qwenProvider = new QwenImageProvider();

const THUMBNAILS_DIR = path.join(process.cwd(), 'data', 'thumbnails');

// Ensure directory exists
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required field: prompt' 
      });
      return;
    }

    if (!qwenProvider.isAvailable()) {
       res.status(500).json({
         success: false,
         error: 'Qwen Image API is not configured or unavailable.'
       });
       return;
    }

    // 1. Generate Thumbnail using Qwen
    const result = await qwenProvider.generateImage({
      prompt: prompt,
      aspectRatio: '16:9', // Thumbnails are always 16:9 usually, or we can just default to 16:9
      outputFormat: 'jpeg'
    });

    // 2. Save image to disk instead of returning raw base64 (since thumbnails are final outputs)
    const fileName = `thumbnail_${crypto.randomUUID()}.jpg`;
    const filePath = path.join(THUMBNAILS_DIR, fileName);
    
    fs.writeFileSync(filePath, result.imageBuffer);

    res.json({
      success: true,
      thumbnailUrl: `/thumbnails/${fileName}` // Served via static mount
    });
  } catch (error: any) {
    console.error('Thumbnail Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Thumbnail generation failed',
      message: error.message
    });
  }
});

export default router;
