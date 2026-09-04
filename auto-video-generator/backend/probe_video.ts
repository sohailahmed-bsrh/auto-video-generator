import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const videoPath = path.join(process.cwd(), 'data', 'temp', 'wan_test_1788058080616.mp4');

ffmpeg.ffprobe(videoPath, (err, metadata) => {
  if (err) {
    console.error("FFprobe error:", err);
  } else {
    console.log("Video format:", metadata.format.format_name);
    console.log("Duration:", metadata.format.duration);
    console.log("Bitrate:", metadata.format.bit_rate);
    const vStream = metadata.streams.find(s => s.codec_type === 'video');
    if (vStream) {
      console.log("Codec:", vStream.codec_name);
      console.log("Resolution:", `${vStream.width}x${vStream.height}`);
    }
  }
});
