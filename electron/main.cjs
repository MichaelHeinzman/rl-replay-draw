const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
} = require("electron");
const path = require("path");
const fs = require("fs");

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
  createWindow();
  registerToggleShortcut();

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
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  app.quit();
});
