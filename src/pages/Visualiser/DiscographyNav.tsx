import { useState, useCallback } from 'react';
import { UploadModal } from './UploadModal';
import { type GrimoireTrack, GRIMOIRE_TRACKS } from './tracks';
import { generateSchoolColor } from '../../lib/engine.adapter.js';
import './DiscographyNav.css';

interface DiscographyNavProps {
  activeTrackId: string;
  onSelectTrack: (track: GrimoireTrack) => void;
}

export function DiscographyNav({ activeTrackId, onSelectTrack }: DiscographyNavProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const groupedAlbums = GRIMOIRE_TRACKS.reduce((acc, track) => {
    const albumName = track.meta.find(([k]) => k === 'Style')?.[1] || 'Singles';
    if (!acc[albumName]) {
      acc[albumName] = [];
    }
    acc[albumName].push(track);
    return acc;
  }, {} as Record<string, GrimoireTrack[]>);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <>
      <nav
        className={`bcv-disco-nav${isCollapsed ? ' bcv-disco-nav--collapsed' : ''}`}
        aria-label="Discography"
      >
        {isCollapsed ? (
          <button
            className="bcv-disco-expand-btn"
            onClick={handleExpand}
            aria-label="Expand discography"
            type="button"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="m10 9-3 3 3 3" />
            </svg>
            <span className="bcv-disco-expand-label">Discography</span>
          </button>
        ) : (
          <>
            <div className="bcv-disco-header">
              <h2>Discography</h2>
              <div className="bcv-disco-header-actions">
                <button className="bcv-upload-btn" onClick={() => setIsUploadOpen(true)}>
                  + Upload
                </button>
                <button
                  className="bcv-disco-collapse-btn"
                  onClick={handleCollapse}
                  aria-label="Collapse discography"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="bcv-disco-scroll">
              {Object.entries(groupedAlbums).map(([albumName, tracks]) => (
                <div key={albumName} className="bcv-album-group">
                  <h3 className="bcv-album-title">{albumName}</h3>
                  <ul className="bcv-disco-list">
                    {tracks.map(track => {
                      const isActive = track.id === activeTrackId;
                      const dominantSchool = track.lyrics.length > 0 ? 'SONIC' : 'VOID';
                      const truesightHue = generateSchoolColor(dominantSchool);

                      return (
                        <li key={track.id}>
                          <button
                            className={`bcv-disco-btn ${isActive ? 'is-active' : ''}`}
                            style={{ '--album-hue': truesightHue } as React.CSSProperties}
                            onClick={() => onSelectTrack(track)}
                          >
                            <img src={track.coverUrl} alt="" className="bcv-disco-thumb" />
                            <div className="bcv-disco-info">
                              <span className="bcv-disco-track">{track.title}</span>
                              <span className="bcv-disco-artist">{track.artist}</span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          className="bcv-disco-edge-handle"
          onClick={isCollapsed ? handleExpand : handleCollapse}
          aria-label={isCollapsed ? 'Expand discography' : 'Collapse discography'}
          type="button"
        >
          <span className="bcv-disco-edge-grip" aria-hidden="true" />
        </button>
      </nav>
      {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} />}
    </>
  );
}
