export type ScholomanceRelease = {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseDate: string;
  audio: {
    duration: string;
    bpm: number;
    key: string;
    genre: string[];
    fileType: string;
    sampleRate: string;
    bitDepth: string;
  };
  commerce: {
    price: string;
    currency: "USD";
    buyEnabled: boolean;
    downloadFormats: string[];
  };
  provenance: {
    humanIntent: string;
    tools: string[];
    assistance: string[];
    masteringChain?: string[];
  };
  bytecode: {
    fingerprint: string;
    checksum: string;
    seed: string;
    glyphcoreVersion: string;
    coordinates: {
      x: number;
      y: number;
      z: number;
    };
    ritualSync: {
      phase: string;
      cycle: string;
      bpm: number;
      key: string;
    };
  };
  semantics: Array<{
    label: string;
    description: string;
    active?: boolean;
  }>;
  lyrics: Array<{
    index: number;
    text: string;
    timestamp?: string;
    semanticTag?: string;
  }>;
};

export type ScholomanceSigilSeed = {
  trackId: string;
  title: string;
  bpm: number;
  key: string;
  semanticTags: string[];
  checksum: string;
};

export type ScholomanceSigilOutput = {
  seed: string;
  polygonSides: number;
  ringCount: number;
  glyphCount: number;
  primaryHue: "magenta" | "cyan" | "amber";
  motionProfile: "still" | "pulse" | "orbit" | "fracture";
};

export type PlayerState = "standby" | "loading" | "playing" | "paused";

export interface VisualizerKitProps {
  release?: ScholomanceRelease;
  isPlaying?: boolean;
  signalLevel?: number;
  volume?: number;
  bpm?: number;
  getByteFrequencyData?: (data: Uint8Array) => void;
  schoolColor?: string;
  schoolId?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
  onVolumeChange?: (v: number) => void;
  onBuy?: () => void;
  onSeek?: (pct: number) => void;
  currentTime?: number;
  duration?: number;
  reducedMotion?: boolean;
}
