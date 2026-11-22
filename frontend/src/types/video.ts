export type OutputFormat = 'tiktok' | 'reels' | 'youtube' | 'square';

export interface FormatOption {
  id: OutputFormat;
  label: string;
  resolution: string;
  ratio: string;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'tiktok', label: 'TikTok / YouTube Shorts', resolution: '1080 × 1920', ratio: '9:16' },
  { id: 'reels', label: 'Instagram / Facebook Reels', resolution: '1080 × 1920', ratio: '9:16' },
  { id: 'youtube', label: 'YouTube Video', resolution: '1920 × 1080', ratio: '16:9' },
  { id: 'square', label: 'Square Social Post', resolution: '1080 × 1080', ratio: '1:1' },
];
