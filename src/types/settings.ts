import { Tool } from "./drawing";

export interface KeyBinds {
  toggleDraw: string;
  exitDraw: string;
  toolFreehand: string;
  toolLine: string;
  toolRectangle: string;
  toolCircle: string;
  toolArrow: string;
  undo: string;
  redo: string;
}

export interface ToolbarPosition {
  x: number;
  y: number;
}

export type ToolbarLayout = "horizontal" | "vertical";

export type GridRow = "top" | "middle" | "bottom";
export type GridCol = "left" | "center" | "right";

export interface ToolbarGridPosition {
  row: GridRow;
  col: GridCol;
}

/** Derive orientation from the grid cell: side columns → vertical, otherwise → horizontal. */
export function gridToLayout(grid: ToolbarGridPosition): ToolbarLayout {
  return grid.col === "left" || grid.col === "right"
    ? "vertical"
    : "horizontal";
}

export interface AppSettings {
  keyBinds: KeyBinds;
  toolbarPosition: ToolbarPosition | null;
  toolbarGrid: ToolbarGridPosition;
  customColors: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  keyBinds: {
    toggleDraw: "F2",
    exitDraw: "Escape",
    toolFreehand: "f",
    toolLine: "l",
    toolRectangle: "r",
    toolCircle: "c",
    toolArrow: "a",
    undo: "ctrl+z",
    redo: "ctrl+y",
  },
  toolbarPosition: null,
  toolbarGrid: { row: "top", col: "center" },
  customColors: [],
};

export const KEYBIND_LABELS: Record<keyof KeyBinds, string> = {
  toggleDraw: "Toggle Draw Mode",
  exitDraw: "Exit Draw Mode",
  toolFreehand: "Freehand Tool",
  toolLine: "Line Tool",
  toolRectangle: "Rectangle Tool",
  toolCircle: "Circle Tool",
  toolArrow: "Arrow Tool",
  undo: "Undo",
  redo: "Redo",
};

export const KEYBIND_TO_TOOL: Partial<Record<keyof KeyBinds, Tool>> = {
  toolFreehand: "freehand",
  toolLine: "line",
  toolRectangle: "rectangle",
  toolCircle: "circle",
  toolArrow: "arrow",
};
