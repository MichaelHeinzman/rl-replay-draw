import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { OverlayProvider, useOverlayContext } from "../OverlayContext";

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

beforeEach(() => {
  globalThis.Image = MockImage as unknown as typeof Image;
});

afterEach(() => {
  globalThis.Image = OrigImage;
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
