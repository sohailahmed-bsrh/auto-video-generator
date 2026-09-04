import { Router, Request, Response } from 'express';
import { planImagePrompts, regenerateSinglePrompt, planThumbnailPrompt } from './image-prompts.service';
import { resetBatchCircuitBreaker } from '../images/image-generation.service';

const router = Router();

router.post('/plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { script, topic, format, imageInstructions } = req.body;

    if (!script || !topic || !format) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: script, topic, format' 
      });
      return;
    }

    // Sanitize user instructions (allow up to 20000 chars to avoid arbitrarily cutting off long detailed prompts, while preventing abuse)
    const sanitizedInstructions = typeof imageInstructions === 'string'
      ? imageInstructions.trim().slice(0, 20000)
      : undefined;

    const imagePromptPlan = await planImagePrompts(script, topic, format, sanitizedInstructions);

    // Reset circuit breaker so if they try to generate images for this plan, Cloudflare gets a fresh attempt
    resetBatchCircuitBreaker();

    res.json({
      success: true,
      imagePromptPlan
    });
  } catch (error: any) {
    console.error('Image Prompt Planning Error:', error);
    let parsedError: any = null;
    try {
      parsedError = JSON.parse(error.message);
    } catch {
      // Not JSON
    }

    if (parsedError && parsedError.diagnostic) {
      res.status(500).json({
        success: false,
        error: parsedError.message,
        diagnostic: parsedError.diagnostic
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Image Prompt Planning failed',
        message: error.message
      });
    }
  }
});

router.post('/regenerate-single', async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, script, masterPlan, targetPromptId } = req.body;

    if (!topic || !script || !masterPlan || !targetPromptId) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: topic, script, masterPlan, targetPromptId' 
      });
      return;
    }

    const updatedPrompt = await regenerateSinglePrompt(topic, script, masterPlan, targetPromptId);

    res.json({
      success: true,
      prompt: updatedPrompt
    });
  } catch (error: any) {
    console.error('Single Image Prompt Regeneration Error:', error);
    res.status(500).json({
      success: false,
      error: 'Image Prompt Regeneration failed',
      message: error.message
    });
  }
});

router.post('/thumbnail-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, masterPlan } = req.body;

    if (!topic || !masterPlan) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: topic, masterPlan' 
      });
      return;
    }

    const thumbnailPrompt = await planThumbnailPrompt(topic, masterPlan);

    res.json({
      success: true,
      thumbnailPrompt
    });
  } catch (error: any) {
    console.error('Thumbnail Prompt Planning Error:', error);
    res.status(500).json({
      success: false,
      error: 'Thumbnail Prompt Planning failed',
      message: error.message
    });
  }
});

export default router;
