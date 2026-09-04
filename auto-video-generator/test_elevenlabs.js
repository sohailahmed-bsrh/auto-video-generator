const fs = require('fs');
const path = require('path');
const https = require('https');

// Read .env directly
const envPath = path.join(__dirname, 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let apiKey = '';
let voiceId = '';
let modelId = 'eleven_multilingual_v2';

envContent.split('\n').forEach(line => {
  if (line.startsWith('ELEVENLABS_API_KEY=')) apiKey = line.split('=')[1].trim();
  if (line.startsWith('ELEVENLABS_VOICE_ID=')) voiceId = line.split('=')[1].trim();
  if (line.startsWith('ELEVENLABS_MODEL_ID=')) modelId = line.split('=')[1].trim();
});

console.log("=========================================");
console.log("ElevenLabs Minimal Diagnostic Request");
console.log("=========================================\n");

console.log(`Using Voice ID: ${voiceId}`);
console.log(`Using Model ID: ${modelId}`);
console.log(`API Key loaded: ${apiKey ? 'YES (hidden)' : 'NO'}`);

const text = "Hello, this is a voice test.";
console.log(`Text character count: ${text.length}`);

const postData = JSON.stringify({
  text: text,
  model_id: modelId
});

const options = {
  hostname: 'api.elevenlabs.io',
  port: 443,
  path: `/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
  method: 'POST',
  headers: {
    'Accept': 'audio/mpeg',
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`\n[HTTP STATUS]: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk.toString();
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log(`[RAW RESPONSE BODY]: ${data}`);
      try {
        const json = JSON.parse(data);
        console.log(`[PARSED DETAIL STATUS]: ${json.detail?.status}`);
        console.log(`[PARSED DETAIL MESSAGE]: ${json.detail?.message}`);
      } catch (e) {
        console.log("Could not parse response as JSON.");
      }
    } else {
      console.log(`[SUCCESS]: Received audio binary. Length: ${data.length} bytes.`);
    }
  });
});

req.on('error', (e) => {
  console.error(`[NETWORK ERROR]: ${e.message}`);
});

req.write(postData);
req.end();
