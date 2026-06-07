import { useContext, useEffect } from "react";
import { ProgressionContext } from "../context/ProgressionContext.jsx";
import { onXPEvent } from "../lib/progressionEvents.js";

/**
 * Hook to access the progression context.
 * @returns {ProgressionContextValue}
 */
export function useProgression() {
  const context = useContext(ProgressionContext);
  if (!context) {
    throw new Error("useProgression must be used within ProgressionProvider");
  }
  return context;
}

/**
 * Custom hook to subscribe to XP events with automatic cleanup.
 * This is the recommended way to listen for events in React components.
 * @param {string} event - The name of the event to listen for.
 * @param {function} callback - The function to execute when the event is emitted.
 */
export function useXPEventListener(event, callback) {
  useEffect(() => {
    const unsubscribe = onXPEvent(event, callback);
    return unsubscribe;
  }, [event, callback]);
}
