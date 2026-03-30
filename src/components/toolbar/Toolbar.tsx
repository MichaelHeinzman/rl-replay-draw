import {
  useRef,
  useState,
  useCallback,
  PointerEvent,
  ChangeEvent,
} from "react";
import { Tool } from "../../types/drawing";
import { COLOR_PALETTE } from "../../lib/theme";
import { gridToLayout, KeyBinds } from "../../types/settings";
import { useSettingsContext } from "../../contexts/SettingsContext";
import { useDrawModeContext } from "../../contexts/DrawModeContext";
import { useDrawingContext } from "../../contexts/DrawingContext";
import { useOverlayContext } from "../../contexts/OverlayContext";
import "./toolbar.css";

const DRAW_TOOLS: { id: Tool; label: string; bindKey: keyof KeyBinds }[] = [
  { id: "freehand", label: "Freehand", bindKey: "toolFreehand" },
  { id: "line", label: "Line", bindKey: "toolLine" },
  { id: "rectangle", label: "Rect", bindKey: "toolRectangle" },
  { id: "circle", label: "Circle", bindKey: "toolCircle" },
  { id: "arrow", label: "Arrow", bindKey: "toolArrow" },
];

const WIDTHS = [2, 3, 5, 8];

function formatKey(key: string): string {
  return key
    .split("+")
    .map((p) => {
      if (p.length === 1) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("+");
}

export default function Toolbar() {
  const { settings, addCustomColor, removeCustomColor, setToolbarPosition } =
    useSettingsContext();
  const {
    drawMode,
    toggleDraw,
    hideToolbar,
    setShowSettings,
    handleToolbarMouseEnter,
    handleToolbarMouseLeave,
  } = useDrawModeContext();
  const {
    activeTool,
    activeColor,
    strokeWidth,
    canUndo,
    canRedo,
    setActiveTool,
    setActiveColor,
    setStrokeWidth,
    undo,
    redo,
    clear,
  } = useDrawingContext();
  const { addNote, addImage } = useOverlayContext();

  const keyBinds = settings.keyBinds;
  const layout = gridToLayout(settings.toolbarGrid);
  const position = settings.toolbarPosition;
  const customColors = settings.customColors;

  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const colorInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingColor, setPendingColor] = useState("#ffffff");

  const vertical = layout === "vertical";
  const allColors = [...COLOR_PALETTE, ...customColors];

  // Grid-based CSS class when no drag position override
  const gridClass = !position
    ? `rl-toolbar--grid-${settings.toolbarGrid.row}-${settings.toolbarGrid.col}`
    : "";

  const posStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, translate: "none" }
    : {};

  const handleDragStart = useCallback((e: PointerEvent<HTMLDivElement>) => {
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
      setToolbarPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    },
    [setToolbarPosition],
  );

  const handleDragEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleResetPosition = useCallback(() => {
    setToolbarPosition(null);
  }, [setToolbarPosition]);

  const handleAddColor = () => {
    if (pendingColor && !allColors.includes(pendingColor)) {
      addCustomColor(pendingColor);
      setActiveColor(pendingColor);
    }
    setShowColorPicker(false);
  };

  const handleImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        addImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddNote = () => addNote(activeColor);

  return (
    <div
      ref={toolbarRef}
      className={`rl-toolbar ${vertical ? "rl-toolbar--vertical" : ""} ${gridClass}`}
      style={posStyle}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onMouseEnter={handleToolbarMouseEnter}
      onMouseLeave={handleToolbarMouseLeave}
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
            onClick={toggleDraw}
            title={`Toggle Draw (${formatKey(keyBinds.toggleDraw)})`}
          >
            {drawMode ? "✦ On" : "Off"}
          </button>
        </div>
      </div>

      {/* Drawing Tools */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">TOOL</span>
        <div className="rl-toolbar__buttons">
          {DRAW_TOOLS.map((t) => (
            <button
              key={t.id}
              className={`rl-toolbar__btn ${activeTool === t.id ? "rl-toolbar__btn--active" : ""}`}
              onClick={() => setActiveTool(t.id)}
              disabled={!drawMode}
              title={`${t.label} (${formatKey(keyBinds[t.bindKey])})`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Place Tools — Notes & Images */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">PLACE</span>
        <div className="rl-toolbar__buttons">
          <button
            className="rl-toolbar__btn"
            onClick={handleAddNote}
            disabled={!drawMode}
            title="Add a text note"
          >
            📝 Note
          </button>
          <button
            className="rl-toolbar__btn"
            onClick={() => imageInputRef.current?.click()}
            disabled={!drawMode}
            title="Place an image on screen"
          >
            🖼️ Image
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,.svg"
            className="rl-toolbar__file-input"
            onChange={handleImageFile}
          />
        </div>
      </div>

      {/* Colors */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">COLOR</span>
        <div className="rl-toolbar__colors">
          {allColors.map((c) => (
            <button
              key={c}
              className={`rl-toolbar__color ${activeColor === c ? "rl-toolbar__color--active" : ""}`}
              style={{ "--swatch-color": c } as React.CSSProperties}
              onClick={() => setActiveColor(c)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!(COLOR_PALETTE as readonly string[]).includes(c))
                  removeCustomColor(c);
              }}
              disabled={!drawMode}
              title={
                (COLOR_PALETTE as readonly string[]).includes(c)
                  ? c
                  : `${c} (right-click to remove)`
              }
            />
          ))}
          {/* Color picker toggle */}
          {showColorPicker ? (
            <div className="rl-toolbar__color-picker">
              <input
                ref={colorInputRef}
                type="color"
                value={pendingColor}
                onChange={(e) => setPendingColor(e.target.value)}
                className="rl-toolbar__color-input"
              />
              <button
                className="rl-toolbar__btn rl-toolbar__btn--tiny"
                onClick={handleAddColor}
              >
                ✓
              </button>
              <button
                className="rl-toolbar__btn rl-toolbar__btn--tiny"
                onClick={() => setShowColorPicker(false)}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="rl-toolbar__color rl-toolbar__color--add"
              onClick={() => setShowColorPicker(true)}
              disabled={!drawMode}
              title="Add custom color"
            >
              +
            </button>
          )}
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
              onClick={() => setStrokeWidth(w)}
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

      {/* Actions — always enabled */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">ACTIONS</span>
        <div className="rl-toolbar__buttons">
          <button
            className="rl-toolbar__btn"
            onClick={undo}
            disabled={!canUndo}
            title={`Undo (${formatKey(keyBinds.undo)})`}
          >
            Undo
          </button>
          <button
            className="rl-toolbar__btn"
            onClick={redo}
            disabled={!canRedo}
            title={`Redo (${formatKey(keyBinds.redo)})`}
          >
            Redo
          </button>
          <button
            className="rl-toolbar__btn rl-toolbar__btn--danger"
            onClick={clear}
            title="Clear All"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Toolbar controls — always enabled */}
      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">VIEW</span>
        <div className="rl-toolbar__buttons">
          <button
            className="rl-toolbar__btn rl-toolbar__btn--hide"
            onClick={hideToolbar}
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
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
    </div>
  );
}
