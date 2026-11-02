export const THEME_IDS = [
  "classic",
  "gold",
  "midnight",
  "pastel",
  "forest",
  "ice",
  "paper",
  "neon",
  "gallery",
  "terminal",
  "light",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeTokens = {
  id: ThemeId;
  label: string;
  bg: string;
  ink: string;
  muted: string;
  card: string;
  accent: string;
  line: string;
  foam: string;
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  classic: { id: "classic", label: "Classic", bg: "#131211", ink: "#f3ece4", muted: "#a39890", card: "#1c1a18", accent: "#8B2E4A", line: "rgba(243,236,228,0.2)", foam: "#f6f1ea" },
  gold: { id: "gold", label: "Gold Premium", bg: "#16120c", ink: "#f6edd8", muted: "#c6b48a", card: "#241c12", accent: "#e6c36a", line: "rgba(230,195,106,0.35)", foam: "#1a1408" },
  midnight: { id: "midnight", label: "Midnight", bg: "#0c1020", ink: "#e7ebff", muted: "#9aa3c7", card: "#151a30", accent: "#7d8cff", line: "rgba(231,235,255,0.18)", foam: "#f4f6ff" },
  pastel: { id: "pastel", label: "Soft Pastel", bg: "#f6efe8", ink: "#3a2c32", muted: "#8d7380", card: "#fff8f4", accent: "#d4899a", line: "rgba(58,44,50,0.16)", foam: "#fffaf7" },
  forest: { id: "forest", label: "Forest", bg: "#101612", ink: "#e7f3ea", muted: "#9bb5a2", card: "#18211b", accent: "#6faf7a", line: "rgba(231,243,234,0.18)", foam: "#f3fff5" },
  ice: { id: "ice", label: "Ice", bg: "#eef3f6", ink: "#1a242c", muted: "#5d7382", card: "#f7fbfd", accent: "#3d7ea6", line: "rgba(26,36,44,0.16)", foam: "#f4fbff" },
  paper: { id: "paper", label: "Paper", bg: "#f3efe6", ink: "#1a1614", muted: "#6e655e", card: "#faf7f1", accent: "#8B2E4A", line: "rgba(26,22,20,0.16)", foam: "#fffdf8" },
  neon: { id: "neon", label: "Neon", bg: "#0e0e12", ink: "#f4ffe8", muted: "#b7c9a4", card: "#17171e", accent: "#d4ff4a", line: "rgba(212,255,74,0.28)", foam: "#101208" },
  gallery: { id: "gallery", label: "Gallery", bg: "#181614", ink: "#f4efe6", muted: "#b7aea4", card: "#221f1c", accent: "#efe6d6", line: "rgba(244,239,230,0.2)", foam: "#1a1816" },
  terminal: { id: "terminal", label: "Retro Terminal", bg: "#0a120c", ink: "#b6ff9a", muted: "#6d9a62", card: "#0f1a12", accent: "#39ff14", line: "rgba(57,255,20,0.28)", foam: "#041006" },
  light: { id: "light", label: "Light", bg: "#f7f4ef", ink: "#1a1614", muted: "#6d6560", card: "#fffdf9", accent: "#6B1E3A", line: "rgba(26,22,20,0.14)", foam: "#fffaf6" },
};

export const ACCENT_IDS = ["wine", "gold", "rose", "ice", "forest", "violet", "ember", "ink"] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

export const ACCENTS: Record<AccentId, { label: string; color: string }> = {
  wine: { label: "Вино", color: "#8B2E4A" },
  gold: { label: "Золото", color: "#e6c36a" },
  rose: { label: "Роза", color: "#d47a8c" },
  ice: { label: "Лёд", color: "#7eb6d6" },
  forest: { label: "Лес", color: "#6faf7a" },
  violet: { label: "Фиолет", color: "#8a6bb5" },
  ember: { label: "Уголь", color: "#d4654a" },
  ink: { label: "Светлый", color: "#e8e0d4" },
};

export const FRAME_IDS = ["thin", "circle", "rounded", "gold", "none"] as const;
export type AvatarFrame = (typeof FRAME_IDS)[number];

export const FRAME_LABELS: Record<AvatarFrame, string> = {
  thin: "Тонкая",
  circle: "Круг",
  rounded: "Скруглённый квадрат",
  gold: "Золотая",
  none: "Без рамки",
};

export const OVERLAY_IDS = ["gradient", "darken", "vignette", "none"] as const;
export type BannerOverlay = (typeof OVERLAY_IDS)[number];

export const OVERLAY_LABELS: Record<BannerOverlay, string> = {
  gradient: "Градиент",
  darken: "Затемнение",
  vignette: "Виньетка",
  none: "Без оверлея",
};

export const SIDE_SHAPES = ["rect", "wide", "square-top", "square-bottom", "none"] as const;
export type SideShape = (typeof SIDE_SHAPES)[number];

export const SIDE_SHAPE_LABELS: Record<SideShape, string> = {
  rect: "Прямоугольник",
  wide: "Прямоугольник шире",
  "square-top": "Квадрат сверху",
  "square-bottom": "Квадрат снизу",
  none: "Без рамки",
};

export function asSideShape(value: unknown): SideShape {
  return SIDE_SHAPES.includes(value as SideShape) ? (value as SideShape) : "rect";
}

export function asTheme(value: unknown): ThemeId {
  return THEME_IDS.includes(value as ThemeId) ? (value as ThemeId) : "classic";
}

export function asAccent(value: unknown): AccentId {
  return ACCENT_IDS.includes(value as AccentId) ? (value as AccentId) : "wine";
}

export function asFrame(value: unknown): AvatarFrame {
  return FRAME_IDS.includes(value as AvatarFrame) ? (value as AvatarFrame) : "thin";
}

export function asOverlay(value: unknown): BannerOverlay {
  return OVERLAY_IDS.includes(value as BannerOverlay) ? (value as BannerOverlay) : "gradient";
}

export function premiumActive(forever: boolean, until: string | null, now = Date.now()): boolean {
  if (forever) return true;
  if (!until) return false;
  const time = new Date(until).getTime();
  return Number.isFinite(time) && time > now;
}
