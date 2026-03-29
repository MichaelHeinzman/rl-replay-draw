import { useRef, useState, useCallback, useEffect, PointerEvent } from "react";
import { Tool } from "../../types/drawing";
import { COLOR_PALETTE } from "../../lib/theme";
import { ToolbarPosition, KeyBinds } from "../../types/settings";
import "./toolbar.css";

const TOOLS: { id: Tool; label: string; bindKey: keyof KeyBinds }[] = [
  { id: "freehand", label: "Freehand", bindKey: "toolFreehand" },
  { id: "line", label: "Line", bindKey: "toolLine" },
  { id: "rectangle", label: "Rect", bindKey: "toolRectangle" },
  { id: "circle", label: "Circle", bindKey: "toolCircle" },
  { id: "arrow", label: "Arrow", bindKey: "toolArrow" },
];

const WIDTHS = [2, 3, 5, 8];

interface ToolbarProps {
  activeTool: Tool;
  activeColor: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  keyBinds: KeyBinds;
  position: ToolbarPosition | null;
  drawMode: boolean;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToggleDraw: () => void;
  onHide: () => void;
  onOpenSettings: () => void;
  onPositionChange: (pos: ToolbarPosition | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function formatKey(key: string): string {
  return key
    .split("+")
    .map((p) => {
      if (p.length === 1) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("+");
}

export default function Toolbar({
  activeTool,
  activeColor,
  strokeWidth,
  canUndo,
  canRedo,
  keyBinds,
  position,
  drawMode,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  onToggleDraw,
  onHide,
  onOpenSettings,
  onPositionChange,
  onMouseEnter,
  onMouseLeave,
}: ToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [vertical, setVertical] = useState(false);

  // Apply position via inline style
  const posStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, translate: "none" }
    : {};

  const handleDragStart = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // Only drag on the handle area
    const target = e.target as HTMLElement;
    if (!target.classList.contains("rl-toolbar__drag-handle")) return;

    dragging.current = true;
    const rect = toolbarRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleDragMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const x = e.clientX - dragOffset.current.x;
      const y = e.clientY - dragOffset.current.y;
      onPositionChange({ x, y });
    },
    [onPositionChange],
  );

  const handleDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleResetPosition = useCallback(() => {
    onPositionChange(null);
  }, [onPositionChange]);

  return (
    <div
      ref={toolbarRef}
      className={`rl-toolbar ${vertical ? "rl-toolbar--vertical" : ""}`}
      style={posStyle}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="rl-toolbar__scanline" />

      {/* Drag handle */}
      <div
        className="rl-toolbar__drag-handle"
        onPointerDown={handleDragStart}
        title="Drag to move toolbar"
      >
        ⠿
      </div>

      {/* Draw On/Off toggle */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">DRAW</span>
        <div className="rl-toolbar__buttons">
          <button
            className={`rl-toolbar__btn ${drawMode ? "rl-toolbar__btn--on" : "rl-toolbar__btn--off"}`}
            onClick={onToggleDraw}
            title={`Toggle Draw (${formatKey(keyBinds.toggleDraw)})`}
          >
            {drawMode ? "✦ On" : "Off"}
          </button>
        </div>
      </div>

      {/* Tools */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">TOOL</span>
        <div className="rl-toolbar__buttons">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`rl-toolbar__btn ${activeTool === t.id ? "rl-toolbar__btn--active" : ""}`}
              onClick={() => onToolChange(t.id)}
              disabled={!drawMode}
              title={`${t.label} (${formatKey(keyBinds[t.bindKey])})`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">COLOR</span>
        <div className="rl-toolbar__colors">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              className={`rl-toolbar__color ${activeColor === c ? "rl-toolbar__color--active" : ""}`}
              style={
                {
                  "--swatch-color": c,
                } as React.CSSProperties
              }
              onClick={() => onColorChange(c)}
              disabled={!drawMode}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">SIZE</span>
        <div className="rl-toolbar__buttons">
          {WIDTHS.map((w) => (
            <button
              key={w}
              className={`rl-toolbar__btn rl-toolbar__btn--size ${strokeWidth === w ? "rl-toolbar__btn--active" : ""}`}
              onClick={() => onStrokeWidthChange(w)}
              disabled={!drawMode}
            >
              <span
                className="rl-toolbar__size-dot"
                style={{ width: w + 4, height: w + 4 }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">ACTIONS</span>
        <div className="rl-toolbar__buttons">
          <button
            className="rl-toolbar__btn"
            onClick={onUndo}
            disabled={!canUndo || !drawMode}
            title={`Undo (${formatKey(keyBinds.undo)})`}
          >
            Undo
          </button>
          <button
            className="rl-toolbar__btn"
            onClick={onRedo}
            disabled={!canRedo || !drawMode}
            title={`Redo (${formatKey(keyBinds.redo)})`}
          >
            Redo
          </button>
          <button
            className="rl-toolbar__btn rl-toolbar__btn--danger"
            onClick={onClear}
            disabled={!drawMode}
            title="Clear All"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Toolbar controls */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">VIEW</span>
        <div className="rl-toolbar__buttons">
          <button
            className="rl-toolbar__btn"
            onClick={() => setVertical((v) => !v)}
            title={vertical ? "Switch to horizontal" : "Switch to vertical"}
          >
            {vertical ? "━" : "┃"}
          </button>
          <button
            className="rl-toolbar__btn rl-toolbar__btn--hide"
            onClick={onHide}
            title="Hide toolbar"
          >
            ✕
          </button>
          {position && (
            <button
              className="rl-toolbar__btn"
              onClick={handleResetPosition}
              title="Reset position to center"
            >
              ↺
            </button>
          )}
          <button
            className="rl-toolbar__btn rl-toolbar__btn--settings"
            onClick={onOpenSettings}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
    </div>
  );
}
