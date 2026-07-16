import React, { useState, useEffect } from 'react';
import { SpectrumCanvas } from './SpectrumCanvas';
import { ParaEQOverlay } from './ParaEQOverlay';
import { EqBand, useEqBands } from './hooks/useEqBands';
import { useEqPreset } from './hooks/useEqPreset';
import { ConjureBand } from './ConjureBand';

interface ScholoCandyProps {
  isPlaying: boolean;
  getByteFrequencyData: (array: Uint8Array) => void;
  currentSchoolId: string | null;
  detectedSchoolId?: string | null;
  signalLevel: number;
  eqNodes?: any[];
  // If the parent wants to sync to ambientPlayer.service, it can provide this callback
  onBandsChanged?: (bands: EqBand[]) => void;
}

export const ScholoCandy: React.FC<ScholoCandyProps> = ({
  isPlaying,
  getByteFrequencyData,
  currentSchoolId,
  detectedSchoolId,
  signalLevel,
  eqNodes,
  onBandsChanged,
}) => {
  const { bands, setBands, updateBand } = useEqBands();
  const { exportPreset, loadPreset } = useEqPreset(bands, setBands);
  const [editingBandId, setEditingBandId] = useState<string | null>(null);

  // Sync with parent audio service whenever bands change
  useEffect(() => {
    onBandsChanged?.(bands);
  }, [bands, onBandsChanged]);

  const handleAddBand = (partial: Partial<EqBand>) => {
    const newBand: EqBand = {
      id: `band-${Date.now()}`,
      enabled: true,
      filterType: partial.filterType || 'Bell',
      channel: partial.channel || 'Stereo',
      freq: partial.freq || 1000,
      gain: partial.gain || 0,
      q: partial.q || 1,
    };
    setBands((prev) => [...prev, newBand]);
    setEditingBandId(newBand.id);
    return newBand.id;
  };

  const handleUpdateBand = (id: string, updates: Partial<EqBand>) => {
    updateBand(id, updates);
  };

  const handleRemoveBand = (id: string) => {
    setBands((prev) => prev.filter(b => b.id !== id));
    if (editingBandId === id) setEditingBandId(null);
  };

  const editingBand = bands.find(b => b.id === editingBandId) || null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SpectrumCanvas
        isPlaying={isPlaying}
        getByteFrequencyData={getByteFrequencyData}
        currentSchoolId={currentSchoolId}
        signalLevel={signalLevel}
        eqNodes={eqNodes}
      />
      <ParaEQOverlay
        eqBands={bands}
        isPlaying={isPlaying}
        detectedSchoolId={detectedSchoolId}
        onAddBand={handleAddBand}
        onUpdateBand={handleUpdateBand}
        onRemoveBand={handleRemoveBand}
        onEditBand={setEditingBandId}
      />
      {editingBandId && (
        <ConjureBand 
          band={editingBand}
          onClose={() => setEditingBandId(null)}
          onUpdate={(updates) => handleUpdateBand(editingBandId, updates)}
          onRemove={() => handleRemoveBand(editingBandId)}
        />
      )}
    </div>
  );
};
