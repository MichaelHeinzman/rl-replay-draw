import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";

interface DrawModeContextValue {
  drawMode: boolean;
  toolbarVisible: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  toggleDraw: () => void;
  hideToolbar: () => void;
  handleToolbarMouseEnter: () => void;
  handleToolbarMouseLeave: () => void;
}

const DrawModeContext = createContext<DrawModeContextValue | null>(null);

export function DrawModeProvider({ children }: { children: ReactNode }) {
  const [drawMode, setDrawMode] = useState(!window.electronAPI);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

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

  // Show toolbar when draw mode transitions from off to on
  const prevDrawMode = useRef(drawMode);
  useEffect(() => {
    if (drawMode && !prevDrawMode.current) {
      setToolbarVisible(true);
    }
    prevDrawMode.current = drawMode;
  }, [drawMode]);

  // When settings panel is open and draw mode is off, we need to capture
  // mouse events so buttons inside the panel are clickable.
  useEffect(() => {
    if (!showSettings || drawMode) return;
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(false);
    }
    return () => {
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      }
    };
  }, [showSettings, drawMode]);

  const handleToolbarMouseEnter = useCallback(() => {
    if (drawMode) return;
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(false);
    }
  }, [drawMode]);

  const handleToolbarMouseLeave = useCallback(() => {
    if (drawMode) return;
    if (showSettings) return;
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
  }, [drawMode, showSettings]);

  return (
    <DrawModeContext.Provider
      value={{
        drawMode,
        toolbarVisible,
        showSettings,
        setShowSettings,
        toggleDraw,
        hideToolbar,
        handleToolbarMouseEnter,
        handleToolbarMouseLeave,
      }}
    >
      {children}
    </DrawModeContext.Provider>
  );
}

export function useDrawModeContext() {
  const ctx = useContext(DrawModeContext);
  if (!ctx)
    throw new Error("useDrawModeContext must be used within DrawModeProvider");
  return ctx;
}
