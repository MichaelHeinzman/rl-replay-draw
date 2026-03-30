import {
  useRef,
  useCallback,
  PointerEvent as ReactPointerEvent,
  ChangeEvent,
} from "react";
import { Note } from "../../types/drawing";
import "./note-overlay.css";

interface NoteOverlayProps {
  note: Note;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onRemove: (id: string) => void;
}

export default function NoteOverlay({
  note,
  onUpdate,
  onRemove,
}: NoteOverlayProps) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Allow typing in textarea and clicking close button without starting a drag
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "BUTTON") return;
      dragging.current = true;
      offset.current = { x: e.clientX - note.x, y: e.clientY - note.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [note.x, note.y],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      onUpdate(note.id, {
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    },
    [note.id, onUpdate],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(note.id, { text: e.target.value });
    },
    [note.id, onUpdate],
  );

  const handleClose = useCallback(() => {
    onRemove(note.id);
  }, [note.id, onRemove]);

  return (
    <div
      className="rl-note"
      style={{ left: note.x, top: note.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="rl-note__content">
        <div
          className="rl-note__glow-bar"
          style={{
            background: note.color,
            boxShadow: `0 0 8px ${note.color}`,
          }}
        />
        <button
          className="rl-note__close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          title="Remove note"
        >
          ✕
        </button>
        <textarea
          className="rl-note__textarea"
          value={note.text}
          onChange={handleTextChange}
          placeholder="Type a note..."
          style={{ fontSize: note.fontSize }}
          rows={2}
        />
      </div>
    </div>
  );
}
