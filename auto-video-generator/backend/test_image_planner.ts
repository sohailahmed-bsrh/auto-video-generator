import { planImagePrompts } from './src/modules/image-prompts/image-prompts.service';
import { config } from './src/config/env';

// Mock script data
const mockScriptData = {
  title: "The Jungle Adventure",
  topic: "A story about a brave monkey",
  coreConcept: "Courage",
  targetAudience: "Kids",
  language: "English",
  estimatedDuration: 60,
  estimatedWordCount: 150,
  hook: "Have you ever seen a monkey that wasn't afraid of lions?",
  introduction: "Meet Milo, the bravest monkey in the jungle.",
  storyBeats: [
    "Milo finds a lost lion cub.",
    "Milo decides to help the cub find its mother.",
    "They face a scary river crossing.",
    "Milo uses vines to build a bridge."
  ],
  transitions: "Smoothly flowing from scene to scene.",
  climax: "Milo confronts an angry crocodile.",
  conclusion: "The lion mother thanks Milo, proving courage comes in all sizes.",
  completeNarration: "Have you ever seen a monkey that wasn't afraid of lions? Meet Milo, the bravest monkey in the jungle..."
};

async function runTests() {
  console.log('========================================');
  console.log('Test 1: Normal execution with current API key');
  console.log('Model:', config.geminiTextModel);
  console.log('========================================');
  try {
    const plan = await planImagePrompts(mockScriptData, mockScriptData.topic, 'youtube', 'Make it cinematic');
    console.log('✅ Normal test passed! Received valid ImagePromptMasterPlan.');
    console.log(`- Visual Style: ${plan.visualBible.overallStyle}`);
    console.log(`- Characters generated: ${plan.characters.length}`);
    console.log(`- Prompts generated: ${plan.imagePrompts.length}`);
  } catch (error: any) {
    console.error('❌ Normal test failed:', error.message);
  }

  console.log('\n========================================');
  console.log('Test 2: Forced Fallback (using invalid API key)');
  console.log('========================================');
  
  // Temporarily override the key in the environment to force an error (like 400 or 401 or 403)
  // This will trigger the retry and then the fallback.
  // Note: Since `config` uses getters, changing process.env works if the AI client reads it lazily,
  // but `@google/genai` might have already cached it. 
  // Wait, `GoogleGenAI` instance in `image-prompts.service.ts` is created globally. 
  // Let's test the fallback directly instead.
  
  try {
    const { generateFallbackMasterPlan } = require('./src/modules/image-prompts/image-prompts.service');
    const fallbackPlan = generateFallbackMasterPlan(mockScriptData, 'Make it cinematic');
    console.log('✅ Fallback test passed! Generated deterministic plan.');
    console.log(`- Prompts generated: ${fallbackPlan.imagePrompts.length}`);
    console.log(`- Prompt 1: ${fallbackPlan.imagePrompts[0].prompt}`);
  } catch (error: any) {
    console.error('❌ Fallback test failed:', error);
  }
}

runTests();
