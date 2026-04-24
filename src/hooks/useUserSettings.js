import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, getCsrfToken, clearCsrfToken } from './useAuth.jsx';
import { buildAuthorityUrl } from '../lib/apiUrl.js';

const LOCAL_STORAGE_KEY = 'scholomance.user.settings.v1';

function getSettingsEndpoint() {
  return buildAuthorityUrl('/api/settings');
}

const DEFAULT_SETTINGS = {
  theme: 'dark',
  truesightEnabled: true,
  reducedMotion: false,
  fontSize: 'medium',
  compactMode: false,
};

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedUserRef = useRef(null);

  // Initial load from localStorage (fallback)
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error('Failed to parse local settings', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Fetch from backend when user logs in
  useEffect(() => {
    if (user && user.id !== lastFetchedUserRef.current) {
      lastFetchedUserRef.current = user.id;
      setIsLoading(true);
      
      fetch(getSettingsEndpoint(), { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && typeof data === 'object') {
            setSettings(prev => {
              const merged = { ...prev, ...data };
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(err => console.error('Failed to fetch settings from backend', err))
        .finally(() => setIsLoading(false));
    } else if (!user) {
      lastFetchedUserRef.current = null;
    }
  }, [user]);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      
      // If logged in, persist to backend
      if (user) {
        // We don't await here to keep the UI snappy, but we do trigger the fetch
        getCsrfToken()
          .then((token) => {
            return fetch(getSettingsEndpoint(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': token
              },
              credentials: 'include',
              body: JSON.stringify(merged)
            }).then(res => {
              if (res.status === 403) clearCsrfToken();
              return res;
            });
          })
          .catch(err => console.error('Failed to save settings to backend', err));
      }
      
      return merged;
    });
  }, [user]);

  return {
    settings,
    updateSettings,
    isLoading
  };
}
