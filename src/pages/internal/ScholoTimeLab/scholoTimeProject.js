const DEFAULT_PROJECT_ID = "scholotime-local-project";
const DEFAULT_FPS = 60;
const DEFAULT_BPM = 120;
const DEFAULT_DURATION_MS = 30000;
const DEFAULT_TIME_SIGNATURE = [4, 4];

function toFiniteNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeTimeMs(value, fallback = 0) {
  return Math.max(0, toFiniteNumber(value, fallback));
}

function normalizeDurationMs(value, fallback = DEFAULT_DURATION_MS) {
  return Math.max(1000, toFiniteNumber(value, fallback));
}

function normalizeLyric(rawLyric, index, timing) {
  const startMs = normalizeTimeMs(rawLyric.startMs ?? rawLyric.start ?? rawLyric.timeMs ?? rawLyric.time, 0);
  const endMs = normalizeTimeMs(
    rawLyric.endMs ?? rawLyric.end ?? startMs + toFiniteNumber(rawLyric.durationMs, 1800),
    startMs + 1800,
  );

  return {
    id: String(rawLyric.id || `lyric-${index}`),
    text: String(rawLyric.text || rawLyric.label || `Beat ${index + 1}`),
    startMs,
    endMs: Math.min(Math.max(endMs, startMs + 1), timing.durationMs),
    weight: Math.max(0.1, toFiniteNumber(rawLyric.weight ?? rawLyric.energy, 1)),
  };
}

function normalizeCue(rawCue, index, timing) {
  const startMs = normalizeTimeMs(rawCue.startMs ?? rawCue.start ?? rawCue.timeMs ?? rawCue.time, 0);
  const endMs = normalizeTimeMs(
    rawCue.endMs ?? rawCue.end ?? startMs + toFiniteNumber(rawCue.durationMs, 1000),
    startMs + 1000,
  );

  return {
    id: String(rawCue.id || `cue-${index}`),
    type: String(rawCue.type || "WORD_IMPACT"),
    target: String(rawCue.target || rawCue.lyricId || rawCue.label || "active"),
    startMs,
    endMs: Math.min(Math.max(endMs, startMs + 1), timing.durationMs),
    easing: String(rawCue.easing || "easeOutCubic"),
    params: rawCue.params && typeof rawCue.params === "object" ? rawCue.params : {},
  };
}

function beatMapToProject(raw, durationMs, audioFileName) {
  const beats = Array.isArray(raw?.beats) ? raw.beats : [];
  const bpm = toFiniteNumber(raw?.bpm ?? raw?.timing?.bpm, DEFAULT_BPM);
  const fps = toFiniteNumber(raw?.fps ?? raw?.timing?.fps, DEFAULT_FPS);
  const projectDurationMs = normalizeDurationMs(
    raw?.durationMs ?? raw?.timing?.durationMs ?? durationMs * 1000,
    DEFAULT_DURATION_MS,
  );
  const timing = {
    fps,
    bpm,
    durationMs: projectDurationMs,
    offsetMs: normalizeTimeMs(raw?.offsetMs ?? raw?.timing?.offsetMs, 0),
    timeSignature: raw?.timeSignature || raw?.timing?.timeSignature || DEFAULT_TIME_SIGNATURE,
  };

  const lyrics = beats.map((beat, index) => {
    const timeMs = normalizeTimeMs((beat.timeMs ?? beat.time ?? index * 0.5) * (beat.timeMs == null ? 1000 : 1), 0);
    return normalizeLyric(
      {
        id: beat.id || `beat-${index}`,
        text: beat.label || beat.text || `${index + 1}`,
        startMs: timeMs,
        endMs: timeMs + toFiniteNumber(beat.durationMs, 900),
        weight: beat.energy || 1,
      },
      index,
      timing,
    );
  });

  const cues = beats.map((beat, index) => {
    const timeMs = normalizeTimeMs((beat.timeMs ?? beat.time ?? index * 0.5) * (beat.timeMs == null ? 1000 : 1), 0);
    return normalizeCue(
      {
        id: `impact-${beat.id || index}`,
        type: index % 4 === 3 ? "LYRIC_GATE_OPEN" : "WORD_IMPACT",
        target: beat.id || `beat-${index}`,
        startMs: Math.max(0, timeMs - 220),
        endMs: timeMs + 680,
        params: { intensity: beat.energy || 1 },
      },
      index,
      timing,
    );
  });

  return {
    schemaVersion: "ScholoTimeProject.v1",
    projectId: String(raw?.projectId || DEFAULT_PROJECT_ID),
    timing,
    audio: {
      sourceId: raw?.audio?.sourceId || audioFileName || null,
      fileName: audioFileName || raw?.audio?.fileName || null,
    },
    sections: Array.isArray(raw?.sections)
      ? raw.sections
      : [{ id: "maze-prime", startMs: 0, endMs: projectDurationMs, energy: 0.72 }],
    lyrics,
    cues,
    visualTracks: raw?.visualTracks || [],
  };
}

