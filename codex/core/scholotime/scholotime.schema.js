import { SCHOLOTIME_PROJECT_SCHEMA_VERSION, SCHOLOTIME_ERROR_CODES } from './scholotime.constants.js';
import { createScholoTimeError } from './scholotime.errors.js';

export function validateScholoTimeProject(project) {
  if (!project || project.schemaVersion !== SCHOLOTIME_PROJECT_SCHEMA_VERSION) {
    throw createScholoTimeError(SCHOLOTIME_ERROR_CODES.INVALID_PROJECT, { project });
  }

  if (typeof project.timing?.fps !== 'number' || project.timing.fps <= 0) {
    throw createScholoTimeError(SCHOLOTIME_ERROR_CODES.INVALID_FPS, { fps: project.timing?.fps });
  }

  if (typeof project.timing?.bpm !== 'number' || project.timing.bpm <= 0) {
    throw createScholoTimeError(SCHOLOTIME_ERROR_CODES.INVALID_BPM, { bpm: project.timing?.bpm });
  }

  if (typeof project.timing?.durationMs !== 'number' || project.timing.durationMs <= 0) {
    throw createScholoTimeError(SCHOLOTIME_ERROR_CODES.INVALID_DURATION, { durationMs: project.timing?.durationMs });
  }

  if (project.cues) {
    for (const cue of project.cues) {
      if (cue.endMs < cue.startMs) {
        throw createScholoTimeError(SCHOLOTIME_ERROR_CODES.CUE_RANGE_INVALID, { cueId: cue.id, startMs: cue.startMs, endMs: cue.endMs });
      }
      if (!cue.target) {
        throw createScholoTimeError(SCHOLOTIME_ERROR_CODES.CUE_TARGET_MISSING, { cueId: cue.id });
      }
    }
  }

  return true;
}
