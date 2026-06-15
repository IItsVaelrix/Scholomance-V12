import MobileBottomSheet from './MobileBottomSheet.jsx';
import WordTooltip from '../../components/WordTooltip.jsx';
import { useHaptic } from '../../hooks/useHaptic.ts';

export default function MobileWordSheet({
  isOpen, onClose,
  wordData, analysis,
  isLoading, error,
  onSuggestionClick,
  sessionHistory, sessionIndex, onSessionNavigate,
  hapticEnabled = false,
}) {
  const { haptic } = useHaptic(hapticEnabled);

  function handleSuggestionClick(word) {
    haptic('select');
    setTimeout(() => haptic('success'), 40);
    onSuggestionClick(word);
    onClose();
  }

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="ide-word-sheet">
        {wordData && (
          <WordTooltip
            wordData={wordData}
            analysis={analysis}
            isLoading={isLoading}
            error={error}
            x={0}
            y={0}
            onDrag={() => {}}
            onClose={onClose}
            onSuggestionClick={handleSuggestionClick}
            sessionHistory={sessionHistory}
            sessionIndex={sessionIndex}
            onSessionNavigate={onSessionNavigate}
            isEmbedded={true}
          />
        )}
      </div>
    </MobileBottomSheet>
  );
}
