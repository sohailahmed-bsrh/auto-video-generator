import { Router, Request, Response } from 'express';
import { generateImageFromPrompt } from './image-generation.service';
import { ImagePromptMasterPlan, ImagePromptPlan } from '../image-prompts/image-prompts.service';

const router = Router();

router.post('/generate-single', async (req: Request, res: Response): Promise<void> => {
  try {
    const { promptPlan, masterPlan, attempt } = req.body;

    if (!promptPlan || !masterPlan) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: promptPlan or masterPlan' 
      });
      return;
    }

    // 1. Generate Image
    const generatedImage = await generateImageFromPrompt(
      promptPlan as ImagePromptPlan, 
      masterPlan as ImagePromptMasterPlan, 
      attempt || 1
    );

    if (generatedImage.generationStatus === 'failed') {
      res.status(500).json({
        success: false,
        image: generatedImage,
        error: generatedImage.error
      });
      return;
    }

    res.json({
      success: true,
      image: generatedImage
    });
  } catch (error: any) {
    console.error('Image Generation API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Image generation failed',
      message: error.message
    });
  }
});

export default router;
