import { useCallback, useEffect, useRef, useState } from "react";
import { useScrolls } from "./useScrolls.jsx";

const AUTOSAVE_DELAY_MS = 2500;

/**
 * useAutoSave — The Silent Scribe
 * 
 * Manages the background persistence of scroll drafts with deterministic
 * fingerprinting and in-flight guards.
 * 
 * @param {Object} inputs - { title, content, id, isEditable, submittedAt }
 * @param {Object} options - { onSaveSuccess }
 */
export function useAutoSave(inputs, options = {}) {
  const { saveScroll, setActiveScrollId } = useScrolls();
  const [saveStatus, setSaveStatus] = useState("Saved");

  const autosaveInFlightRef = useRef(false);
  const queuedAutosaveRef = useRef(null);
  const autosaveScrollIdRef = useRef(null);
  const lastAutosaveFingerprintRef = useRef("");
  const autosaveContextRef = useRef(0);

  const { title, content, id, isEditable, submittedAt } = inputs;
  const { onSaveSuccess } = options;

  const bumpAutosaveContext = useCallback(() => {
    autosaveContextRef.current += 1;
    queuedAutosaveRef.current = null;
    autosaveScrollIdRef.current = null;
    lastAutosaveFingerprintRef.current = "";
    setSaveStatus("Saved");
  }, []);

  const runAutosave = useCallback(async (draft) => {
    if (!draft || draft.context !== autosaveContextRef.current) return;

    const normalizedDraft = {
      context: draft.context,
      id: draft.id || autosaveScrollIdRef.current || undefined,
      title: String(draft.title || "").trim() || "Untitled Scroll",
      content: String(draft.content || ""),
      submittedAt: draft.submittedAt || null,
    };

    const draftFingerprint = `${normalizedDraft.id || "new"}|${normalizedDraft.title}|${normalizedDraft.content}`;
    
    // Deterministic check: STOP if no changes in the ink
    if (draftFingerprint === lastAutosaveFingerprintRef.current) {
      return;
    }

    if (autosaveInFlightRef.current) {
      queuedAutosaveRef.current = normalizedDraft;
      return;
    }

    autosaveInFlightRef.current = true;
    setSaveStatus("Saving...");

    try {
      const savedScroll = await saveScroll({
        ...normalizedDraft,
        submit: false,
      });

      if (!savedScroll || normalizedDraft.context !== autosaveContextRef.current) return;

      const savedId = String(savedScroll.id || normalizedDraft.id || "");
      const savedTitle = String(savedScroll.title || normalizedDraft.title || "");
      const savedContent = String(savedScroll.content || normalizedDraft.content || "");
      
      lastAutosaveFingerprintRef.current = `${savedId || "new"}|${savedTitle}|${savedContent}`;

      if (savedId) {
        autosaveScrollIdRef.current = savedId;
        setActiveScrollId((prev) => prev || savedId);
      }

      setSaveStatus("Saved");
      onSaveSuccess?.(savedScroll);
      
    } catch (error) {
      console.error("[PB-AUTOSAVE] Persistence failed:", error);
      setSaveStatus("Error");
    } finally {
      autosaveInFlightRef.current = false;
      const queuedDraft = queuedAutosaveRef.current;
      queuedAutosaveRef.current = null;
      if (queuedDraft) {
        void runAutosave({
          ...queuedDraft,
          id: queuedDraft.id || autosaveScrollIdRef.current || undefined,
        });
      }
    }
  }, [saveScroll, setActiveScrollId, onSaveSuccess]);

  useEffect(() => {
    if (!isEditable) return;

    const currentContent = String(content || "");
    const currentTitle = String(title || "").trim();
    const hasExistingDraft = Boolean(id || autosaveScrollIdRef.current);

    // Prevent saving pure voids
    if (!hasExistingDraft && !currentContent.trim() && !currentTitle) {
      return;
    }

    setSaveStatus("Dirty");

    const timerId = window.setTimeout(() => {
      void runAutosave({
        context: autosaveContextRef.current,
        id: id || autosaveScrollIdRef.current || undefined,
        title: currentTitle,
        content: currentContent,
        submittedAt: submittedAt || null,
      });
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [content, title, id, isEditable, submittedAt, runAutosave]);

  return {
    saveStatus,
    bumpAutosaveContext,
    isSaving: saveStatus === "Saving...",
    lastSavedId: autosaveScrollIdRef.current
  };
}
