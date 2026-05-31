import { render, screen, fireEvent } from "@testing-library/react";
import NoteOverlay from "../NoteOverlay";
import { Note } from "../../../types/drawing";
import { OverlayProvider } from "../../../contexts/OverlayContext";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "test-note-1",
    text: "",
    x: 100,
    y: 200,
    color: "#00aaff",
    fontSize: 14,
    width: 260,
    height: 150,
    createdAt: Date.now(),
    ...overrides,
  };
}

function renderNote(note: Note, onUpdate = vi.fn(), onRemove = vi.fn()) {
  return render(
    <OverlayProvider>
      <NoteOverlay note={note} onUpdate={onUpdate} onRemove={onRemove} />
    </OverlayProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("NoteOverlay", () => {
  it("renders a textarea", () => {
    const note = makeNote();
    renderNote(note);
    expect(screen.getByPlaceholderText("Type a note...")).toBeInTheDocument();
  });

  it("renders with note text", () => {
    const note = makeNote({ text: "My note" });
    renderNote(note);
    expect(screen.getByDisplayValue("My note")).toBeInTheDocument();
  });

  it("calls onUpdate when text changes", () => {
    const note = makeNote();
    const onUpdate = vi.fn();
    renderNote(note, onUpdate);
    const textarea = screen.getByPlaceholderText("Type a note...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(onUpdate).toHaveBeenCalledWith("test-note-1", { text: "Hello" });
  });

  it("calls onRemove when close button is clicked", () => {
    const note = makeNote();
    const onRemove = vi.fn();
    renderNote(note, vi.fn(), onRemove);
    const closeBtn = screen.getByTitle("Remove note");
    fireEvent.click(closeBtn);
    expect(onRemove).toHaveBeenCalledWith("test-note-1");
  });

  it("positions at note coordinates", () => {
    const note = makeNote({ x: 300, y: 400 });
    const { container } = renderNote(note);
    const el = container.querySelector(".rl-note") as HTMLElement;
    expect(el.style.left).toBe("300px");
    expect(el.style.top).toBe("400px");
  });

  it("uses white text for high contrast on dark background", () => {
    const note = makeNote();
    const { container } = renderNote(note);
    const textarea = container.querySelector(
      ".rl-note__textarea",
    ) as HTMLElement;
    // Textarea should NOT have an inline color style (uses CSS white)
    expect(textarea.style.color).toBe("");
  });

  it("shows help instructions from the question mark button", () => {
    const note = makeNote();
    renderNote(note);

    fireEvent.click(screen.getByTitle("How notes work"));

    expect(screen.getByText("Notes autosave in the app.")).toBeInTheDocument();
    expect(
      screen.getByText(/Imported or saved notes autosave back to the same file/i),
    ).toBeInTheDocument();
  });

  it("shows save format choices for notes without a linked file", () => {
    const note = makeNote();
    renderNote(note);

    fireEvent.click(screen.getByTitle("Save this note"));

    expect(screen.getByText("Text (.txt)")).toBeInTheDocument();
    expect(screen.getByText("Markdown (.md)")).toBeInTheDocument();
    expect(screen.getByText("Word (.doc)")).toBeInTheDocument();
    expect(screen.getByText("Google Docs (.html)")).toBeInTheDocument();
  });

  it("hides the save button when a note is linked to a file", () => {
    const note = makeNote({
      savedFilePath: "C:\\notes\\replay.md",
      savedFormat: "md",
      savedTextSnapshot: "",
      lastSavedAt: Date.now(),
    });
    renderNote(note);

    expect(screen.queryByTitle("Save this note")).not.toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows saving status when linked-file text is modified", () => {
    const note = makeNote({
      text: "new text",
      savedFilePath: "C:\\notes\\replay.txt",
      savedFormat: "txt",
      savedTextSnapshot: "old text",
    });
    renderNote(note);

    expect(screen.getByText("Saving")).toBeInTheDocument();
    expect(screen.getByText("Saving changes to file...")).toBeInTheDocument();
  });

  it("shows explicit saving status while a save is in progress", () => {
    const note = makeNote({
      text: "saved text",
      savedFilePath: "C:\\notes\\replay.txt",
      savedFormat: "txt",
      savedTextSnapshot: "saved text",
      isSaving: true,
    });
    renderNote(note);

    expect(screen.getByText("Saving")).toBeInTheDocument();
  });

  it("toggles minimized notes without deleting them", () => {
    const note = makeNote({ text: "Minimize me" });
    const onUpdate = vi.fn();
    renderNote(note, onUpdate);

    fireEvent.click(screen.getByTitle("Minimize note"));

    expect(onUpdate).toHaveBeenCalledWith("test-note-1", { minimized: true });
  });

  it("clamps resize dimensions to the note max size", () => {
    const note = makeNote({ width: 520, height: 360 });
    const onUpdate = vi.fn();
    const { container } = renderNote(note, onUpdate);
    const noteElement = container.querySelector(".rl-note") as HTMLElement;
    const resizeHandle = screen.getByTitle("Resize note");

    noteElement.setPointerCapture = vi.fn();
    fireEvent.pointerDown(resizeHandle, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(noteElement, { clientX: 500, clientY: 500 });

    expect(onUpdate).toHaveBeenCalledWith("test-note-1", {
      width: 520,
      height: 360,
    });
  });
});
