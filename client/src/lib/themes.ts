export type ThemeDef = {
  id: 1 | 2 | 3 | 4;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: string; // tailwind gradient classes without bg-gradient-to-r prefix
};

export const THEMES: Record<1 | 2 | 3 | 4, ThemeDef> = {
  1: {
    id: 1,
    name: "Classic",
    primary: "#2563eb",
    secondary: "#1e40af",
    accent: "#3b82f6",
    gradient: "from-blue-500 to-blue-700",
  },
  2: {
    id: 2,
    name: "Modern",
    primary: "#7c3aed",
    secondary: "#6d28d9",
    accent: "#8b5cf6",
    gradient: "from-purple-500 to-purple-700",
  },
  3: {
    id: 3,
    name: "Elegant",
    primary: "#059669",
    secondary: "#047857",
    accent: "#10b981",
    gradient: "from-emerald-500 to-emerald-700",
  },
  4: {
    id: 4,
    name: "Vibrant",
    primary: "#dc2626",
    secondary: "#b91c1c",
    accent: "#ef4444",
    gradient: "from-red-500 to-red-700",
  },
};

export function getTheme(themeId?: number): ThemeDef {
  const id = [1, 2, 3, 4].includes(Number(themeId)) ? (themeId as 1 | 2 | 3 | 4) : 1;
  return THEMES[id];
}
