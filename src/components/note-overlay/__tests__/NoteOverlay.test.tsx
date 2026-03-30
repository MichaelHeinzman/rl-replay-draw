import { render, screen, fireEvent } from "@testing-library/react";
import NoteOverlay from "../NoteOverlay";
import { Note } from "../../../types/drawing";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "test-note-1",
    text: "",
    x: 100,
    y: 200,
    color: "#00aaff",
    fontSize: 14,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("NoteOverlay", () => {
  it("renders a textarea", () => {
    const note = makeNote();
    render(<NoteOverlay note={note} onUpdate={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByPlaceholderText("Type a note...")).toBeInTheDocument();
  });

  it("renders with note text", () => {
    const note = makeNote({ text: "My note" });
    render(<NoteOverlay note={note} onUpdate={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByDisplayValue("My note")).toBeInTheDocument();
  });

  it("calls onUpdate when text changes", () => {
    const note = makeNote();
    const onUpdate = vi.fn();
    render(<NoteOverlay note={note} onUpdate={onUpdate} onRemove={vi.fn()} />);
    const textarea = screen.getByPlaceholderText("Type a note...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(onUpdate).toHaveBeenCalledWith("test-note-1", { text: "Hello" });
  });

  it("calls onRemove when close button is clicked", () => {
    const note = makeNote();
    const onRemove = vi.fn();
    render(<NoteOverlay note={note} onUpdate={vi.fn()} onRemove={onRemove} />);
    const closeBtn = screen.getByTitle("Remove note");
    fireEvent.click(closeBtn);
    expect(onRemove).toHaveBeenCalledWith("test-note-1");
  });

  it("positions at note coordinates", () => {
    const note = makeNote({ x: 300, y: 400 });
    const { container } = render(
      <NoteOverlay note={note} onUpdate={vi.fn()} onRemove={vi.fn()} />,
    );
    const el = container.querySelector(".rl-note") as HTMLElement;
    expect(el.style.left).toBe("300px");
    expect(el.style.top).toBe("400px");
  });

  it("uses white text for high contrast on dark background", () => {
    const note = makeNote();
    const { container } = render(
      <NoteOverlay note={note} onUpdate={vi.fn()} onRemove={vi.fn()} />,
    );
    const textarea = container.querySelector(
      ".rl-note__textarea",
    ) as HTMLElement;
    // Textarea should NOT have an inline color style (uses CSS white)
    expect(textarea.style.color).toBe("");
  });
});
