import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { DrawModeProvider, useDrawModeContext } from "../DrawModeContext";

function wrapper({ children }: { children: ReactNode }) {
  return <DrawModeProvider>{children}</DrawModeProvider>;
}

describe("DrawModeContext", () => {
  it("starts with draw mode on when no electronAPI", () => {
    const { result } = renderHook(() => useDrawModeContext(), { wrapper });
    // No window.electronAPI → drawMode defaults to true
    expect(result.current.drawMode).toBe(true);
  });

  it("starts with toolbar visible", () => {
    const { result } = renderHook(() => useDrawModeContext(), { wrapper });
    expect(result.current.toolbarVisible).toBe(true);
  });

  it("starts with settings hidden", () => {
    const { result } = renderHook(() => useDrawModeContext(), { wrapper });
    expect(result.current.showSettings).toBe(false);
  });

  it("toggles draw mode off and on", () => {
    const { result } = renderHook(() => useDrawModeContext(), { wrapper });
    expect(result.current.drawMode).toBe(true);

    act(() => result.current.toggleDraw());
    expect(result.current.drawMode).toBe(false);

    act(() => result.current.toggleDraw());
    expect(result.current.drawMode).toBe(true);
  });

  it("hides the toolbar", () => {
    const { result } = renderHook(() => useDrawModeContext(), { wrapper });
    // Turn draw off first so the "show on draw-on" effect doesn't interfere
    act(() => result.current.toggleDraw()); // off
    act(() => result.current.hideToolbar());
    expect(result.current.toolbarVisible).toBe(false);
  });

  it("shows toolbar again when draw mode transitions from off to on", () => {
    const { result } = renderHook(() => useDrawModeContext(), { wrapper });

    // Hide toolbar, turn draw off, then on again
    act(() => result.current.hideToolbar());
    act(() => result.current.toggleDraw()); // off
    expect(result.current.toolbarVisible).toBe(false);

    act(() => result.current.toggleDraw()); // on → should show toolbar
    expect(result.current.toolbarVisible).toBe(true);
  });

  it("sets showSettings", () => {
    const { result } = renderHook(() => useDrawModeContext(), { wrapper });
    act(() => result.current.setShowSettings(true));
    expect(result.current.showSettings).toBe(true);
    act(() => result.current.setShowSettings(false));
    expect(result.current.showSettings).toBe(false);
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useDrawModeContext())).toThrow(
      "useDrawModeContext must be used within DrawModeProvider",
    );
  });
});
