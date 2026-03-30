import { useState, useCallback, useEffect, useRef } from "react";
import {
  KeyBinds,
  KEYBIND_LABELS,
  DEFAULT_SETTINGS,
  GridRow,
  GridCol,
  ToolbarGridPosition,
} from "../../types/settings";
import { useSettingsContext } from "../../contexts/SettingsContext";
import { useDrawModeContext } from "../../contexts/DrawModeContext";
import "./settings-panel.css";

function formatKeyForDisplay(key: string): string {
  return key
    .split("+")
    .map((p) => {
      if (p.toLowerCase() === "ctrl") return "Ctrl";
      if (p.toLowerCase() === "alt") return "Alt";
      if (p.toLowerCase() === "shift") return "Shift";
      if (p.toLowerCase() === "meta") return "Meta";
      if (p.length === 1) return p.toUpperCase();
      return p;
    })
    .join(" + ");
}

function keyEventToString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  if (e.metaKey) parts.push("meta");

  const key = e.key;
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return "";

  if (key.length === 1) {
    parts.push(key.toLowerCase());
  } else {
    parts.push(key);
  }

  return parts.join("+");
}

const ROWS: GridRow[] = ["top", "middle", "bottom"];
const COLS: GridCol[] = ["left", "center", "right"];

export default function SettingsPanel() {
  const { settings, updateSettings, setToolbarGrid } = useSettingsContext();
  const { setShowSettings } = useDrawModeContext();

  const [draft, setDraft] = useState<KeyBinds>({ ...settings.keyBinds });
  const [draftGrid, setDraftGrid] = useState<ToolbarGridPosition>(
    settings.toolbarGrid,
  );
  const [recording, setRecording] = useState<keyof KeyBinds | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleRecord = useCallback(
    (e: KeyboardEvent) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();
      const combo = keyEventToString(e);
      if (!combo) return;
      setDraft((prev) => ({ ...prev, [recording]: combo }));
      setRecording(null);
    },
    [recording],
  );

  useEffect(() => {
    if (!recording) return;
    window.addEventListener("keydown", handleRecord, true);
    return () => window.removeEventListener("keydown", handleRecord, true);
  }, [recording, handleRecord]);

  const onClose = () => setShowSettings(false);

  const handleSave = () => {
    updateSettings({
      ...settings,
      keyBinds: draft,
      toolbarGrid: draftGrid,
      toolbarPosition: null,
    });
    onClose();
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_SETTINGS.keyBinds });
    setDraftGrid(DEFAULT_SETTINGS.toolbarGrid);
  };

  return (
    <div className="rl-settings-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="rl-settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rl-settings__scanline" />
        <div className="rl-settings__header">
          <span className="rl-settings__title">SETTINGS</span>
          <button className="rl-settings__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Grid position picker */}
        <div className="rl-settings__section">
          <span className="rl-settings__section-title">TOOLBAR POSITION</span>
          <div className="rl-settings__grid">
            {ROWS.map((row) => (
              <div key={row} className="rl-settings__grid-row">
                {COLS.map((col) => {
                  const active = draftGrid.row === row && draftGrid.col === col;
                  return (
                    <button
                      key={`${row}-${col}`}
                      className={`rl-settings__grid-cell ${active ? "rl-settings__grid-cell--active" : ""}`}
                      onClick={() => setDraftGrid({ row, col })}
                      title={`${row} ${col}`}
                    >
                      <span className="rl-settings__grid-dot" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <span className="rl-settings__grid-hint">
            Side columns = vertical · Top/bottom rows = horizontal
          </span>
        </div>

        {/* Key bindings */}
        <div className="rl-settings__section">
          <span className="rl-settings__section-title">KEY BINDINGS</span>
          <div className="rl-settings__binds">
            {(Object.keys(KEYBIND_LABELS) as (keyof KeyBinds)[]).map((key) => (
              <div key={key} className="rl-settings__bind-row">
                <span className="rl-settings__bind-label">
                  {KEYBIND_LABELS[key]}
                </span>
                <button
                  className={`rl-settings__bind-key ${recording === key ? "rl-settings__bind-key--recording" : ""}`}
                  onClick={() => setRecording(recording === key ? null : key)}
                >
                  {recording === key
                    ? "Press a key..."
                    : formatKeyForDisplay(draft[key])}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rl-settings__actions">
          <button className="rl-settings__btn" onClick={handleReset}>
            Reset Defaults
          </button>
          <button
            className="rl-settings__btn rl-settings__btn--primary"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
