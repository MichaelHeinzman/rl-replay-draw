import { useState, useEffect, useCallback } from "react";
import { AppSettings, DEFAULT_SETTINGS } from "../types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((s) => {
        setSettings(s);
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, []);

  const updateSettings = useCallback(async (next: AppSettings) => {
    if (window.electronAPI) {
      const saved = await window.electronAPI.saveSettings(next);
      setSettings(saved);
    } else {
      setSettings(next);
    }
  }, []);

  return { settings, loaded, updateSettings };
}
