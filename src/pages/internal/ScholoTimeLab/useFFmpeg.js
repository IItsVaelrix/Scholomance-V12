import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export function useFFmpeg() {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    const load = async () => {
      try {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on("log", ({ message }) => {
          console.log(message);
        });
        ffmpeg.on("progress", ({ progress, time }) => {
          setProgress(progress);
        });
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        setLoaded(true);
      } catch (err) {
        console.error("FFmpeg load failed:", err);
      }
    };
    load();
  }, []);

  return { loaded, progress, ffmpeg: ffmpegRef.current };
}
