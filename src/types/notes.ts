export interface ReplayNote {
  title: string;
  body: string;
  updatedAt: string | null;
}

export type NoteExportFormat = "txt" | "md" | "html" | "doc";

export interface NoteFileResult {
  canceled: boolean;
  note?: ReplayNote;
  filePath?: string;
}

export const DEFAULT_NOTE: ReplayNote = {
  title: "Replay notes",
  body: "",
  updatedAt: null,
};
