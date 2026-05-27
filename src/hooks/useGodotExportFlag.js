import { useEffect, useState } from 'react';

const GODOT_EXPORT_FLAG_KEY = 'scholomance.godotExport';
const GODOT_EXPORT_FLAG_CHANGED_EVENT = 'scholomance:godotExportFlagChanged';

function readGodotExportFlag() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  return window.localStorage.getItem(GODOT_EXPORT_FLAG_KEY) === 'enabled';
}

export function useGodotExportFlag() {
  const [isEnabled, setIsEnabled] = useState(readGodotExportFlag);

  useEffect(() => {
    const syncFlag = () => {
      setIsEnabled(readGodotExportFlag());
    };

    const handleStorage = (event) => {
      if (event.key === GODOT_EXPORT_FLAG_KEY) {
        syncFlag();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(GODOT_EXPORT_FLAG_CHANGED_EVENT, syncFlag);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(GODOT_EXPORT_FLAG_CHANGED_EVENT, syncFlag);
    };
  }, []);

  return isEnabled;
}

export function setGodotExportFlag(isEnabled) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  if (isEnabled) {
    window.localStorage.setItem(GODOT_EXPORT_FLAG_KEY, 'enabled');
  } else {
    window.localStorage.removeItem(GODOT_EXPORT_FLAG_KEY);
  }

  window.dispatchEvent(new Event(GODOT_EXPORT_FLAG_CHANGED_EVENT));
}

export { GODOT_EXPORT_FLAG_CHANGED_EVENT, GODOT_EXPORT_FLAG_KEY };
