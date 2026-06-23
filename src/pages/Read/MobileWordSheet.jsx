import MobileBottomSheet from './MobileBottomSheet.jsx';
import RitualPredictionTooltip from '../../components/RitualPredictionTooltip.jsx';
import { useHaptic } from '../../hooks/useHaptic.ts';

export default function MobileWordSheet({
  isOpen, onClose,
  word, contextLine,
  onTransmute,
  sessionHistory, sessionIndex, onSessionNavigate,
  hapticEnabled = false,
}) {
  const { haptic } = useHaptic(hapticEnabled);

  function handleTransmute(chosenWord) {
    haptic('select');
    setTimeout(() => haptic('success'), 40);
    onTransmute?.(chosenWord);
    onClose();
  }

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="ide-word-sheet">
        {word && (
          <RitualPredictionTooltip
            word={word}
            contextLine={contextLine}
            isEmbedded={true}
            onClose={onClose}
            onTransmute={onTransmute ? handleTransmute : undefined}
            sessionHistory={sessionHistory}
            sessionIndex={sessionIndex}
            onSessionNavigate={onSessionNavigate}
          />
        )}
      </div>
    </MobileBottomSheet>
  );
}
