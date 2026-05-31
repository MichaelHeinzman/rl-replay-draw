const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

if (process.platform === "win32") {
  app.setAppUserModelId("com.michaelheinzman.rl-replay-draw");
}

let mainWindow = null;
let drawMode = false;

const isDev = !app.isPackaged;
const iconPath = isDev
  ? path.join(__dirname, "..", "build", "icon.ico")
  : path.join(process.resourcesPath, "build", "icon.ico");

/* ── Settings persistence ── */

const DEFAULT_SETTINGS = {
  keyBinds: {
    toggleDraw: "F2",
    exitDraw: "Escape",
    toolFreehand: "f",
    toolLine: "l",
    toolRectangle: "r",
    toolCircle: "c",
    toolArrow: "a",
    undo: "ctrl+z",
    redo: "ctrl+y",
  },
  toolbarPosition: null,
  toolbarGrid: { row: "top", col: "center" },
  customColors: [],
};

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keyBinds: { ...DEFAULT_SETTINGS.keyBinds, ...parsed.keyBinds },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

let settings = null;

/* Note persistence and file exchange */

const DEFAULT_NOTE_WIDTH = 520;
const DEFAULT_NOTE_HEIGHT = 360;

const DEFAULT_NOTE = {
  title: "Replay notes",
  body: "",
  updatedAt: null,
};

function getNotePath() {
  return path.join(app.getPath("userData"), "note.json");
}

function getOverlayNotesPath() {
  return path.join(app.getPath("userData"), "overlay-notes.json");
}

function normalizeNote(note) {
  return {
    ...DEFAULT_NOTE,
    ...note,
    title:
      typeof note?.title === "string" && note.title.trim()
        ? note.title.trim()
        : DEFAULT_NOTE.title,
    body: typeof note?.body === "string" ? note.body : "",
    updatedAt: note?.updatedAt || null,
  };
}

function loadNote() {
  try {
    const raw = fs.readFileSync(getNotePath(), "utf-8");
    return normalizeNote(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NOTE };
  }
}

function saveNote(note) {
  const normalized = normalizeNote({
    ...note,
    updatedAt: note?.updatedAt || new Date().toISOString(),
  });
  fs.writeFileSync(getNotePath(), JSON.stringify(normalized, null, 2));
  return normalized;
}

function normalizeOverlayNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map((note, index) => ({
    id: typeof note.id === "string" && note.id ? note.id : `n${Date.now()}-${index}`,
    text: typeof note.text === "string" ? note.text : "",
    x: typeof note.x === "number" ? note.x : 0,
    y: typeof note.y === "number" ? note.y : 0,
    color: typeof note.color === "string" ? note.color : "#00aaff",
    fontSize: typeof note.fontSize === "number" ? note.fontSize : 14,
    width: typeof note.width === "number" ? note.width : DEFAULT_NOTE_WIDTH,
    height: typeof note.height === "number" ? note.height : DEFAULT_NOTE_HEIGHT,
    createdAt: typeof note.createdAt === "number" ? note.createdAt : Date.now(),
    minimized: Boolean(note.minimized),
    savedFilePath:
      typeof note.savedFilePath === "string" ? note.savedFilePath : undefined,
    savedFormat: ["txt", "md", "html", "doc"].includes(note.savedFormat)
      ? note.savedFormat
      : undefined,
    savedTextSnapshot:
      typeof note.savedTextSnapshot === "string"
        ? note.savedTextSnapshot
        : undefined,
    lastSavedAt:
      typeof note.lastSavedAt === "number" ? note.lastSavedAt : undefined,
    isSaving: false,
  }));
}

