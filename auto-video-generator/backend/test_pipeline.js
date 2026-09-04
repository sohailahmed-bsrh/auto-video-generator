const { generateVideoScript } = require('./dist/providers/llm/gemini.provider');
const { planImagePrompts, planThumbnailPrompt } = require('./dist/modules/image-prompts/image-prompts.service');

async function runTest() {
  const topic = "Dukan Wala";
  const format = "youtube";

  console.log("Generating Script for topic:", topic);
  const script = await generateVideoScript(topic, format);
  console.log("--- SCRIPT EXTRACT ---");
  console.log("Title:", script.title);
  console.log("Hook:", script.hook);
  console.log("Narration snippet:", script.completeNarration.substring(0, 150) + "...");
  console.log("----------------------\n");

  console.log("Generating Image Prompt Master Plan...");
  const masterPlan = await planImagePrompts(script, topic, format);
  console.log("--- CHARACTER BIBLE ---");
  console.log(JSON.stringify(masterPlan.characters, null, 2));
  console.log("----------------------\n");

  console.log("--- IMAGE PROMPTS ---");
  masterPlan.imagePrompts.forEach((p, idx) => {
    console.log(`Scene ${p.sceneNumber}:`, p.prompt);
  });
  console.log("---------------------\n");

  console.log("Generating Thumbnail Prompt...");
  const thumbnailPrompt = await planThumbnailPrompt(topic, masterPlan);
  console.log("--- THUMBNAIL PROMPT ---");
  console.log(thumbnailPrompt);
  console.log("------------------------");
}

runTest().catch(console.error);
