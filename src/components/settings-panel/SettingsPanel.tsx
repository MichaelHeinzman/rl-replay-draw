import { useState, useCallback, useEffect, useRef } from "react";
import {
  AppSettings,
  KeyBinds,
  KEYBIND_LABELS,
  DEFAULT_SETTINGS,
} from "../../types/settings";
import "./settings-panel.css";

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

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
  // Don't record modifier-only presses
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return "";

  if (key.length === 1) {
    parts.push(key.toLowerCase());
  } else {
    parts.push(key);
  }

  return parts.join("+");
}

export default function SettingsPanel({
  settings,
  onSave,
  onClose,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<KeyBinds>({ ...settings.keyBinds });
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

  const handleSave = () => {
    onSave({ ...settings, keyBinds: draft });
    onClose();
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_SETTINGS.keyBinds });
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
