import express from 'express';
import { generateVideoScenePlan, regenerateVideoScene } from './video-scene.service';

const router = express.Router();

router.post('/plan', async (req, res) => {
  try {
    const { topic, scriptData, masterPlan, approvedImages, audioDuration, videoInstructions } = req.body;
    
    if (!topic || !scriptData || !approvedImages || !audioDuration) {
      return res.status(400).json({ success: false, error: 'Missing required parameters for video scene planning.' });
    }

    // Sanitize user instructions
    const sanitizedInstructions = typeof videoInstructions === 'string'
      ? videoInstructions.trim().slice(0, 800)
      : undefined;

    const videoScenePlan = await generateVideoScenePlan(topic, scriptData, masterPlan, approvedImages, audioDuration, sanitizedInstructions);
    
    res.json({ success: true, videoScenePlan });
  } catch (error: any) {
    console.error('Video Scene Planning Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/plan/regenerate-scene', async (req, res) => {
  try {
    const { topic, scriptData, masterPlan, approvedImages, sceneIndexToRegenerate, existingPlan } = req.body;
    
    if (sceneIndexToRegenerate === undefined || !existingPlan) {
      return res.status(400).json({ success: false, error: 'Missing required parameters for scene regeneration.' });
    }

    const regeneratedScene = await regenerateVideoScene(topic, scriptData, masterPlan, approvedImages, sceneIndexToRegenerate, existingPlan);
    
    res.json({ success: true, regeneratedScene });
  } catch (error: any) {
    console.error('Video Scene Regeneration Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
