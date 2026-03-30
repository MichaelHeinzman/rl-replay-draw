import { useState, useCallback, useRef } from "react";
import { Shape, Point, Tool, Particle } from "../types/drawing";
import { RL_COLORS, PARTICLE } from "../lib/theme";

let nextId = 1;
function uid(): string {
  return `s${nextId++}-${Date.now()}`;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function getShapeSpawnPoints(shape: Shape): Point[] {
  switch (shape.tool) {
    case "freehand":
      return shape.points.filter((_, i) => i % 4 === 0);
    case "line":
    case "arrow":
      return [shape.start, shape.end, midpoint(shape.start, shape.end)];
    case "rectangle": {
      const { start, end } = shape;
      return [
        start,
        end,
        { x: start.x, y: end.y },
        { x: end.x, y: start.y },
        midpoint(start, end),
      ];
    }
    case "circle":
      return [
        { x: shape.center.x + shape.radiusX, y: shape.center.y },
        { x: shape.center.x - shape.radiusX, y: shape.center.y },
        { x: shape.center.x, y: shape.center.y + shape.radiusY },
        { x: shape.center.x, y: shape.center.y - shape.radiusY },
      ];
  }
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function spawnParticles(shape: Shape): Particle[] {
  const points = getShapeSpawnPoints(shape);
  const count = Math.round(randomBetween(PARTICLE.countMin, PARTICLE.countMax));
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const pt = points[Math.floor(Math.random() * points.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(0.5, PARTICLE.speed);
    particles.push({
      x: pt.x,
      y: pt.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: shape.color,
      life: PARTICLE.life,
      maxLife: PARTICLE.life,
      size: randomBetween(PARTICLE.sizeMin, PARTICLE.sizeMax),
    });
  }
  return particles;
}

export function useDrawing() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [undoneShapes, setUndoneShapes] = useState<Shape[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("freehand");
  const [activeColor, setActiveColor] = useState<string>(RL_COLORS.blue);
  const [strokeWidth, setStrokeWidth] = useState(3);

  const currentShapeRef = useRef<Shape | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const startShape = useCallback(
    (point: Point) => {
      const base = {
        id: uid(),
        tool: activeTool,
        color: activeColor,
        strokeWidth,
        createdAt: Date.now(),
      };

      let shape: Shape;
      switch (activeTool) {
        case "freehand":
          shape = { ...base, tool: "freehand", points: [point] };
          break;
        case "line":
          shape = { ...base, tool: "line", start: point, end: point };
          break;
        case "rectangle":
          shape = { ...base, tool: "rectangle", start: point, end: point };
          break;
        case "circle":
          shape = {
            ...base,
            tool: "circle",
            center: point,
            radiusX: 0,
            radiusY: 0,
          };
          break;
        case "arrow":
          shape = { ...base, tool: "arrow", start: point, end: point };
          break;
        default:
          return;
      }

      currentShapeRef.current = shape;
      setCurrentShape(shape);
    },
    [activeTool, activeColor, strokeWidth],
  );

  const updateShape = useCallback((point: Point) => {
    const shape = currentShapeRef.current;
    if (!shape) return;

    let updated: Shape;
    switch (shape.tool) {
      case "freehand":
        updated = { ...shape, points: [...shape.points, point] };
        break;
      case "line":
        updated = { ...shape, end: point };
        break;
      case "rectangle":
        updated = { ...shape, end: point };
        break;
      case "circle":
        updated = {
          ...shape,
          radiusX: Math.abs(point.x - shape.center.x),
          radiusY: Math.abs(point.y - shape.center.y),
        };
        break;
      case "arrow":
        updated = { ...shape, end: point };
        break;
    }

    currentShapeRef.current = updated;
    setCurrentShape(updated);
  }, []);

  const finishShape = useCallback(() => {
    const shape = currentShapeRef.current;
    if (!shape) return;

    const finalShape = { ...shape, createdAt: Date.now() };
    currentShapeRef.current = null;
    setCurrentShape(null);
    setShapes((prev) => [...prev, finalShape]);
    setUndoneShapes([]);

    particlesRef.current = [
      ...particlesRef.current,
      ...spawnParticles(finalShape),
    ];
  }, []);

  const undo = useCallback(() => {
    setShapes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoneShapes((u) => [...u, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setUndoneShapes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setShapes((s) => [...s, { ...last, createdAt: Date.now() }]);
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setShapes([]);
    setUndoneShapes([]);
    particlesRef.current = [];
  }, []);

  return {
    shapes,
    currentShape,
    particlesRef,
    activeTool,
    activeColor,
    strokeWidth,
    canUndo: shapes.length > 0,
    canRedo: undoneShapes.length > 0,
    setActiveTool,
    setActiveColor,
    setStrokeWidth,
    startShape,
    updateShape,
    finishShape,
    undo,
    redo,
    clear,
  };
}
