import { YTDL_CONFIG } from './ytdl.config.js';
import { assertDownloadPolicy } from './ytdl.policy.js';
import { normalizeYoutubeUrl } from './ytdl.url.js';
import { resolveOutputDir, createOutputTemplate, ensureDirectory } from './ytdl.paths.js';
import { fetchInfo, downloadMedia } from './ytdl.executor.js';
import { writeManifest } from './ytdl.manifest.js';
import { runDoctor } from './ytdl.doctor.js';
import { YtdlError, YTDL_ERROR_CATEGORIES, YTDL_ERROR_CODES } from './ytdl.errors.js';

export async function executeDoctor(args) {
  return runDoctor();
}

export async function executeInfo(args) {
  const url = normalizeYoutubeUrl(args.url);
  const info = await fetchInfo(url);
  return {
    title: info.title,
    id: info.id,
    duration: info.duration,
    channel: info.channel,
    uploadDate: info.upload_date,
    formatsAvailable: Array.isArray(info.formats) && info.formats.length > 0
  };
}

export async function executeDownload(args, forceProfileName = null) {
  assertDownloadPolicy(args);

  const url = normalizeYoutubeUrl(args.url);
  
  const profileName = forceProfileName || args.profile || (args.mode === 'audio' ? 'audioSource' : 'archive');
  const profile = YTDL_CONFIG.profiles[profileName];

  if (!profile) {
    throw new YtdlError(
      YTDL_ERROR_CATEGORIES.INPUT,
      YTDL_ERROR_CODES.PROFILE_UNKNOWN,
      `Unknown profile specified: ${profileName}`
    );
  }

  const info = await fetchInfo(url);
  
  const outputDir = resolveOutputDir({
    outputRoot: YTDL_CONFIG.outputRoot,
    profile: profileName,
    videoId: info.id
  });

  await ensureDirectory(outputDir);

  const outputTemplate = createOutputTemplate(outputDir);
  
  const downloadOptions = { ...profile, outputTemplate };
  
  if (args.format && profileName === 'audioSource') {
    downloadOptions.audioFormat = args.format;
  }

  await downloadMedia(url, downloadOptions, outputDir);

  const manifest = await writeManifest(outputDir, {
    videoId: info.id,
    url: url,
    licenseDeclaration: args.license,
    profile: profileName,
    toolchain: {
      runner: `npm run yt:${args.mode}`,
      backend: YTDL_CONFIG.backendMode,
      wrapper: "youtube-dl-exec"
    }
  });

  return {
    ok: true,
    videoId: info.id,
    profile: profileName,
    outputDir,
    manifest
  };
}

export async function executeThumbnail(args) {
  return executeDownload(args, 'thumbnail');
}
