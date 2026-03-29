const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onDrawModeChanged: (callback) => {
    ipcRenderer.on("draw-mode-changed", (_event, isDrawMode) =>
      callback(isDrawMode),
    );
  },
  getDrawMode: () => ipcRenderer.invoke("get-draw-mode"),
  exitDrawMode: () => ipcRenderer.send("exit-draw-mode"),
  enterDrawMode: () => ipcRenderer.send("enter-draw-mode"),
  setIgnoreMouseEvents: (ignore, opts) =>
    ipcRenderer.send("set-ignore-mouse-events", ignore, opts),
  focusWindow: () => ipcRenderer.send("focus-window"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
});
