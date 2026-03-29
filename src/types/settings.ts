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

export interface AppSettings {
  keyBinds: KeyBinds;
  toolbarPosition: ToolbarPosition | null;
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
