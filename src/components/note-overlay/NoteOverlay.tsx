import {
  useRef,
  useState,
  useCallback,
  PointerEvent as ReactPointerEvent,
  ChangeEvent,
} from "react";
import { Note } from "../../types/drawing";
import { NoteExportFormat } from "../../types/notes";
import { useOverlayContext } from "../../contexts/OverlayContext";
import "./note-overlay.css";

const MAX_NOTE_WIDTH = 520;
const MAX_NOTE_HEIGHT = 360;

interface NoteOverlayProps {
  note: Note;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onRemove: (id: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function NoteOverlay({
  note,
  onUpdate,
  onRemove,
  onMouseEnter,
  onMouseLeave,
}: NoteOverlayProps) {
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const { saveNoteAs, importNoteInto } = useOverlayContext();

  const modified =
    note.savedTextSnapshot !== undefined && note.savedTextSnapshot !== note.text;
  const saveStatus = note.isSaving || (note.savedFilePath && modified)
    ? "Saving"
    : note.savedTextSnapshot === undefined
    ? "Not saved"
    : modified
      ? "Modified"
      : "Saved";
  const hasLinkedFile = Boolean(note.savedFilePath && note.savedFormat);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.classList.contains("rl-note__resize")
      ) {
        return;
      }

      dragging.current = true;
      dragOffset.current = {
        x: event.clientX - note.x,
        y: event.clientY - note.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [note.x, note.y],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragging.current) {
        onUpdate(note.id, {
          x: event.clientX - dragOffset.current.x,
          y: event.clientY - dragOffset.current.y,
        });
      }

      if (resizing.current) {
        onUpdate(note.id, {
          width: Math.min(
            MAX_NOTE_WIDTH,
            Math.max(
              190,
              resizeStart.current.width + event.clientX - resizeStart.current.x,
            ),
          ),
          height: Math.min(
            MAX_NOTE_HEIGHT,
            Math.max(
              92,
              resizeStart.current.height + event.clientY - resizeStart.current.y,
            ),
          ),
        });
      }
    },
    [note.id, onUpdate],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    resizing.current = false;
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      resizing.current = true;
      resizeStart.current = {
        x: event.clientX,
        y: event.clientY,
        width: note.width,
        height: note.height,
      };
      const noteElement = event.currentTarget.closest(".rl-note") as HTMLElement;
      noteElement?.setPointerCapture(event.pointerId);
    },
    [note.height, note.width],
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setStatusMessage("");
      onUpdate(note.id, { text: event.target.value });
    },
    [note.id, onUpdate],
  );

  const handleClose = useCallback(() => {
    onRemove(note.id);
  }, [note.id, onRemove]);

  const handleMinimize = useCallback(() => {
    onUpdate(note.id, { minimized: !note.minimized });
  }, [note.id, note.minimized, onUpdate]);

  const handleSave = useCallback(
    async (format: NoteExportFormat) => {
      const result = await saveNoteAs(note.id, format);
      setShowSaveMenu(false);
      setStatusMessage(result.canceled ? "Save canceled." : "Saved. Future edits autosave.");
    },
    [note.id, saveNoteAs],
  );

  const handleImport = useCallback(async () => {
    if (window.electronAPI) {
      const result = await importNoteInto(note.id);
      setStatusMessage(result.canceled ? "Import canceled." : "Imported into this note.");
      return;
    }

    importInputRef.current?.click();
  }, [importNoteInto, note.id]);

  const handleBrowserImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const result = await importNoteInto(note.id, file);
      setStatusMessage(result.canceled ? "Import canceled." : "Imported into this note.");
      event.target.value = "";
    },
    [importNoteInto, note.id],
  );

  return (
    <div
      className={`rl-note ${note.minimized ? "rl-note--minimized" : ""}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.minimized ? Math.min(note.width, 260) : note.width,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="rl-note__content">
        <div
          className="rl-note__glow-bar"
          style={{
            background: note.color,
            boxShadow: `0 0 10px ${note.color}`,
          }}
        />
        <div className="rl-note__header">
          <div>
            <span className="rl-note__eyebrow">NOTE</span>
            <span className={`rl-note__status rl-note__status--${saveStatus.toLowerCase().replace(" ", "-")}`}>
              {saveStatus}
            </span>
          </div>
          <div className="rl-note__controls">
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setShowHelp((visible) => !visible)}
              title="How notes work"
            >
              ?
            </button>
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleImport}
              title="Import a document into this note"
            >
              Import
            </button>
            {!hasLinkedFile && (
              <button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setShowSaveMenu((visible) => !visible)}
                title="Save this note"
              >
                Save
              </button>
            )}
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleMinimize}
              title={note.minimized ? "Expand note" : "Minimize note"}
            >
              {note.minimized ? "Open" : "Minimize"}
            </button>
            <button
              className="rl-note__close"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleClose}
              title="Remove note"
            >
              ×
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="rl-note__help">
            <strong>Notes autosave in the app.</strong>
            <span>Click Save once to choose TXT, Markdown, Word, or Google Docs HTML.</span>
            <span>Imported or saved notes autosave back to the same file.</span>
            <span>Drag the header to move it. Pull the corner to resize it.</span>
          </div>
        )}

        {showSaveMenu && !hasLinkedFile && (
          <div className="rl-note__save-menu">
            <button onClick={() => handleSave("txt")}>Text (.txt)</button>
            <button onClick={() => handleSave("md")}>Markdown (.md)</button>
            <button onClick={() => handleSave("doc")}>Word (.doc)</button>
            <button onClick={() => handleSave("html")}>Google Docs (.html)</button>
          </div>
        )}

        {note.minimized ? (
          <div className="rl-note__preview">
            {note.text.trim() || "Empty note"}
          </div>
        ) : (
          <>
            <textarea
              className="rl-note__textarea"
              value={note.text}
              onChange={handleTextChange}
              placeholder="Type a note..."
              style={{ fontSize: note.fontSize, height: note.height }}
            />
            <div
              className="rl-note__resize"
              onPointerDown={handleResizeStart}
              title="Resize note"
            />
          </>
        )}
        <div className="rl-note__footer">
          <span>
            {statusMessage ||
              (hasLinkedFile
                ? modified || note.isSaving
                  ? "Saving changes to file..."
                  : "Autosave enabled"
                : "Save once to enable file autosave")}
          </span>
          {note.lastSavedAt && <span>{new Date(note.lastSavedAt).toLocaleTimeString()}</span>}
        </div>
        <input
          ref={importInputRef}
          className="rl-note__file"
          type="file"
          accept=".txt,.md,.markdown,.html,.htm,.doc"
          onChange={handleBrowserImport}
        />
      </div>
    </div>
  );
}
