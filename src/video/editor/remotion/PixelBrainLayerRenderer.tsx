/* eslint-disable react/no-unknown-property */
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';

// Stub for actual pixel brain lattice geometry rendering
function LatticeGeometry({ timeOverride }: { timeOverride: number }) {
  return (
    <mesh rotation={[timeOverride, timeOverride, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

export function PixelBrainLayerRenderer({ packet: _packet }: { packet: unknown }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <ThreeCanvas width={width} height={height}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <LatticeGeometry timeOverride={frame / fps} />
    </ThreeCanvas>
  );
}
