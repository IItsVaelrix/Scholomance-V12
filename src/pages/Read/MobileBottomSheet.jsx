import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

const SNAP_Y = { full: 0, half: '42dvh' };

export default function MobileBottomSheet({ isOpen, onClose, children, initialSnap = 'half' }) {
  const [snap, setSnap] = useState(initialSnap);
  const dragControls = useDragControls();

  const handleDragEnd = useCallback((_, info) => {
    const { velocity, offset } = info;
    if (velocity.y > 500) { onClose(); return; }
    if (offset.y > window.innerHeight * 0.2) {
      if (snap === 'full') { setSnap('half'); }
      else { onClose(); }
      return;
    }
    if (offset.y < -window.innerHeight * 0.15) {
      setSnap('full');
    }
  }, [snap, onClose]);

  return (
    <AnimatePresence onExitComplete={() => setSnap(initialSnap)}>
      {isOpen && (
        <>
          <motion.div
            className="ide-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="ide-bottom-sheet"
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            initial={{ y: '100dvh' }}
            animate={{ y: SNAP_Y[snap] }}
            exit={{ y: '100dvh', transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            <div
              className="ide-sheet-handle-row"
              onPointerDown={e => dragControls.start(e)}
            >
              <div className="ide-sheet-handle" />
            </div>
            <div className="ide-sheet-content">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
