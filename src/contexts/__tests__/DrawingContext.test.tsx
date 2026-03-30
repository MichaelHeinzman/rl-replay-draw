import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { DrawingProvider, useDrawingContext } from "../DrawingContext";

function wrapper({ children }: { children: ReactNode }) {
  return <DrawingProvider>{children}</DrawingProvider>;
}

describe("DrawingContext", () => {
  it("provides default drawing state", () => {
    const { result } = renderHook(() => useDrawingContext(), { wrapper });
    expect(result.current.activeTool).toBe("freehand");
    expect(result.current.activeColor).toBe("#00aaff");
    expect(result.current.strokeWidth).toBe(3);
    expect(result.current.shapes).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("changes tool", () => {
    const { result } = renderHook(() => useDrawingContext(), { wrapper });
    act(() => result.current.setActiveTool("arrow"));
    expect(result.current.activeTool).toBe("arrow");
  });

  it("changes color", () => {
    const { result } = renderHook(() => useDrawingContext(), { wrapper });
    act(() => result.current.setActiveColor("#ff4500"));
    expect(result.current.activeColor).toBe("#ff4500");
  });

  it("changes stroke width", () => {
    const { result } = renderHook(() => useDrawingContext(), { wrapper });
    act(() => result.current.setStrokeWidth(8));
    expect(result.current.strokeWidth).toBe(8);
  });

  it("draws a shape and supports undo/redo", () => {
    const { result } = renderHook(() => useDrawingContext(), { wrapper });

    act(() => result.current.startShape({ x: 10, y: 10 }));
    act(() => result.current.updateShape({ x: 50, y: 50 }));
    act(() => result.current.finishShape());

    expect(result.current.shapes).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.shapes).toHaveLength(0);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.shapes).toHaveLength(1);
  });

  it("clears all shapes", () => {
    const { result } = renderHook(() => useDrawingContext(), { wrapper });

    act(() => result.current.startShape({ x: 0, y: 0 }));
    act(() => result.current.finishShape());
    act(() => result.current.startShape({ x: 10, y: 10 }));
    act(() => result.current.finishShape());

    expect(result.current.shapes).toHaveLength(2);

    act(() => result.current.clear());
    expect(result.current.shapes).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useDrawingContext())).toThrow(
      "useDrawingContext must be used within DrawingProvider",
    );
  });
});
