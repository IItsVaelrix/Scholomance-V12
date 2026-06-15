import React from "react";
import { Composition } from "remotion";
import { KineticLyricsVideo } from "./KineticLyricsVideo";
import { PETRICHOR } from "../pages/Visualiser/tracks/petrichor";

export function RemotionRoot() {
  return (
    <Composition
      id="KineticLyricsVideo"
      component={KineticLyricsVideo as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={30 * Math.ceil(PETRICHOR.duration)}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ track: PETRICHOR }}
    />
  );
}
