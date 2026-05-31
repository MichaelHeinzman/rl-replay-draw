import { AppSettings } from "./settings";
import { Note } from "./drawing";
import { NoteExportFormat, NoteFileResult, ReplayNote } from "./notes";

interface ElectronAPI {
  onDrawModeChanged: (callback: (isDrawMode: boolean) => void) => void;
  getDrawMode: () => Promise<boolean>;
  exitDrawMode: () => void;
  enterDrawMode: () => void;
  setIgnoreMouseEvents: (ignore: boolean, opts?: { forward?: boolean }) => void;
  focusWindow: () => void;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  getNote: () => Promise<ReplayNote>;
  saveNote: (note: ReplayNote) => Promise<ReplayNote>;
  exportNote: (
    note: ReplayNote,
    format: NoteExportFormat,
  ) => Promise<NoteFileResult>;
  saveNoteFile: (
    note: ReplayNote,
    format: NoteExportFormat,
    filePath?: string,
  ) => Promise<NoteFileResult>;
  importNote: () => Promise<NoteFileResult>;
  getOverlayNotes: () => Promise<Note[]>;
  saveOverlayNotes: (notes: Note[]) => Promise<Note[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
