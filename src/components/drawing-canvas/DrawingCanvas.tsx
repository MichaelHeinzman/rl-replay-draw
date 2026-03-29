import {
  useRef,
  useEffect,
  useCallback,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from "react";
import { Shape, Point, Particle } from "../../types/drawing";
import { GLOW } from "../../lib/theme";
import "./drawing-canvas.css";

/* ── helpers ── */

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return h;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ── shape rendering ── */

function drawShapePath(ctx: CanvasRenderingContext2D, shape: Shape) {
  switch (shape.tool) {
    case "freehand": {
      const pts = shape.points;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      break;
    }
    case "line":
      ctx.beginPath();
      ctx.moveTo(shape.start.x, shape.start.y);
      ctx.lineTo(shape.end.x, shape.end.y);
      ctx.stroke();
      break;
    case "rectangle": {
      const x = Math.min(shape.start.x, shape.end.x);
      const y = Math.min(shape.start.y, shape.end.y);
      const w = Math.abs(shape.end.x - shape.start.x);
      const h = Math.abs(shape.end.y - shape.start.y);
      ctx.strokeRect(x, y, w, h);
      break;
    }
    case "circle":
      ctx.beginPath();
      ctx.ellipse(
        shape.center.x,
        shape.center.y,
        Math.max(1, shape.radiusX),
        Math.max(1, shape.radiusY),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    case "arrow": {
      const { start, end } = shape;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // arrowhead
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = 16 + shape.strokeWidth * 2;
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle - Math.PI / 6),
        end.y - headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLen * Math.cos(angle + Math.PI / 6),
        end.y - headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();
      break;
    }
  }
}

function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  now: number,
  isPreview: boolean,
) {
  const age = now - shape.createdAt;
  const entryT = Math.min(1, age / GLOW.entryDuration);

  // Sinusoidal glow pulse unique per shape
  const phase =
    Math.sin(now * GLOW.pulseSpeed + hashId(shape.id) * 0.1) * 0.5 + 0.5;
  const baseBlur = GLOW.minBlur + (GLOW.maxBlur - GLOW.minBlur) * phase;

  // Entry flash: bright burst that decays
  const entryBlur = isPreview ? 0 : (1 - entryT) * GLOW.entryExtraBlur;
  const entryBrightness = isPreview ? 1 : 1 + (1 - entryT) * 1.2;

  // Entry scale (subtle pop)
  const entryScale = isPreview ? 1 : 1 + (1 - entryT) * 0.03;

  ctx.save();

  // Apply entry scale around shape center
  if (entryScale !== 1) {
    const center = getShapeCenter(shape);
    ctx.translate(center.x, center.y);
    ctx.scale(entryScale, entryScale);
    ctx.translate(-center.x, -center.y);
  }

  const [r, g, b] = hexToRgb(shape.color);

  ctx.strokeStyle = `rgba(${Math.min(255, r * entryBrightness)}, ${Math.min(255, g * entryBrightness)}, ${Math.min(255, b * entryBrightness)}, 1)`;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = shape.color;
  ctx.shadowBlur = baseBlur + entryBlur;

  // First pass: main stroke with glow
  drawShapePath(ctx, shape);

  // Second pass: softer wider glow
  ctx.globalAlpha = 0.35;
  ctx.shadowBlur = (baseBlur + entryBlur) * 1.8;
  ctx.lineWidth = shape.strokeWidth + 2;
  drawShapePath(ctx, shape);

  // Third pass: bright core
  ctx.globalAlpha = 0.6;
  ctx.shadowBlur = 2;
  ctx.lineWidth = Math.max(1, shape.strokeWidth - 1);
  ctx.strokeStyle = `rgba(${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)}, 0.8)`;
  drawShapePath(ctx, shape);

  ctx.restore();
}

function getShapeCenter(shape: Shape): Point {
  switch (shape.tool) {
    case "freehand": {
      const pts = shape.points;
      if (pts.length === 0) return { x: 0, y: 0 };
      const sum = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), {
        x: 0,
        y: 0,
      });
      return { x: sum.x / pts.length, y: sum.y / pts.length };
    }
    case "line":
    case "rectangle":
    case "arrow":
      return {
        x: (shape.start.x + shape.end.x) / 2,
        y: (shape.start.y + shape.end.y) / 2,
      };
    case "circle":
      return shape.center;
  }
}

/* ── particle rendering / update ── */

function updateParticles(particles: Particle[], dt: number): Particle[] {
  const alive: Particle[] = [];
  for (const p of particles) {
    p.x += p.vx * dt * 0.06;
    p.y += p.vy * dt * 0.06;
    p.life -= dt;
    if (p.life > 0) alive.push(p);
  }
  return alive;
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12 * alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();

    // bright core
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ── component ── */

interface DrawingCanvasProps {
  shapes: Shape[];
  currentShape: Shape | null;
  particlesRef: MutableRefObject<Particle[]>;
  drawMode: boolean;
  onPointerDown: (point: Point) => void;
  onPointerMove: (point: Point) => void;
  onPointerUp: () => void;
}

export default function DrawingCanvas({
  shapes,
  currentShape,
  particlesRef,
  drawMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef(shapes);
  const currentShapeRef = useRef(currentShape);
  const drawingRef = useRef(false);
  const lastTimeRef = useRef(0);

  shapesRef.current = shapes;
  currentShapeRef.current = currentShape;

  /* resize canvas to fill viewport */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* animation loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    function frame(timestamp: number) {
      if (!running || !ctx || !canvas) return;
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;
      const now = Date.now();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Completed shapes
      for (const shape of shapesRef.current) {
        renderShape(ctx, shape, now, false);
      }

      // Shape being drawn
      if (currentShapeRef.current) {
        renderShape(ctx, currentShapeRef.current, now, true);
      }

      // Particles
      particlesRef.current = updateParticles(particlesRef.current, dt);
      renderParticles(ctx, particlesRef.current);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return () => {
      running = false;
    };
  }, [particlesRef]);

  /* pointer → canvas coords */
  const getPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      drawingRef.current = true;
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      onPointerDown(getPoint(e));
    },
    [onPointerDown, getPoint],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      onPointerMove(getPoint(e));
    },
    [onPointerMove, getPoint],
  );

  const handlePointerUp = useCallback(() => {
    drawingRef.current = false;
    onPointerUp();
  }, [onPointerUp]);

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas ${drawMode ? "drawing-canvas--active" : ""}`}
      onPointerDown={drawMode ? handlePointerDown : undefined}
      onPointerMove={drawMode ? handlePointerMove : undefined}
      onPointerUp={drawMode ? handlePointerUp : undefined}
      onPointerLeave={drawMode ? handlePointerUp : undefined}
    />
  );
}
