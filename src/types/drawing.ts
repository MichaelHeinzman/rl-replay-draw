export interface Point {
  x: number;
  y: number;
}

export type Tool =
  | "freehand"
  | "line"
  | "rectangle"
  | "circle"
  | "arrow"
  | "note"
  | "image";

interface BaseShape {
  id: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
  createdAt: number;
}

export interface FreehandShape extends BaseShape {
  tool: "freehand";
  points: Point[];
}

export interface LineShape extends BaseShape {
  tool: "line";
  start: Point;
  end: Point;
}

export interface RectangleShape extends BaseShape {
  tool: "rectangle";
  start: Point;
  end: Point;
}

export interface CircleShape extends BaseShape {
  tool: "circle";
  center: Point;
  radiusX: number;
  radiusY: number;
}

export interface ArrowShape extends BaseShape {
  tool: "arrow";
  start: Point;
  end: Point;
}

export type Shape =
  | FreehandShape
  | LineShape
  | RectangleShape
  | CircleShape
  | ArrowShape;

export interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  createdAt: number;
}

export interface PlacedImage {
  id: string;
  /** data: URL or file path */
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}
