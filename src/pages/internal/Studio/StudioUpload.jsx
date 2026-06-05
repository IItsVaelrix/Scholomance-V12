import React, { useState, useRef } from "react";
import { useAuth } from "../../../hooks/useAuth.jsx";
import "./StudioUpload.css";

export default function StudioUpload() {
  const { user } = useAuth();
  const [releaseId, setReleaseId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState("1");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Provenance Form State
  const [origin, setOrigin] = useState("human"); // human, ai, hybrid
  const [model, setModel] = useState("");
  const [humanEditRatio, setHumanEditRatio] = useState("100");
  const [stemsAvailable, setStemsAvailable] = useState(false);
  const [license, setLicense] = useState("all-rights-reserved");
  const [provenanceSaved, setProvenanceSaved] = useState(false);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!releaseId) {
      setError("Release ID is required");
      return;
    }
    if (!file) {
      setError("Please select an audio file");
      return;
    }
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("audio", file);
      if (trackId) formData.append("trackId", trackId);
      if (title) formData.append("title", title);
      if (position) formData.append("position", position);

      const res = await fetch(`/api/artist/releases/${releaseId}/tracks`, {
        method: "POST",
        body: formData,
        // credentials: "omit" or "include" - we rely on the session cookie
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Upload failed");
      }

      setUploadResult(data.summary);
      setTrackId(data.summary.trackId.toString());
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProvenance = async (e) => {
    e.preventDefault();
    if (!trackId) return;

    try {
      setError("");
      const res = await fetch(`/api/artist/tracks/${trackId}/provenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          model: origin !== "human" ? model : undefined,
          humanEditRatio: parseInt(humanEditRatio, 10),
          stemsAvailable,
          license,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save provenance");
      
      setProvenanceSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="studio-upload-container">
      <h1>Scholomance Studio - Ingestion</h1>
      
      {error && <div className="studio-error">{error}</div>}

      {!uploadResult ? (
        <form onSubmit={handleUpload} className="studio-form card">
          <h2>1. Upload Audio</h2>
          <label>
            Release ID (must own):
            <input type="text" inputMode="numeric" value={releaseId} onChange={(e) => setReleaseId(e.target.value)} required />
          </label>
          <label>
            Track Title:
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave blank for Untitled" />
          </label>
          <label>
            Track Position:
            <input type="number" value={position} onChange={(e) => setPosition(e.target.value)} />
          </label>
          <label>
            Existing Track ID (optional):
            <input type="text" inputMode="numeric" value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="Updates existing if provided" />
          </label>
          
          <div 
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current.click()}
          >
            {file ? file.name : "Drag and drop audio file here or click to browse"}
            <input 
              type="file" 
              accept="audio/*" 
              ref={fileInputRef} 
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <button type="submit" disabled={uploading}>
            {uploading ? "Ingesting & Compiling..." : "Upload & Ingest"}
          </button>
        </form>
      ) : (
        <div className="studio-result card">
          <h2>Upload Successful!</h2>
          <p><strong>Track ID:</strong> {uploadResult.trackId}</p>
          <p><strong>Fingerprint:</strong> {uploadResult.fingerprintId}</p>
          <p><strong>Analysis Version:</strong> {uploadResult.analysisVersion}</p>
          
          <div className="audio-preview">
            <h3>Preview</h3>
            <audio controls src={uploadResult.streamUrl} />
          </div>

          <form onSubmit={handleSaveProvenance} className="studio-form mt-4">
            <h2>2. Provenance Ledger</h2>
            <label>
              Origin:
              <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="human">Human</option>
                <option value="ai">AI</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            {origin !== "human" && (
              <label>
                Model (e.g., Suno, Udio):
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} required={origin !== "human"} />
              </label>
            )}
            <label>
              Human Edit Ratio (%):
              <input type="number" min="0" max="100" value={humanEditRatio} onChange={(e) => setHumanEditRatio(e.target.value)} />
            </label>
            <label>
              <input type="checkbox" checked={stemsAvailable} onChange={(e) => setStemsAvailable(e.target.checked)} />
              Stems Available?
            </label>
            <label>
              License:
              <select value={license} onChange={(e) => setLicense(e.target.value)}>
                <option value="all-rights-reserved">All Rights Reserved</option>
                <option value="cc-by">CC-BY</option>
                <option value="cc-by-nc">CC-BY-NC</option>
                <option value="public-domain">Public Domain</option>
              </select>
            </label>
            
            <button type="submit">
              {provenanceSaved ? "Saved!" : "Declare Provenance"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
