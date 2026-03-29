import { useEffect, useState, useCallback } from "react";
import DrawingCanvas from "./components/drawing-canvas/DrawingCanvas";
import Toolbar from "./components/toolbar/Toolbar";
import SettingsPanel from "./components/settings-panel/SettingsPanel";
import { useDrawing } from "./hooks/useDrawing";
import { useSettings } from "./hooks/useSettings";
import { Tool } from "./types/drawing";
import {
  AppSettings,
  KeyBinds,
  KEYBIND_TO_TOOL,
  ToolbarPosition,
} from "./types/settings";

function matchesKey(e: KeyboardEvent, bind: string): boolean {
  const parts = bind.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const needsCtrl = parts.includes("ctrl");
  const needsAlt = parts.includes("alt");
  const needsShift = parts.includes("shift");
  const needsMeta = parts.includes("meta");

  if (needsCtrl !== (e.ctrlKey || e.metaKey)) return false;
  if (needsAlt !== e.altKey) return false;
  if (needsShift !== e.shiftKey) return false;
  if (needsMeta && !e.metaKey) return false;

  const pressed = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  return pressed === key;
}

export default function App() {
  const drawing = useDrawing();
  const { settings, updateSettings } = useSettings();
  const [drawMode, setDrawMode] = useState(!window.electronAPI);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(
    settings.toolbarPosition,
  );

  // Sync toolbar position when settings load
  useEffect(() => {
    setToolbarPos(settings.toolbarPosition);
  }, [settings.toolbarPosition]);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getDrawMode().then(setDrawMode);
    window.electronAPI.onDrawModeChanged(setDrawMode);
  }, []);

  const toggleDraw = useCallback(() => {
    if (drawMode) {
      if (window.electronAPI) {
        window.electronAPI.exitDrawMode();
      } else {
        setDrawMode(false);
      }
    } else {
      if (window.electronAPI) {
        window.electronAPI.enterDrawMode();
      } else {
        setDrawMode(true);
      }
    }
  }, [drawMode]);

  const hideToolbar = useCallback(() => {
    setToolbarVisible(false);
  }, []);

  // When toolbar is visible but draw mode is off, let the toolbar
  // intercept mouse events on hover so its buttons remain clickable
  // while the rest of the overlay passes clicks through to the game.
  const handleToolbarMouseEnter = useCallback(() => {
    if (drawMode) return; // already capturing everything
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(false);
    }
  }, [drawMode]);

  const handleToolbarMouseLeave = useCallback(() => {
    if (drawMode) return;
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
  }, [drawMode]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Settings panel eats all keys
      if (showSettings) return;

      const kb = settings.keyBinds;

      // Toggle draw on / off
      if (matchesKey(e, kb.toggleDraw)) {
        e.preventDefault();
        toggleDraw();
        return;
      }

      // Exit draw (same as turning off)
      if (drawMode && matchesKey(e, kb.exitDraw)) {
        e.preventDefault();
        if (window.electronAPI) {
          window.electronAPI.exitDrawMode();
        } else {
          setDrawMode(false);
        }
        return;
      }

      if (!drawMode) return;

      // Undo / redo
      if (matchesKey(e, kb.undo)) {
        e.preventDefault();
        drawing.undo();
        return;
      }
      if (matchesKey(e, kb.redo)) {
        e.preventDefault();
        drawing.redo();
        return;
      }

      // Tool shortcuts
      for (const [bindName, tool] of Object.entries(KEYBIND_TO_TOOL)) {
        const bindKey = bindName as keyof KeyBinds;
        if (tool && matchesKey(e, kb[bindKey])) {
          drawing.setActiveTool(tool);
          return;
        }
      }
    },
    [drawing, drawMode, settings.keyBinds, showSettings, toggleDraw],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Show toolbar when toggling draw mode on while it's hidden
  useEffect(() => {
    if (drawMode && !toolbarVisible) {
      setToolbarVisible(true);
    }
  }, [drawMode, toolbarVisible]);

  const handlePositionChange = useCallback(
    (pos: ToolbarPosition | null) => {
      setToolbarPos(pos);
      updateSettings({ ...settings, toolbarPosition: pos });
    },
    [settings, updateSettings],
  );

  const handleSaveSettings = useCallback(
    (next: AppSettings) => {
      updateSettings(next);
    },
    [updateSettings],
  );

  return (
    <main className={`app-root ${drawMode ? "app-root--draw" : ""}`}>
      {toolbarVisible && (
        <Toolbar
          activeTool={drawing.activeTool}
          activeColor={drawing.activeColor}
          strokeWidth={drawing.strokeWidth}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          keyBinds={settings.keyBinds}
          position={toolbarPos}
          drawMode={drawMode}
          onToolChange={drawing.setActiveTool}
          onColorChange={drawing.setActiveColor}
          onStrokeWidthChange={drawing.setStrokeWidth}
          onUndo={drawing.undo}
          onRedo={drawing.redo}
          onClear={drawing.clear}
          onToggleDraw={toggleDraw}
          onHide={hideToolbar}
          onOpenSettings={() => setShowSettings(true)}
          onPositionChange={handlePositionChange}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        />
      )}
      <DrawingCanvas
        shapes={drawing.shapes}
        currentShape={drawing.currentShape}
        particlesRef={drawing.particlesRef}
        drawMode={drawMode}
        onPointerDown={drawing.startShape}
        onPointerMove={drawing.updateShape}
        onPointerUp={drawing.finishShape}
      />
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {!toolbarVisible && (
        <div className="mode-hint">
          Press {settings.keyBinds.toggleDraw} to draw
        </div>
      )}
    </main>
  );
}
