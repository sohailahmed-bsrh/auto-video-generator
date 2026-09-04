import { generateVideoScenePlan } from './src/modules/video-scenes/video-scene.service';

const dummyImages = Array.from({length: 7}).map((_, i) => ({
  id: `img_${i+1}`,
  sceneNumber: i+1,
  promptUsed: { narration: "Test narration" }
}));

async function run() {
  try {
    console.log("Testing generateVideoScenePlan...");
    const plan = await generateVideoScenePlan(
      "Lion story",
      { hook: "test", completeNarration: "This is a test of the lion story.", segments: [] },
      {}, // master plan
      dummyImages,
      30, // audio duration
      ""
    );
    console.log("SUCCESS:", JSON.stringify(plan, null, 2));
  } catch (err) {
    console.error("FAILED:", err);
  }
}
run();
