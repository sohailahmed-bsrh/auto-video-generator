import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import crypto from 'crypto';

// Provide the path to the ffmpeg executable to fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface AssemblyOptions {
  videoUrls: string[]; // List of URLs (usually DashScope OSS/HTTP URLs)
  audioPath?: string;  // Absolute or relative path to the local audio file
}

export interface AssemblyResult {
  finalVideoUrl: string; // The URL to access the final video
}

export class VideoAssemblyService {
  private tempDir: string;
  private outputDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'data', 'temp');
    this.outputDir = path.join(process.cwd(), 'data', 'videos');

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Downloads a file from an external URL to the temp directory.
   */
  private async downloadFile(url: string, prefix: string, extension: string): Promise<string> {
    const filename = `${prefix}_${crypto.randomBytes(4).toString('hex')}${extension}`;
    const filePath = path.join(this.tempDir, filename);

    console.log(`[Assembly] Downloading ${url} to ${filePath}...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download clip ${url}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    return filePath;
  }

  /**
   * Cleans up temporary files.
   */
  private cleanupFiles(files: string[]) {
    for (const file of files) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (e) {
        console.warn(`[Assembly] Failed to clean up temp file: ${file}`, e);
      }
    }
  }

  /**
   * Assembles multiple video clips into a single video, optionally adding an audio track.
   */
  public async assembleVideo(options: AssemblyOptions): Promise<AssemblyResult> {
    if (!options.videoUrls || options.videoUrls.length === 0) {
      throw new Error('No video URLs provided for assembly.');
    }

    const tempVideoPaths: string[] = [];
    const assemblyVideoPaths: string[] = [];
    const outputFilename = `final_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp4`;
    const outputPath = path.join(this.outputDir, outputFilename);
    const listFilePath = path.join(this.tempDir, `list_${Date.now()}.txt`);

    try {
      // 1. Download all video clips or use local ones
      console.log(`[Assembly] Preparing ${options.videoUrls.length} clips...`);
      for (let i = 0; i < options.videoUrls.length; i++) {
        const url = options.videoUrls[i];
        
        if (url.startsWith('/api/media/videos/')) {
          const filename = url.replace('/api/media/videos/', '');
          const localPath = path.join(this.outputDir, filename);
          if (fs.existsSync(localPath)) {
            console.log(`[Assembly] Using local clip: ${localPath}`);
            assemblyVideoPaths.push(localPath);
            continue;
          }
        }

        const tempPath = await this.downloadFile(url, `scene_${i + 1}`, '.mp4');
        tempVideoPaths.push(tempPath);
        assemblyVideoPaths.push(tempPath);
      }

      // 2. Create the ffmpeg concat demuxer text file
      // Format: file '/absolute/path/to/file1.mp4'
      const listContent = assemblyVideoPaths
        .map(p => `file '${p.replace(/'/g, "'\\''")}'`)
        .join('\n');
      fs.writeFileSync(listFilePath, listContent);

      // 3. Run ffmpeg to merge
      console.log('[Assembly] Beginning ffmpeg merge process...');
      
      await new Promise<void>((resolve, reject) => {
        let command = ffmpeg()
          // Use concat demuxer to efficiently merge videos with same codecs
          .input(listFilePath)
          .inputOptions(['-f concat', '-safe 0']);

        // Add audio if provided
        if (options.audioPath && fs.existsSync(options.audioPath)) {
          command = command
            .input(options.audioPath)
            // Shortest stream determines length (clip length vs audio length)
            .outputOptions([
              '-map 0:v', 
              '-map 1:a?',   // ? means optional, in case audio stream is weird
              '-c:v copy',   // Copy video codec to avoid re-encoding
              '-c:a aac',    // Re-encode audio to aac for max compatibility
              '-shortest'    // End when the shortest stream ends
            ]);
        } else {
           // No audio track, just copy video
           command = command.outputOptions([
              '-c:v copy'
           ]);
        }

        command
          .on('start', (cmdLine) => {
             console.log('[Assembly] FFmpeg started:', cmdLine);
          })
          .on('error', (err) => {
             console.error('[Assembly] FFmpeg Error:', err.message);
             reject(new Error(`Video Assembly failed: ${err.message}`));
          })
          .on('end', () => {
             console.log('[Assembly] FFmpeg assembly completed successfully.');
             resolve();
          })
          .save(outputPath);
      });

      return {
        finalVideoUrl: `/api/media/videos/${outputFilename}`
      };

    } catch (error) {
       console.error('[Assembly] Process failed:', error);
       throw error;
    } finally {
       // Cleanup temp videos and list file
       this.cleanupFiles([...tempVideoPaths, listFilePath]);
    }
  }
}
