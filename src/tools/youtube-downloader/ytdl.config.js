export const YTDL_CONFIG = Object.freeze({
  outputRoot: 'media/youtube',
  backendMode: 'wrapper', // 'wrapper' | 'system'
  allowedHosts: new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be'
  ]),
  allowedLicenses: new Set([
    'own-content',
    'creative-commons',
    'public-domain',
    'written-permission'
  ]),
  profiles: Object.freeze({
    archive: {
      format: 'bv*+ba/b',
      remuxVideo: 'mp4',
      writeInfoJson: true,
      writeThumbnail: true,
      embedMetadata: true
    },
    preview: {
      format: 'b[height<=720]/b',
      remuxVideo: 'mp4',
      writeInfoJson: true,
      writeThumbnail: false,
      embedMetadata: false
    },
    audioSource: {
      extractAudio: true,
      audioFormat: 'wav',
      writeInfoJson: true,
      writeThumbnail: true,
      embedMetadata: true
    },
    thumbnail: {
      skipDownload: true,
      writeInfoJson: true,
      writeThumbnail: true,
      embedMetadata: false
    }
  })
});
