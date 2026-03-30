import { useEffect, useCallback } from "react";
import DrawingCanvas from "./components/drawing-canvas/DrawingCanvas";
import Toolbar from "./components/toolbar/Toolbar";
import SettingsPanel from "./components/settings-panel/SettingsPanel";
import NoteOverlay from "./components/note-overlay/NoteOverlay";
import ImageOverlay from "./components/image-overlay/ImageOverlay";
import {
  SettingsProvider,
  useSettingsContext,
} from "./contexts/SettingsContext";
import {
  DrawModeProvider,
  useDrawModeContext,
} from "./contexts/DrawModeContext";
import { DrawingProvider, useDrawingContext } from "./contexts/DrawingContext";
import { OverlayProvider, useOverlayContext } from "./contexts/OverlayContext";
import { KeyBinds, KEYBIND_TO_TOOL } from "./types/settings";

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

function AppShell() {
  const { settings } = useSettingsContext();
  const { drawMode, toolbarVisible, showSettings, toggleDraw } =
    useDrawModeContext();
  const drawing = useDrawingContext();
  const overlay = useOverlayContext();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showSettings) return;

      const kb = settings.keyBinds;

      if (matchesKey(e, kb.toggleDraw)) {
        e.preventDefault();
        toggleDraw();
        return;
      }

      if (drawMode && matchesKey(e, kb.exitDraw)) {
        e.preventDefault();
        if (window.electronAPI) {
          window.electronAPI.exitDrawMode();
        }
        return;
      }

      if (!drawMode) return;

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

  return (
    <main className={`app-root ${drawMode ? "app-root--draw" : ""}`}>
      {toolbarVisible && <Toolbar />}

      {overlay.images.map((img) => (
        <ImageOverlay
          key={img.id}
          image={img}
          onUpdate={overlay.updateImage}
          onRemove={overlay.removeImage}
        />
      ))}

      {overlay.notes.map((note) => (
        <NoteOverlay
          key={note.id}
          note={note}
          onUpdate={overlay.updateNote}
          onRemove={overlay.removeNote}
        />
      ))}

      <DrawingCanvas
        shapes={drawing.shapes}
        currentShape={drawing.currentShape}
        particlesRef={drawing.particlesRef}
        drawMode={drawMode}
        onPointerDown={drawing.startShape}
        onPointerMove={drawing.updateShape}
        onPointerUp={drawing.finishShape}
      />

      {showSettings && <SettingsPanel />}

      {!toolbarVisible && (
        <div className="mode-hint">
          Press {settings.keyBinds.toggleDraw} to draw
        </div>
      )}
    </main>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <DrawModeProvider>
        <DrawingProvider>
          <OverlayProvider>
            <AppShell />
          </OverlayProvider>
        </DrawingProvider>
      </DrawModeProvider>
    </SettingsProvider>
  );
}
