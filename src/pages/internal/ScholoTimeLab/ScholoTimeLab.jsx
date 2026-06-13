import React, { useState, useEffect, useRef } from "react";
import { useFFmpeg } from "./useFFmpeg.js";
import { fetchFile } from "@ffmpeg/util";
import "./ScholoTimeLab.css";

export default function ScholoTimeLab() {
  const { loaded, ffmpeg } = useFFmpeg();
  const [audioFile, setAudioFile] = useState(null);
  const [trackData, setTrackData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [exportProgress, setExportProgress] = useState(0);
  
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);

  // Handle audio file selection
  const handleAudioSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onloadedmetadata = () => {
          setDuration(audioRef.current.duration);
        };
      }
    }
  };

  // Handle JSON track data selection
  const handleJSONSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          setTrackData(data);
          setStatus("Track data loaded.");
        } catch (err) {
          setStatus("Failed to parse JSON.");
        }
      };
      reader.readAsText(file);
    }
  };

  const drawKineticTypography = (ctx, time, width, height, trackData) => {
    // Background
    ctx.fillStyle = "#0a0a12"; // Void dark
    ctx.fillRect(0, 0, width, height);

    // Draw some dynamic background grid
    ctx.strokeStyle = "rgba(74, 44, 106, 0.2)"; // Purple
    ctx.lineWidth = 1;
    const gridOffset = (time * 50) % 50;
    ctx.beginPath();
    for (let x = -gridOffset; x < width; x += 50) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = -gridOffset; y < height; y += 50) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    if (!trackData || !trackData.beats) {
      ctx.fillStyle = "#A8A8B8";
      ctx.font = "24px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Time: ${time.toFixed(2)}s - No Track Data`, width/2, height/2);
      return;
    }

    const beats = trackData.beats;
    
    // Smooth easing functions
    const easeOutExpo = (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);

    const centerX = width / 2;
    const centerY = height / 2;

    const visibleBeats = beats.filter(b => Math.abs(time - b.time) < 2.0);

    // Render past and future beats first (background), active beat last (foreground)
    visibleBeats.sort((a, b) => {
      const distA = Math.abs(time - a.time);
      const distB = Math.abs(time - b.time);
      return distB - distA; 
    });

    visibleBeats.forEach((beat) => {
      const tDiff = time - beat.time;
      let x = centerX;
      let y = centerY;
      let scale = 1;
      let opacity = 1;
      let color = "#FFFFFF";
      let blur = 0;
      let rotation = 0;

      const energy = beat.energy || 1.0;
      const baseFontSize = 60 + (energy * 10);
      
      // Future
      if (tDiff < 0) {
        const progress = 1 - Math.min(1, Math.abs(tDiff) / 1.0);
        const easeProg = easeOutExpo(progress);
        
        y = centerY + (1 - easeProg) * 150;
        scale = 0.5 + (easeProg * 0.5);
        opacity = progress;
        blur = (1 - progress) * 10;
        color = "#4facfe"; // Cyan incoming
        rotation = (1 - easeProg) * 0.2; 
      } 
      // Active / Past
      else {
        const progress = Math.min(1, tDiff / 1.0);
        const easeProg = easeOutExpo(progress);
        
        y = centerY - (easeProg * 100);
        scale = 1 + (Math.sin(progress * Math.PI) * 0.2) + (energy * 0.2 * (1 - progress));
        opacity = 1 - progress;
        blur = progress * 5;
        
        if (progress < 0.1) {
          color = "#FFFFFF";
          scale *= 1.2;
        } else {
          color = "#8B1E3D"; // Crimson fade
        }
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.rotate(rotation);
      
      ctx.font = `900 ${baseFontSize}px 'Inter', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      if (blur > 0) {
        ctx.filter = `blur(${blur}px)`;
      }
      
      ctx.fillStyle = color;
      ctx.globalAlpha = Math.max(0, opacity);
      
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + (energy * 10);
      
      ctx.fillText(beat.label.toUpperCase(), 0, 0);
      ctx.restore();
    });

    ctx.fillStyle = "#A8A8B8";
    ctx.font = "16px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`TIME: ${time.toFixed(2)}s | BEATS: ${beats.length}`, centerX, height - 20);
  };

  // Update canvas when time changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawKineticTypography(ctx, currentTime, canvas.width, canvas.height, trackData);
  }, [currentTime, trackData]);

  // Animation loop when playing
  const playLoop = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(playLoop);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
      cancelAnimationFrame(animationRef.current);
    } else {
      audioRef.current.play();
      animationRef.current = requestAnimationFrame(playLoop);
    }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Export to MP4
  const exportToMp4 = async () => {
    if (!audioFile) {
      setStatus("Please select an audio file first.");
      return;
    }
    if (!loaded) {
      setStatus("FFmpeg not loaded yet.");
      return;
    }
    
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    cancelAnimationFrame(animationRef.current);

    try {
      setStatus("Starting export...");
      const fps = 30;
      const totalFrames = Math.floor(duration * fps);
      
      // Write audio to ffmpeg virtual file system
      await ffmpeg.writeFile('audio.mp3', await fetchFile(audioFile));

      // Generate and write frames
      // Render frame directly since renderFrame is now inside useEffect. 
      // We'll duplicate the logic for export slightly or abstract it. Let's just abstract it back.
      const drawFrame = (time) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        drawKineticTypography(ctx, time, canvas.width, canvas.height, trackData);
      };

      for (let i = 0; i < totalFrames; i++) {
        const time = i / fps;
        drawFrame(time);
        
        const canvas = canvasRef.current;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const frameName = `frame-${i.toString().padStart(5, '0')}.jpg`;
        await ffmpeg.writeFile(frameName, uint8Array);
        
        if (i % 10 === 0) {
          setExportProgress((i / totalFrames) * 0.5); // First 50% is frame generation
          setStatus(`Generating frame ${i}/${totalFrames}`);
        }
      }

      setStatus("Muxing video with audio...");
      // Run ffmpeg command
      await ffmpeg.exec([
        '-framerate', `${fps}`,
        '-i', 'frame-%05d.jpg',
        '-i', 'audio.mp3',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        'output.mp4'
      ]);

      setStatus("Finished muxing. Downloading...");
      setExportProgress(1);

      // Read result and download
      const data = await ffmpeg.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ScholoTimeLab_Export.mp4';
      a.click();
      
      setStatus("Export complete!");
      
      // Cleanup frames
      for (let i = 0; i < totalFrames; i++) {
        const frameName = `frame-${i.toString().padStart(5, '0')}.jpg`;
        await ffmpeg.deleteFile(frameName);
      }
      await ffmpeg.deleteFile('audio.mp3');
      
    } catch (err) {
      console.error(err);
      setStatus("Export failed. See console.");
    }
  };

  return (
    <div className="scholo-time-lab">
      <div className="scholo-time-lab-header">
        <h1>ScholoTimeLab</h1>
        <p>Dynamic Audio/Visual Scrubber & Muxer</p>
      </div>

      <div className="lab-panel">
        <div className="lab-controls">
          <div className="file-input-group">
            <label htmlFor="audio-input">1. Select Audio (.mp3, .wav)</label>
            <input id="audio-input" type="file" accept="audio/*" onChange={handleAudioSelect} />
          </div>
          <div className="file-input-group">
            <label htmlFor="json-input">2. Select Beat Map (.json) (Optional)</label>
            <input id="json-input" type="file" accept=".json" onChange={handleJSONSelect} />
          </div>
        </div>
      </div>

      <div className="canvas-container">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={360} 
          className="preview-canvas"
        />
      </div>
      
      <audio ref={audioRef} style={{ display: 'none' }}>
        <track kind="captions" />
      </audio>

      <div className="lab-panel timeline-panel">
        <input 
          type="range" 
          className="timeline-scrubber"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleScrub}
          disabled={!audioFile}
        />
        
        <div className="action-buttons">
          <button className="btn" onClick={togglePlay} disabled={!audioFile}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={exportToMp4} 
            disabled={!audioFile || !loaded}
          >
            Export to MP4
          </button>
        </div>

        <div className="status-text">{status}</div>
        {(exportProgress > 0 && exportProgress < 1) && (
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${exportProgress * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
