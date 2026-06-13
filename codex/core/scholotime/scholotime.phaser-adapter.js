function resolveCameraCue(cue) {
  const p = cue.eased;
  const param = (from, to) => from + (to - from) * p;
  
  return {
    x: param(cue.params.xFrom || 0, cue.params.xTo || 0),
    y: param(cue.params.yFrom || 0, cue.params.yTo || 0),
    zoom: param(cue.params.zoomFrom || 1, cue.params.zoomTo || 1),
    rotation: param(cue.params.rotationFrom || 0, cue.params.rotationTo || 0),
  };
}

function resolveSpriteCue(cue) {
  return {
    id: cue.target,
    progress: cue.progress,
    eased: cue.eased,
    params: cue.params
  };
}

function resolveParticleCue(cue) {
  return {
    id: cue.target,
    progress: cue.progress,
    eased: cue.eased,
    params: cue.params
  };
}

export function createScholoTimePhaserAdapter() {
  return Object.freeze({
    resolveFrame({ project, timeMs, cues, section }) {
      const cameraCue = cues.find((cue) => cue.type === 'phaser.camera');

      return {
        timeMs,
        camera: cameraCue
          ? resolveCameraCue(cameraCue)
          : {
              x: 0,
              y: 0,
              zoom: 1,
              rotation: 0,
            },
        sceneEnergy: section?.energy || 0,
        sprites: cues
          .filter((cue) => cue.type === 'phaser.sprite')
          .map(resolveSpriteCue),
        particles: cues
          .filter((cue) => cue.type === 'phaser.particles')
          .map(resolveParticleCue),
      };
    },
  });
}
