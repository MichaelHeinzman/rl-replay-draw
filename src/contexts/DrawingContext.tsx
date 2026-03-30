import { createContext, useContext, ReactNode } from "react";
import { useDrawing } from "../hooks/useDrawing";
import { Shape, Point, Tool, Particle } from "../types/drawing";
import { MutableRefObject } from "react";

interface DrawingContextValue {
  shapes: Shape[];
  currentShape: Shape | null;
  particlesRef: MutableRefObject<Particle[]>;
  activeTool: Tool;
  activeColor: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  setActiveTool: (tool: Tool) => void;
  setActiveColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  startShape: (point: Point) => void;
  updateShape: (point: Point) => void;
  finishShape: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

const DrawingContext = createContext<DrawingContextValue | null>(null);

export function DrawingProvider({ children }: { children: ReactNode }) {
  const drawing = useDrawing();

  return (
    <DrawingContext.Provider value={drawing}>
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawingContext() {
  const ctx = useContext(DrawingContext);
  if (!ctx)
    throw new Error("useDrawingContext must be used within DrawingProvider");
  return ctx;
}
