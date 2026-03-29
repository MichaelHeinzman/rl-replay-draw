export const RL_COLORS = {
  blue: "#00aaff",
  orange: "#ff8c00",
  gold: "#ffd700",
  cyan: "#00e5ff",
  red: "#ff4500",
  green: "#00ff88",
} as const;

export const COLOR_PALETTE = Object.values(RL_COLORS);

export const GLOW = {
  minBlur: 6,
  maxBlur: 22,
  pulseSpeed: 0.0025,
  entryDuration: 500,
  entryExtraBlur: 35,
};

export const PARTICLE = {
  countMin: 8,
  countMax: 16,
  speed: 2.5,
  life: 600,
  sizeMin: 1.5,
  sizeMax: 4,
};
