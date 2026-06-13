export function createExportPlan(project) {
  const totalFrames = Math.ceil(project.timing.durationMs / (1000 / project.timing.fps));

  return Object.freeze({
    schemaVersion: 'ScholoTimeExportPlan.v1',
    projectId: project.projectId,
    fps: project.timing.fps,
    durationMs: project.timing.durationMs,
    totalFrames,
    framePattern: 'frame_%06d.png',
    audioSourceId: project.audio?.sourceId || null,
  });
}
