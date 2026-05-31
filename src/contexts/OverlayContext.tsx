import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Note, PlacedImage } from "../types/drawing";
import { NoteExportFormat, ReplayNote } from "../types/notes";

let noteId = 1;
let imageId = 1;
const NOTES_STORAGE_KEY = "rl-replay-draw-notes";
const DEFAULT_NOTE_WIDTH = 520;
const DEFAULT_NOTE_HEIGHT = 360;

interface OverlayContextValue {
  notes: Note[];
  images: PlacedImage[];
  addNote: (color: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
  saveNoteAs: (
    id: string,
    format: NoteExportFormat,
  ) => Promise<{ canceled: boolean }>;
  importNoteInto: (id: string, file?: File) => Promise<{ canceled: boolean }>;
  addImage: (dataUrl: string) => void;
  updateImage: (id: string, patch: Partial<PlacedImage>) => void;
  removeImage: (id: string) => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

function normalizeNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((note): note is Partial<Note> => Boolean(note))
    .map((note, index) => ({
      id:
        typeof note.id === "string" && note.id
          ? note.id
          : `n${Date.now()}-${index}`,
      text: typeof note.text === "string" ? note.text : "",
      x: typeof note.x === "number" ? note.x : window.innerWidth / 2 - 120,
      y: typeof note.y === "number" ? note.y : window.innerHeight / 2 - 60,
      color: typeof note.color === "string" ? note.color : "#00aaff",
      fontSize: typeof note.fontSize === "number" ? note.fontSize : 14,
      width: typeof note.width === "number" ? note.width : DEFAULT_NOTE_WIDTH,
      height:
        typeof note.height === "number" ? note.height : DEFAULT_NOTE_HEIGHT,
      createdAt: typeof note.createdAt === "number" ? note.createdAt : Date.now(),
      minimized: Boolean(note.minimized),
      savedFilePath:
        typeof note.savedFilePath === "string" ? note.savedFilePath : undefined,
      savedFormat: ["txt", "md", "html", "doc"].includes(
        note.savedFormat as string,
      )
        ? note.savedFormat
        : undefined,
      savedTextSnapshot:
        typeof note.savedTextSnapshot === "string"
          ? note.savedTextSnapshot
          : undefined,
      lastSavedAt:
        typeof note.lastSavedAt === "number" ? note.lastSavedAt : undefined,
      isSaving: false,
    }));
}

function readBrowserNotes(): Note[] {
  try {
    const rawNotes = window.localStorage.getItem(NOTES_STORAGE_KEY);
    return rawNotes ? normalizeNotes(JSON.parse(rawNotes)) : [];
  } catch {
    return [];
  }
}

function writeBrowserNotes(notes: Note[]) {
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function createNote(color: string, text = ""): Note {
  return {
    id: `n${noteId++}-${Date.now()}`,
    text,
    x: Math.max(16, window.innerWidth / 2 - DEFAULT_NOTE_WIDTH / 2),
    y: Math.max(16, window.innerHeight / 2 - DEFAULT_NOTE_HEIGHT / 2),
    color,
    fontSize: 14,
    width: DEFAULT_NOTE_WIDTH,
    height: DEFAULT_NOTE_HEIGHT,
    createdAt: Date.now(),
    minimized: false,
  };
}

function buildNoteDocument(note: Note): ReplayNote {
  return {
    title: "Replay note",
    body: note.text,
    updatedAt: new Date().toISOString(),
  };
}

function buildNotesDocument(notes: Note[]): ReplayNote {
  const sortedNotes = [...notes].sort((a, b) => a.createdAt - b.createdAt);
  const body = sortedNotes
    .map((note, index) => {
      const createdAt = new Date(note.createdAt).toLocaleString();
      const text = note.text.trim() || "(empty note)";
      return `Note ${index + 1}\nCreated: ${createdAt}\nColor: ${note.color}\n\n${text}`;
    })
    .join("\n\n---\n\n");

  return {
    title: "Replay notes",
    body,
    updatedAt: new Date().toISOString(),
  };
}

function buildTextExport(note: ReplayNote) {
  const savedAt = note.updatedAt
    ? new Date(note.updatedAt).toLocaleString()
    : new Date().toLocaleString();

  return `${note.title}\nSaved: ${savedAt}\n\n${note.body}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlExport(note: ReplayNote) {
  const savedAt = note.updatedAt
    ? new Date(note.updatedAt).toLocaleString()
    : new Date().toLocaleString();

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title></head>
<body>
  <h1>${escapeHtml(note.title)}</h1>
  <p>Saved: ${escapeHtml(savedAt)}</p>
  <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${escapeHtml(
    note.body,
  )}</pre>
</body>
</html>`;
}

function downloadBrowserExport(note: ReplayNote, format: NoteExportFormat) {
  const extension = format === "doc" ? "doc" : format;
  const isHtml = format === "html" || format === "doc";
  const payload = isHtml ? buildHtmlExport(note) : buildTextExport(note);
  const link = document.createElement("a");

  link.href = URL.createObjectURL(
    new Blob([payload], { type: isHtml ? "text/html" : "text/plain" }),
  );
  link.download = `${note.title}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function readBrowserImport(file?: File): Promise<ReplayNote | null> {
  if (!file) return null;

  return {
    title: file.name.replace(/\.[^.]+$/, "") || "Imported note",
    body: await file.text(),
    updatedAt: new Date().toISOString(),
  };
}

function inferFormatFromPath(filePath?: string): NoteExportFormat | undefined {
  if (!filePath) return undefined;
  const extension = filePath.split(".").pop()?.toLowerCase();
  if (extension === "txt" || extension === "md" || extension === "html" || extension === "doc") {
    return extension;
  }
  if (extension === "htm") return "html";
  if (extension === "markdown") return "md";
  return undefined;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [images, setImages] = useState<PlacedImage[]>([]);
  const notesLoaded = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadNotes() {
      const savedNotes = window.electronAPI?.getOverlayNotes
        ? await window.electronAPI.getOverlayNotes()
        : readBrowserNotes();

      if (!active) return;
      const normalizedNotes = normalizeNotes(savedNotes);
      setNotes(normalizedNotes);
      notesLoaded.current = true;
      noteId = normalizedNotes.length + 1;
    }

    loadNotes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notesLoaded.current) return;

    writeBrowserNotes(notes);
    if (window.electronAPI?.saveOverlayNotes) {
      window.electronAPI.saveOverlayNotes(notes);
    }
  }, [notes]);

  useEffect(() => {
    if (!notesLoaded.current || !window.electronAPI?.saveNoteFile) return;

    const saveTimeout = window.setTimeout(async () => {
      const notesToSave = notes.filter(
        (note) =>
          note.savedFilePath &&
          note.savedFormat &&
          !note.isSaving &&
          note.savedTextSnapshot !== note.text,
      );

      if (notesToSave.length === 0) return;

      const savingIds = new Set(notesToSave.map((note) => note.id));
      setNotes((prev) =>
        prev.map((note) =>
          savingIds.has(note.id) ? { ...note, isSaving: true } : note,
        ),
      );

      for (const note of notesToSave) {
        const result = await window.electronAPI!.saveNoteFile(
          buildNoteDocument(note),
          note.savedFormat!,
          note.savedFilePath,
        );

        setNotes((prev) =>
          prev.map((prevNote) =>
            prevNote.id === note.id
              ? {
                  ...prevNote,
                  savedTextSnapshot: result.canceled
                    ? prevNote.savedTextSnapshot
                    : prevNote.text,
                  lastSavedAt: result.canceled ? prevNote.lastSavedAt : Date.now(),
                  isSaving: false,
                }
              : prevNote,
          ),
        );
      }
    }, 700);

    return () => window.clearTimeout(saveTimeout);
  }, [notes]);

  const addNote = useCallback((color: string) => {
    setNotes((prev) => [...prev, createNote(color)]);
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const saveNoteAs = useCallback(
    async (id: string, format: NoteExportFormat) => {
      const noteToSave = notes.find((note) => note.id === id);
      if (!noteToSave) return { canceled: true };

      if (window.electronAPI?.saveNoteFile) {
        const result = await window.electronAPI.saveNoteFile(
          buildNoteDocument(noteToSave),
          format,
        );

        if (!result.canceled && result.filePath) {
          setNotes((prev) =>
            prev.map((note) =>
              note.id === id
                ? {
                    ...note,
                    savedFilePath: result.filePath,
                    savedFormat: format,
                    savedTextSnapshot: note.text,
                    lastSavedAt: Date.now(),
                  }
                : note,
            ),
          );
        }

        return result;
      }

      downloadBrowserExport(buildNoteDocument(noteToSave), format);
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? {
                ...note,
                savedFormat: format,
                savedTextSnapshot: note.text,
                lastSavedAt: Date.now(),
              }
            : note,
        ),
      );
      return { canceled: false };
    },
    [notes],
  );

  const importNoteInto = useCallback(async (id: string, file?: File) => {
    const importedNote = window.electronAPI?.importNote
      ? await window.electronAPI.importNote()
      : { canceled: false, note: await readBrowserImport(file), filePath: undefined };

    if (importedNote.canceled || !importedNote.note) return { canceled: true };

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? {
              ...note,
              text: importedNote.note!.body,
              savedFilePath: importedNote.filePath,
              savedFormat: inferFormatFromPath(importedNote.filePath),
              savedTextSnapshot: importedNote.filePath
                ? importedNote.note!.body
                : undefined,
              lastSavedAt: importedNote.filePath ? Date.now() : undefined,
              isSaving: false,
              minimized: false,
            }
          : note,
      ),
    );
    return { canceled: false };
  }, []);

  const addImage = useCallback((dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const placed: PlacedImage = {
        id: `i${imageId++}-${Date.now()}`,
        src: dataUrl,
        x: window.innerWidth / 2 - (img.width * scale) / 2,
        y: window.innerHeight / 2 - (img.height * scale) / 2,
        width: img.width * scale,
        height: img.height * scale,
        createdAt: Date.now(),
      };
      setImages((prev) => [...prev, placed]);
    };
    img.src = dataUrl;
  }, []);

  const updateImage = useCallback((id: string, patch: Partial<PlacedImage>) => {
    setImages((prev) =>
      prev.map((im) => (im.id === id ? { ...im, ...patch } : im)),
    );
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((im) => im.id !== id));
  }, []);

  return (
    <OverlayContext.Provider
      value={{
        notes,
        images,
        addNote,
        updateNote,
        removeNote,
        saveNoteAs,
        importNoteInto,
        addImage,
        updateImage,
        removeImage,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlayContext() {
  const ctx = useContext(OverlayContext);
  if (!ctx)
    throw new Error("useOverlayContext must be used within OverlayProvider");
  return ctx;
}
