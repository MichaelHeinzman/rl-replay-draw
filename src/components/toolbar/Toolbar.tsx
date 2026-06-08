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
    .map((part) => {
      if (part.length === 1) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
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
  const gridClass = !position
    ? `rl-toolbar--grid-${settings.toolbarGrid.row}-${settings.toolbarGrid.col}`
    : "";

  const posStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, translate: "none" }
    : {};

  const handleDragStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("rl-toolbar__drag-handle")) return;
    dragging.current = true;
    const rect = toolbarRef.current!.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    target.setPointerCapture(event.pointerId);
  }, []);

  const handleDragMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      setToolbarPosition({
        x: event.clientX - dragOffset.current.x,
        y: event.clientY - dragOffset.current.y,
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

  const handleImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        addImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

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

      <div
        className="rl-toolbar__drag-handle"
        onPointerDown={handleDragStart}
        title="Drag to move toolbar"
      >
        ⠿
      </div>

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

      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">TOOL</span>
        <div className="rl-toolbar__buttons">
          {DRAW_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`rl-toolbar__btn ${activeTool === tool.id ? "rl-toolbar__btn--active" : ""}`}
              onClick={() => setActiveTool(tool.id)}
              disabled={!drawMode}
              title={`${tool.label} (${formatKey(keyBinds[tool.bindKey])})`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">PLACE</span>
        <div className="rl-toolbar__buttons">
          <button
            className="rl-toolbar__btn"
            onClick={() => addNote(activeColor)}
            title="Create a new note"
          >
            Notes
          </button>
          <button
            className="rl-toolbar__btn"
            onClick={() => imageInputRef.current?.click()}
            disabled={!drawMode}
            title="Place an image on screen"
          >
            Image
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

      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">COLOR</span>
        <div className="rl-toolbar__colors">
          {allColors.map((color) => (
            <button
              key={color}
              className={`rl-toolbar__color ${activeColor === color ? "rl-toolbar__color--active" : ""}`}
              style={{ "--swatch-color": color } as React.CSSProperties}
              onClick={() => setActiveColor(color)}
              onContextMenu={(event) => {
                event.preventDefault();
                if (!(COLOR_PALETTE as readonly string[]).includes(color))
                  removeCustomColor(color);
              }}
              disabled={!drawMode}
              title={
                (COLOR_PALETTE as readonly string[]).includes(color)
                  ? color
                  : `${color} (right-click to remove)`
              }
            />
          ))}
          {showColorPicker ? (
            <div className="rl-toolbar__color-picker">
              <input
                ref={colorInputRef}
                type="color"
                value={pendingColor}
                onChange={(event) => setPendingColor(event.target.value)}
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

      <div className="rl-toolbar__group">
        <span className="rl-toolbar__label">SIZE</span>
        <div className="rl-toolbar__buttons">
          {WIDTHS.map((width) => (
            <button
              key={width}
              className={`rl-toolbar__btn rl-toolbar__btn--size ${strokeWidth === width ? "rl-toolbar__btn--active" : ""}`}
              onClick={() => setStrokeWidth(width)}
              disabled={!drawMode}
            >
              <span
                className="rl-toolbar__size-dot"
                style={{ width: width + 4, height: width + 4 }}
              />
            </button>
          ))}
        </div>
      </div>

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

      {window.electronAPI && (
        <div className="rl-toolbar__group">
          <span className="rl-toolbar__label">APP</span>
          <div className="rl-toolbar__buttons">
            <button
              className="rl-toolbar__btn rl-toolbar__btn--danger"
              onClick={() => window.electronAPI!.quitApp()}
              title="Quit RL Replay Draw"
            >
              Quit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
