import { AppSettings } from "./settings";

interface ElectronAPI {
  onDrawModeChanged: (callback: (isDrawMode: boolean) => void) => void;
  getDrawMode: () => Promise<boolean>;
  exitDrawMode: () => void;
  enterDrawMode: () => void;
  setIgnoreMouseEvents: (ignore: boolean, opts?: { forward?: boolean }) => void;
  focusWindow: () => void;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
