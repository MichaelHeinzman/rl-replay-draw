import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { OverlayProvider, useOverlayContext } from "../OverlayContext";
import { Note } from "../../types/drawing";

function wrapper({ children }: { children: ReactNode }) {
  return <OverlayProvider>{children}</OverlayProvider>;
}

// jsdom doesn't fire Image.onload; provide a minimal mock.
class MockImage {
  width = 100;
  height = 80;
  onload: ((e: Event) => void) | null = null;
  private _src = "";
  get src() {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
    // Fire onload asynchronously like a real browser
    setTimeout(() => this.onload?.(new Event("load")), 0);
  }
}

const OrigImage = globalThis.Image;
const originalElectronAPI = window.electronAPI;

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = originalElectronAPI;
  globalThis.Image = MockImage as unknown as typeof Image;
});

afterEach(() => {
  globalThis.Image = OrigImage;
  window.electronAPI = originalElectronAPI;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("OverlayContext", () => {
  it("starts with empty notes and images", () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });
    expect(result.current.notes).toEqual([]);
    expect(result.current.images).toEqual([]);
  });

  it("adds a note", () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });
    act(() => result.current.addNote("#00aaff"));
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].color).toBe("#00aaff");
    expect(result.current.notes[0].text).toBe("");
    expect(result.current.notes[0].width).toBe(520);
    expect(result.current.notes[0].height).toBe(360);
  });

  it("updates a note", () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });
    act(() => result.current.addNote("#00aaff"));
    const id = result.current.notes[0].id;

    act(() => result.current.updateNote(id, { text: "hello" }));
    expect(result.current.notes[0].text).toBe("hello");
  });

  it("removes a note", () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });
    act(() => result.current.addNote("#00aaff"));
    const id = result.current.notes[0].id;

    act(() => result.current.removeNote(id));
    expect(result.current.notes).toHaveLength(0);
  });

  it("loads persisted notes from localStorage", async () => {
    const savedNote: Note = {
      id: "saved-note",
      text: "persisted",
      x: 10,
      y: 20,
      color: "#00aaff",
      fontSize: 14,
      width: 320,
      height: 180,
      createdAt: 123,
      minimized: true,
      savedFilePath: "C:\\notes\\persisted.md",
      savedFormat: "md",
      savedTextSnapshot: "persisted",
      lastSavedAt: 456,
      isSaving: false,
    };
    localStorage.setItem("rl-replay-draw-notes", JSON.stringify([savedNote]));

    const { result } = renderHook(() => useOverlayContext(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.notes).toEqual([savedNote]);
  });

  it("saves a note as a browser download and records saved state", async () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useOverlayContext(), { wrapper });
    act(() => result.current.addNote("#00aaff"));
    const id = result.current.notes[0].id;
    act(() => result.current.updateNote(id, { text: "save me" }));

    await act(async () => {
      await result.current.saveNoteAs(id, "md");
    });

    expect(click).toHaveBeenCalled();
    expect(result.current.notes[0].savedFormat).toBe("md");
    expect(result.current.notes[0].savedTextSnapshot).toBe("save me");
    expect(result.current.notes[0].lastSavedAt).toEqual(expect.any(Number));
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(click).toHaveBeenCalled();
  });

  it("imports browser file content into an existing note", async () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });
    act(() => result.current.addNote("#00aaff"));
    const id = result.current.notes[0].id;
    const file = new File(["imported text"], "note.md", { type: "text/markdown" });

    await act(async () => {
      await result.current.importNoteInto(id, file);
    });

    expect(result.current.notes[0].text).toBe("imported text");
    expect(result.current.notes[0].savedTextSnapshot).toBeUndefined();
    expect(result.current.notes[0].minimized).toBe(false);
  });

  it("autosaves linked Electron notes after edits", async () => {
    vi.useFakeTimers();
    const saveNoteFile = vi.fn().mockResolvedValue({ canceled: false });
    window.electronAPI = {
      ...(originalElectronAPI as NonNullable<typeof window.electronAPI>),
      saveOverlayNotes: vi.fn().mockResolvedValue([]),
      getOverlayNotes: vi.fn().mockResolvedValue([]),
      saveNoteFile,
    } as NonNullable<typeof window.electronAPI>;

    const { result } = renderHook(() => useOverlayContext(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => result.current.addNote("#00aaff"));
    const id = result.current.notes[0].id;
    act(() =>
      result.current.updateNote(id, {
        text: "changed",
        savedFilePath: "C:\\notes\\linked.txt",
        savedFormat: "txt",
        savedTextSnapshot: "original",
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(saveNoteFile).toHaveBeenCalledWith(
      expect.objectContaining({ body: "changed" }),
      "txt",
      "C:\\notes\\linked.txt",
    );

    window.electronAPI = originalElectronAPI;
    vi.useRealTimers();
  });

  it("adds an image via data URL", async () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });
    const dataUrl = "data:image/png;base64,abc";

    await act(async () => {
      result.current.addImage(dataUrl);
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.images).toHaveLength(1);
    expect(result.current.images[0].src).toBe(dataUrl);
  });

  it("updates an image", async () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });

    await act(async () => {
      result.current.addImage("data:image/png;base64,abc");
      await new Promise((r) => setTimeout(r, 50));
    });

    const id = result.current.images[0].id;
    act(() => result.current.updateImage(id, { x: 999 }));
    expect(result.current.images[0].x).toBe(999);
  });

  it("removes an image", async () => {
    const { result } = renderHook(() => useOverlayContext(), { wrapper });

    await act(async () => {
      result.current.addImage("data:image/png;base64,abc");
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.images).toHaveLength(1);
    const id = result.current.images[0].id;

    act(() => result.current.removeImage(id));
    expect(result.current.images).toHaveLength(0);
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useOverlayContext())).toThrow(
      "useOverlayContext must be used within OverlayProvider",
    );
  });
});
