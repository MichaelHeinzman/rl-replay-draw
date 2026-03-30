import { createContext, useContext, useCallback, ReactNode } from "react";
import { useSettings } from "../hooks/useSettings";
import {
  AppSettings,
  ToolbarGridPosition,
  ToolbarPosition,
} from "../types/settings";

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  updateSettings: (next: AppSettings) => void;
  addCustomColor: (color: string) => void;
  removeCustomColor: (color: string) => void;
  setToolbarGrid: (grid: ToolbarGridPosition) => void;
  setToolbarPosition: (pos: ToolbarPosition | null) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { settings, loaded, updateSettings } = useSettings();

  const addCustomColor = useCallback(
    (color: string) => {
      if (!settings.customColors.includes(color)) {
        updateSettings({
          ...settings,
          customColors: [...settings.customColors, color],
        });
      }
    },
    [settings, updateSettings],
  );

  const removeCustomColor = useCallback(
    (color: string) => {
      updateSettings({
        ...settings,
        customColors: settings.customColors.filter((c) => c !== color),
      });
    },
    [settings, updateSettings],
  );

  const setToolbarGrid = useCallback(
    (grid: ToolbarGridPosition) => {
      updateSettings({ ...settings, toolbarGrid: grid, toolbarPosition: null });
    },
    [settings, updateSettings],
  );

  const setToolbarPosition = useCallback(
    (pos: ToolbarPosition | null) => {
      updateSettings({ ...settings, toolbarPosition: pos });
    },
    [settings, updateSettings],
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loaded,
        updateSettings,
        addCustomColor,
        removeCustomColor,
        setToolbarGrid,
        setToolbarPosition,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
