# RL Replay Draw

A transparent desktop overlay for drawing animated shapes on your screen while reviewing Rocket League replays. Built with Electron, React, and TypeScript.

Shapes glow and pulse with the Grover Gang Twitch overlay color palette, and particles burst on completion.

<img width="953" height="534" alt="Screenshot 2026-05-31 133224" src="https://github.com/user-attachments/assets/d3e77e47-2dd5-4f9a-9292-ac801d04526c" />
<img width="951" height="530" alt="Screenshot 2026-05-31 133154" src="https://github.com/user-attachments/assets/994f9f94-2777-4319-ab35-c445e725e126" />

## Features

- **Transparent overlay** — sits on top of your game/replay viewer. Clicks pass through when not drawing.
- **Drawing tools** — Freehand, Line, Rectangle, Circle, Arrow
- **Animated shapes** — Neon glow with pulse, entry flash, and particle effects using the RL overlay theme colors
- **Configurable keybinds** — Remap every shortcut through the settings panel
- **Draggable toolbar** — Pin the toolbar anywhere on screen; position persists across sessions
- **Draw mode toggle** — Global hotkey (default F2) or toolbar button to enable/disable drawing
- **Undo / Redo / Clear**

## Default Keybinds

| Action           | Default Key |
| ---------------- | ----------- |
| Toggle draw mode | F2          |
| Exit draw mode   | Escape      |
| Freehand tool    | F           |
| Line tool        | L           |
| Rectangle tool   | R           |
| Circle tool      | C           |
| Arrow tool       | A           |
| Undo             | Ctrl+Z      |
| Redo             | Ctrl+Y      |

All keybinds are configurable via the ⚙ settings button on the toolbar.

## Getting Started

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts Vite dev server + Electron together. The overlay window appears on top of everything.

### Build

```bash
npm run build
```

Builds the renderer with Vite to `dist/`.

### Package (Windows .exe)

```bash
npm run package
```

Outputs a portable app to `release/win-unpacked/RL Replay Draw.exe`.

## Project Structure

```
electron/
  main.cjs          — Electron main process, settings persistence, global shortcuts
  preload.cjs       — Context bridge for renderer ↔ main IPC
src/
  App.tsx            — Root component, keybind handling, draw mode state
  App.css            — Global overlay styles
  main.tsx           — React entry point
  components/
    drawing-canvas/  — Canvas with shape rendering, glow effects, particles
    toolbar/         — Drawing tools, color picker, stroke size, drag handle
    settings-panel/  — Keybind configuration UI
  hooks/
    useDrawing.ts    — Shape state, undo/redo, particle spawning
    useSettings.ts   — Settings load/save via Electron IPC
  lib/
    theme.ts         — RL overlay color palette and animation constants
  types/
    drawing.ts       — Shape, Tool, Point, Particle types
    settings.ts      — KeyBinds, AppSettings, defaults
    electron.d.ts    — Window.electronAPI type declarations
```

## Tech Stack

- **Electron** — Desktop window with transparent overlay
- **React 19** — UI rendering
- **TypeScript** — Type safety
- **Vite** — Fast dev server and bundler
- **Canvas API** — Shape rendering with glow/particle effects
