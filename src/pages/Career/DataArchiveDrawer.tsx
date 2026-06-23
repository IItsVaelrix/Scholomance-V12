import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DataArchiveDrawer - the "Data Archive" surface for a generated Sigil.
 *
 * Renders the itemized, plain-language record (from assembleDataArchive) explaining why
 * every change was made and for what purpose. Inline slide-in drawer; closes on backdrop
 * click or Escape. Read-only and presentational - all data is computed upstream.
 */

export interface ArchiveEntry {
  label: string;
  detail?: string;
  reason: string;
}

export interface ArchiveSection {
  id: string;
  title: string;
  summary: string;
  entries: ArchiveEntry[];
  meta?: {
    score?: number | null;
    rawScore?: number | null;
    matched?: string[];
    missing?: string[];
    note?: string;
    caution?: string;
    lines?: { text: string; verdict: string; score: number }[];
  };
}

export interface DataArchive {
  schemaVersion: number;
  alignmentScore: number | null;
  legibilityScore: number | null;
  sections: ArchiveSection[];
}

interface DataArchiveDrawerProps {
  open: boolean;
  archive: DataArchive | null;
  onClose: () => void;
}

export default function DataArchiveDrawer({ open, archive, onClose }: DataArchiveDrawerProps) {
  // Escape-to-close + lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && archive && (
        <motion.div
          className="archive-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.aside
            className="archive-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Data Archive - change rationale"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="archive-header">
              <div className="archive-title-block">
                <span className="archive-eyebrow">Data Archive</span>
                <h2 className="archive-title">Why these changes were made</h2>
                <p className="archive-sub">
                  Every transformation below is deterministic and reversible. Each entry states
                  what changed and the reason for it, so nothing happens to your résumé silently.
                </p>
              </div>
              <button className="archive-close" onClick={onClose} aria-label="Close Data Archive">
                ✕
              </button>
            </header>

            <div className="archive-scorebar">
              {archive.alignmentScore != null && (
                <span className="archive-stat">
                  <span className="archive-stat-label">JD Alignment</span>
                  <span className="archive-stat-value">{archive.alignmentScore}/100</span>
                </span>
              )}
              {archive.legibilityScore != null && (
                <span className="archive-stat">
                  <span className="archive-stat-label">Legibility</span>
                  <span className="archive-stat-value">{archive.legibilityScore}</span>
                </span>
              )}
            </div>

            <div className="archive-body">
              {archive.sections.map((section) => (
                <section key={section.id} className="archive-section">
                  <h3 className="archive-section-title">
                    {section.title}
                    {section.entries.length > 0 && (
                      <span className="archive-section-count">{section.entries.length}</span>
                    )}
                  </h3>
                  <p className="archive-section-summary">{section.summary}</p>

                  {section.entries.length > 0 && (
                    <ul className="archive-entries">
                      {section.entries.map((entry, i) => (
                        <li key={`${section.id}-${i}`} className="archive-entry">
                          <div className="archive-entry-head">
                            <span className="archive-entry-label">{entry.label}</span>
                            {entry.detail && (
                              <span className="archive-entry-detail">{entry.detail}</span>
                            )}
                          </div>
                          <p className="archive-entry-reason">{entry.reason}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.meta?.note && (
                    <p className="archive-note">{section.meta.note}</p>
                  )}
                  {section.meta?.caution && (
                    <p className="archive-note archive-note--warn">{section.meta.caution}</p>
                  )}
                </section>
              ))}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
