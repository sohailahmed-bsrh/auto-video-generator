import { Wan27Provider } from './src/providers/video/wan27.provider';
import fs from 'fs';

async function run() {
  try {
    let base64Image = fs.readFileSync('test_image.b64', 'utf8').trim();
    base64Image = base64Image.replace(/[^A-Za-z0-9+/=]/g, '');
    const imageBase64 = `data:image/jpeg;base64,${base64Image}`;
    
    const provider = new Wan27Provider();
    
    console.log('Submitting video job...');
    const job = await provider.submitVideoJob({
      imageBase64,
      motionPrompt: 'Camera pan right slowly over the landscape.',
      duration: 5
    });
    
    console.log(`Job Submitted! Task ID: ${job.jobId}`);
    
    let status = job.status;
    let pollCount = 0;
    
    console.log('Polling for status...');
    while (status !== 'COMPLETED' && status !== 'FAILED') {
      await new Promise(resolve => setTimeout(resolve, 10000));
      pollCount++;
      const currentJob = await provider.checkJobStatus(job.jobId);
      status = currentJob.status;
      console.log(`Poll ${pollCount}: ${status}`);
      
      if (status === 'COMPLETED') {
        console.log('SUCCESS! Video URL:', currentJob.videoUrl);
      } else if (status === 'FAILED') {
        console.log('FAILED! Error:', currentJob.error);
      }
    }
  } catch (err: any) {
    console.error('SCRIPT ERROR:', err.message);
  }
}

run();
