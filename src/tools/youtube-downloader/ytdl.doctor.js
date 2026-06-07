import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { YTDL_CONFIG } from './ytdl.config.js';

export function checkBinary(name, args = ['--version']) {
  const result = spawnSync(name, args, {
    encoding: 'utf8',
    shell: false
  });

  return {
    name,
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.split('\n')[0] || '',
    stderr: result.stderr?.split('\n')[0] || ''
  };
}

export function runDoctor() {
  const nodeOk = true; // if we are here, node is running
  const ffmpegCheck = checkBinary('ffmpeg', ['-version']);
  
  let ytDlpBackendCheck;
  if (YTDL_CONFIG.backendMode === 'system') {
    ytDlpBackendCheck = checkBinary('yt-dlp');
  } else {
    // If wrapper, youtube-dl-exec installs a binary internally, 
    // but let's check system yt-dlp to see if it's there anyway.
    ytDlpBackendCheck = checkBinary('yt-dlp'); 
  }

  const outputRootPath = path.resolve(YTDL_CONFIG.outputRoot);
  let outputDirectoryWritable = false;
  
  try {
    if (!fs.existsSync(outputRootPath)) {
      fs.mkdirSync(outputRootPath, { recursive: true });
    }
    fs.accessSync(outputRootPath, fs.constants.W_OK);
    outputDirectoryWritable = true;
  } catch (e) {
    outputDirectoryWritable = false;
  }

  return {
    ok: true,
    command: 'yt:doctor',
    node: {
      version: process.version,
      ok: nodeOk
    },
    ffmpeg: ffmpegCheck,
    backendMode: YTDL_CONFIG.backendMode,
    ytdlpSystemAvailable: ytDlpBackendCheck.ok,
    outputDirectoryWritable
  };
}
