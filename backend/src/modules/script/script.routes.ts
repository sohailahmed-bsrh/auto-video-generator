import { Router } from 'express';
import { generateVideoScript } from '../../providers/llm/gemini.provider';

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { topic, format, isRegeneration, previousScript, scriptInstructions } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    // Sanitize user instructions — trim and cap at 800 chars
    const sanitizedInstructions = typeof scriptInstructions === 'string'
      ? scriptInstructions.trim().slice(0, 800)
      : undefined;

    let generatedScript = null;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
        generatedScript = await generateVideoScript(
          topic, 
          format || '9:16', 
          isRegeneration || attempts > 0,
          previousScript,
          sanitizedInstructions
        );
        
        // Ensure completeNarration isn't just an empty string or overly generic
        if (generatedScript.completeNarration.split(' ').length < 20) {
           throw new Error('Script too short');
        }
        
        break; // Success
      } catch (e: any) {
        lastError = e;
        console.warn(`Attempt ${attempts + 1} failed:`, e.message);
        attempts++;
      }
    }

    if (!generatedScript) {
      throw new Error(`Failed to generate script after ${maxAttempts} attempts: ` + (lastError?.message || 'Unknown error'));
    }

    res.json({
      success: true,
      script: generatedScript
    });
  } catch (error: any) {
    console.error('Gemini generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Script generation failed',
      message: error.message || 'Unknown error occurred during AI generation'
    });
  }
});

export default router;
