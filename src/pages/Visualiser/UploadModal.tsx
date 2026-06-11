import { useState } from 'react';
import './UploadModal.css';

interface UploadModalProps {
  onClose: () => void;
}

export function UploadModal({ onClose }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    // Simulate ingest pipeline with Truesight analysis
    await new Promise(r => setTimeout(r, 1500));
    setUploading(false);
    setSuccess(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="bcv-upload-modal-overlay">
      <div className="bcv-upload-modal" role="dialog" aria-modal="true">
        <header className="bcv-upload-header">
          <h2>Upload Release</h2>
          <button className="bcv-close-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        {success ? (
          <div className="bcv-upload-success">
            <span aria-hidden="true">◈</span>
            <p>Upload complete. Truesight analysis finished.</p>
            <p className="bcv-dim">Bytecode seed registered successfully.</p>
          </div>
        ) : (
          <div className="bcv-upload-body">
            <div className="bcv-form-group">
              <label htmlFor="bcv-album-title">Album Title</label>
              <input id="bcv-album-title" type="text" placeholder="The Void Archives" />
            </div>
            
            <div className="bcv-form-group">
              <label htmlFor="bcv-liner-notes">Liner Notes / Lore</label>
              <textarea id="bcv-liner-notes" placeholder="Describe the sonic journey..." rows={3} />
            </div>

            <div className="bcv-form-group bcv-file-drop">
              <label htmlFor="bcv-upload-input" className="bcv-file-label">
                {files.length > 0 ? `${files.length} file(s) selected` : 'Select audio (WAV/MP3) & cover art'}
              </label>
              <input 
                id="bcv-upload-input" 
                type="file" 
                multiple 
                accept="audio/*,image/*"
                onChange={handleFileChange} 
                className="bcv-file-input"
              />
            </div>

            <div className="bcv-upload-footer">
              <button 
                className="bcv-submit-btn" 
                disabled={files.length === 0 || uploading}
                onClick={handleUpload}
              >
                {uploading ? 'Analyzing Phonemes...' : 'Ingest & Publish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