export function normalizeScholoTimeProject(raw, { duration = 0, audioFileName = null } = {}) {
  if (raw?.schemaVersion === "ScholoTimeProject.v1") {
    const timing = {
      fps: toFiniteNumber(raw.timing?.fps, DEFAULT_FPS),
      bpm: toFiniteNumber(raw.timing?.bpm, DEFAULT_BPM),
      durationMs: normalizeDurationMs(raw.timing?.durationMs ?? duration * 1000, DEFAULT_DURATION_MS),
      offsetMs: normalizeTimeMs(raw.timing?.offsetMs, 0),
      timeSignature: raw.timing?.timeSignature || DEFAULT_TIME_SIGNATURE,
    };

    return {
      ...raw,
      projectId: String(raw.projectId || DEFAULT_PROJECT_ID),
      timing,
      audio: {
        ...(raw.audio || {}),
        sourceId: raw.audio?.sourceId || audioFileName || null,
        fileName: audioFileName || raw.audio?.fileName || null,
      },
      sections: Array.isArray(raw.sections) && raw.sections.length
        ? raw.sections
        : [{ id: "maze-prime", startMs: 0, endMs: timing.durationMs, energy: 0.72 }],
      lyrics: Array.isArray(raw.lyrics) ? raw.lyrics.map((lyric, index) => normalizeLyric(lyric, index, timing)) : [],
      cues: Array.isArray(raw.cues) ? raw.cues.map((cue, index) => normalizeCue(cue, index, timing)) : [],
      visualTracks: raw.visualTracks || [],
    };
  }

  return beatMapToProject(raw || {}, duration, audioFileName);
}

export function createDefaultScholoTimeProject({ duration = 0, audioFileName = null } = {}) {
  return normalizeScholoTimeProject(
    {
      schemaVersion: "ScholoTimeProject.v1",
      projectId: DEFAULT_PROJECT_ID,
      timing: {
        fps: DEFAULT_FPS,
        bpm: DEFAULT_BPM,
        durationMs: duration ? Math.ceil(duration * 1000) : DEFAULT_DURATION_MS,
        offsetMs: 0,
        timeSignature: DEFAULT_TIME_SIGNATURE,
      },
      sections: [{ id: "maze-prime", startMs: 0, endMs: duration ? Math.ceil(duration * 1000) : DEFAULT_DURATION_MS, energy: 0.72 }],
      lyrics: [
        { id: "seed-1", text: "SCHOLO", startMs: 0, endMs: 1800, weight: 1 },
        { id: "seed-2", text: "TIME", startMs: 1800, endMs: 3600, weight: 1.2 },
        { id: "seed-3", text: "MAZE", startMs: 3600, endMs: 5400, weight: 1.1 },
      ],
      cues: [
        { id: "gate-1", type: "LYRIC_GATE_OPEN", target: "seed-1", startMs: 0, endMs: 1200, easing: "easeOutCubic", params: { intensity: 1 } },
        { id: "turn-1", type: "CAMERA_TURN_RIGHT", target: "camera", startMs: 3600, endMs: 4600, easing: "easeInOutCubic", params: { intensity: 1 } },
      ],
      visualTracks: [],
    },
    { duration, audioFileName },
  );
}

export function timeToFrameIndex(timeSeconds, fps) {
  return Math.max(0, Math.floor(toFiniteNumber(timeSeconds, 0) * toFiniteNumber(fps, DEFAULT_FPS)));
}