function loadOverlayNotes() {
  try {
    const raw = fs.readFileSync(getOverlayNotesPath(), "utf-8");
    return normalizeOverlayNotes(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveOverlayNotes(notes) {
  const normalized = normalizeOverlayNotes(notes);
  fs.writeFileSync(getOverlayNotesPath(), JSON.stringify(normalized, null, 2));
  return normalized;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripHtml(value) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();
}

function buildNoteText(note) {
  const normalized = normalizeNote(note);
  const savedAt = normalized.updatedAt
    ? new Date(normalized.updatedAt).toLocaleString()
    : new Date().toLocaleString();

  return `${normalized.title}\nSaved: ${savedAt}\n\n${normalized.body}`;
}

function buildNoteHtml(note) {
  const normalized = normalizeNote(note);
  const savedAt = normalized.updatedAt
    ? new Date(normalized.updatedAt).toLocaleString()
    : new Date().toLocaleString();

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(normalized.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #111; }
    .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
    pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  <h1>${escapeHtml(normalized.title)}</h1>
  <div class="meta">Saved: ${escapeHtml(savedAt)}</div>
  <pre>${escapeHtml(normalized.body)}</pre>
</body>
</html>`;
}

function safeBaseName(value) {
  return (value || DEFAULT_NOTE.title)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .trim()
    .slice(0, 80) || DEFAULT_NOTE.title;
}

function getExportPayload(note, format) {
  if (format === "html" || format === "doc") {
    return buildNoteHtml(note);
  }

  return buildNoteText(note);
}

function getExportFilters(format) {
  if (format === "md") return [{ name: "Markdown", extensions: ["md"] }];
  if (format === "html") return [{ name: "HTML", extensions: ["html"] }];
  if (format === "doc") return [{ name: "Word Document", extensions: ["doc"] }];
  return [{ name: "Text", extensions: ["txt"] }];
}

let note = null;

/* ── Key format conversion: renderer format → Electron accelerator ── */

function toAccelerator(key) {
  // Renderer sends e.g. "ctrl+z", "F2", "Escape"
  // Electron wants "CommandOrControl+Z", "F2", "Escape"
  return key
    .split("+")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "ctrl") return "CommandOrControl";
      if (lower === "alt") return "Alt";
      if (lower === "shift") return "Shift";
      if (lower === "meta") return "Super";
      // Capitalize single letter keys
      if (part.length === 1) return part.toUpperCase();
      return part;
    })
    .join("+");
}

/* ── Register the toggle-draw global shortcut ── */

function registerToggleShortcut() {
  globalShortcut.unregisterAll();
  const accel = toAccelerator(settings.keyBinds.toggleDraw);
  try {
    globalShortcut.register(accel, toggleDrawMode);
  } catch (e) {
    console.error("Failed to register shortcut:", accel, e);
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    transparent: true,
    frame: false,
    skipTaskbar: false,
    hasShadow: false,
    resizable: false,
    fullscreenable: false,
    backgroundColor: "#00000000",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // "screen-saver" is the highest z-order level on Windows —
  // required to render above borderless-fullscreen games.
  mainWindow.setAlwaysOnTop(true, "screen-saver");

  // Start in passthrough mode — clicks go through to apps below
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setDrawMode(enabled) {
  drawMode = enabled;
  if (!mainWindow) return;

  if (drawMode) {
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.focus();
  } else {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  mainWindow.webContents.send("draw-mode-changed", drawMode);
}

function toggleDrawMode() {
  setDrawMode(!drawMode);
}

app.whenReady().then(() => {
  settings = loadSettings();
  note = loadNote();
  createWindow();
  registerToggleShortcut();

  // Auto-update (silent — downloads and installs on next restart)
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  // IPC: renderer can request draw mode changes
  ipcMain.on("exit-draw-mode", () => {
    if (drawMode) setDrawMode(false);
  });

  ipcMain.on("enter-draw-mode", () => {
    if (!drawMode) setDrawMode(true);
  });

  ipcMain.handle("get-draw-mode", () => drawMode);

  // IPC: dynamic mouse passthrough for toolbar hover
  ipcMain.on("set-ignore-mouse-events", (_event, ignore, opts) => {
    if (!mainWindow) return;
    mainWindow.setIgnoreMouseEvents(ignore, opts || {});
  });

  ipcMain.on("focus-window", () => {
    if (!mainWindow) return;
    mainWindow.focus();
  });

  // Settings IPC
  ipcMain.handle("get-settings", () => settings);

  ipcMain.handle("save-settings", (_event, newSettings) => {
    settings = {
      ...DEFAULT_SETTINGS,
      ...newSettings,
      keyBinds: { ...DEFAULT_SETTINGS.keyBinds, ...newSettings.keyBinds },
    };
    saveSettings(settings);
    registerToggleShortcut();
    return settings;
  });

  // Notes IPC
  ipcMain.handle("get-note", () => note);

  ipcMain.handle("save-note", (_event, newNote) => {
    note = saveNote(newNote);
    return note;
  });

  ipcMain.handle("export-note", async (_event, noteToExport, format) => {
    const normalized = saveNote(noteToExport);
    note = normalized;

    const extension = format === "doc" ? "doc" : format || "txt";
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export replay notes",
      defaultPath: `${safeBaseName(normalized.title)}.${extension}`,
      filters: getExportFilters(format),
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, getExportPayload(normalized, format), "utf-8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("save-note-file", async (_event, noteToSave, format, filePath) => {
    const normalized = normalizeNote(noteToSave);
    const extension = format === "doc" ? "doc" : format || "txt";
    let targetPath = filePath;

    if (!targetPath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Save note",
        defaultPath: `${safeBaseName(normalized.title)}.${extension}`,
        filters: getExportFilters(format),
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      targetPath = result.filePath;
    }

    fs.writeFileSync(targetPath, getExportPayload(normalized, format), "utf-8");
    return { canceled: false, filePath: targetPath };
  });

  ipcMain.handle("import-note", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import replay notes",
      properties: ["openFile"],
      filters: [
        {
          name: "Notes",
          extensions: ["txt", "md", "markdown", "html", "htm", "doc"],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const raw = fs.readFileSync(filePath, "utf-8");
    const extension = path.extname(filePath).toLowerCase();
    const importedBody =
      extension === ".html" || extension === ".htm" || extension === ".doc"
        ? stripHtml(raw)
        : raw;

    note = saveNote({
      title: path.basename(filePath, extension) || DEFAULT_NOTE.title,
      body: importedBody,
      updatedAt: new Date().toISOString(),
    });

    return { canceled: false, note, filePath };
  });

  ipcMain.handle("get-overlay-notes", () => loadOverlayNotes());

  ipcMain.handle("save-overlay-notes", (_event, notesToSave) =>
    saveOverlayNotes(notesToSave),
  );
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  app.quit();
});
