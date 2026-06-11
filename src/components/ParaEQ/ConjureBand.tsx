import React from 'react';
import { EqBand, FilterType, ChannelKind } from './hooks/useEqBands';

interface ConjureBandProps {
  band: EqBand | null;
  onClose: () => void;
  onUpdate: (updates: Partial<EqBand>) => void;
  onRemove: () => void;
}

const FILTER_TYPES: FilterType[] = ['Bell', 'LowShelf', 'HighShelf', 'LowPass', 'HighPass', 'BandPass', 'Notch', 'Tilt'];
const CHANNELS: ChannelKind[] = ['Stereo', 'Mid', 'Side', 'Left', 'Right'];

export const ConjureBand: React.FC<ConjureBandProps> = ({ band, onClose, onUpdate, onRemove }) => {
  if (!band) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#1a1a1a',
      border: '1px solid #c9a227',
      borderRadius: '8px',
      padding: '20px',
      color: '#c9a227',
      fontFamily: '"PixelBrain", monospace',
      zIndex: 1000,
      boxShadow: '0 8px 16px rgba(0,0,0,0.8)',
      minWidth: '200px',
    }}>
      <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
        Band {band.id.replace('band-', '')}
      </h3>
      
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="conjure-filter-type" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Filter Type</label>
        <select 
          id="conjure-filter-type"
          value={band.filterType} 
          onChange={(e) => onUpdate({ filterType: e.target.value as FilterType })}
          style={{ width: '100%', background: '#000', color: '#c9a227', border: '1px solid #333', padding: '4px' }}
        >
          {FILTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="conjure-channel" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Channel</label>
        <select 
          id="conjure-channel"
          value={band.channel} 
          onChange={(e) => onUpdate({ channel: e.target.value as ChannelKind })}
          style={{ width: '100%', background: '#000', color: '#c9a227', border: '1px solid #333', padding: '4px' }}
        >
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button 
          onClick={onRemove}
          style={{ background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Remove
        </button>
        <button 
          onClick={onClose}
          style={{ background: '#c9a227', color: '#000', border: 'none', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}
        >
          Done
        </button>
      </div>
    </div>
  );
};
