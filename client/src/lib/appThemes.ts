// Centralized theme definitions for stylist app profiles
export type AppTheme = {
  id: number;
  name: string;
  description: string;
  header: string;        // header bg or text color classes
  card: string;          // card container classes
  serviceButton: string; // unselected state classes
  serviceSelected: string; // selected state classes
  text: string;          // primary text classes
  subText: string;       // secondary text classes
  accent: string;        // accent classes for highlights/icons
};

export const APP_THEMES: Record<number, AppTheme> = {
  1: {
    id: 1,
    name: "Minimal Luxe",
    description: "Sophisticated and luxurious",
    header: "bg-white text-[#CBA135]",
    card: "bg-gradient-to-b from-[#FFF8E7] to-[#FDF6EC] rounded-xl shadow-sm",
    serviceButton: "border border-[#CBA135] text-black",
    serviceSelected: "bg-gradient-to-b from-[#D8B55E] to-[#C39A2A] text-white",
    text: "text-black",
    subText: "text-gray-600",
    accent: "text-[#CBA135]",
  },
  2: {
    id: 2,
    name: "Bold Modern",
    description: "Dark and edgy with neon highlights",
    header: "bg-gradient-to-r from-[#0B1220] to-[#1F2937] text-white",
    card: "bg-[#111827] rounded-xl shadow-lg border border-[#1F2937]",
    serviceButton: "bg-[#0B1220] border border-[#3B82F6] text-white",
    serviceSelected: "bg-[#3B82F6] text-white ring-2 ring-[#3B82F6]/50",
    text: "text-white",           // force white text on dark backgrounds
    subText: "text-gray-200",     // much lighter gray for better visibility on dark background
    accent: "text-[#3B82F6]",
  },
  3: {
    id: 3,
    name: "Creative Flow",
    description: "Playful gradients and artsy feel",
    header: "bg-gradient-to-r from-[#A78BFA] to-[#FCA5A5] text-white",
    card: "bg-gradient-to-r from-[#FDE2E4] via-[#E0BBE4] to-[#CDB4DB] rounded-xl shadow",
    serviceButton: "bg-gradient-to-r from-[#A78BFA] to-[#FCA5A5] text-white",
    serviceSelected: "bg-gradient-to-r from-[#8B5CF6] to-[#F87171] text-white ring-2 ring-white/40",
    text: "text-gray-800",
    subText: "text-gray-600",
    accent: "text-[#A78BFA]",
  },
  4: {
    id: 4,
    name: "Professional Neutral",
    description: "Clean, modern, and unisex",
    header: "bg-gray-100 text-[#0D9488]",
    card: "bg-gradient-to-b from-[#F1F5F9] to-[#E2E8F0] rounded-xl shadow-sm",
    serviceButton: "border border-[#0D9488] text-[#0D9488]",
    serviceSelected: "bg-gradient-to-b from-[#0EA5A3] to-[#0D9488] text-white",
    text: "text-gray-900",
    subText: "text-gray-600",
    accent: "text-[#0D9488]",
  },
  5: {
    id: 5,
    name: "Lavender Fields",
    description: "Soft, dreamy, and romantic aesthetic",
    header: "bg-gradient-to-r from-[#CDB4DB] to-[#FFC8DD] text-gray-800",
    card: "bg-gradient-to-r from-[#CDB4DB]/20 to-[#FFC8DD]/20 rounded-xl border border-[#E2E8F0]",
    serviceButton: "border border-[#FFAFCC] text-[#6B7280]",
    serviceSelected: "bg-gradient-to-r from-[#FFAFCC] to-[#A2D2FF] text-white",
    text: "text-gray-800",
    subText: "text-gray-600",
    accent: "text-[#CDB4DB]",
  },
  6: {
    id: 6,
    name: "Neon Jungle",
    description: "Energetic and bold with neon accents",
    header: "bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364] text-white",
    card: "bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#111827] text-white rounded-xl shadow-lg",
    serviceButton: "border border-[#22D3EE] text-[#22D3EE]",
    serviceSelected: "bg-[#22D3EE] text-black ring-2 ring-[#22D3EE]/50",
    text: "text-white",
    subText: "text-gray-200",
    accent: "text-[#22D3EE]",
  },
  7: {
    id: 7,
    name: "Cappuccino",
    description: "Warm, cozy, and neutral tones",
    header: "bg-gradient-to-r from-[#D6CCC2] to-[#EDEDE9] text-[#5C4033]",
    card: "bg-gradient-to-b from-[#EDE0D4] to-[#D6CCC2] rounded-xl shadow-sm",
    serviceButton: "border border-[#B08968] text-[#5C4033]",
    serviceSelected: "bg-gradient-to-r from-[#B08968] to-[#7F5539] text-white",
    text: "text-[#5C4033]",
    subText: "text-gray-600",
    accent: "text-[#7F5539]",
  },
  8: {
    id: 8,
    name: "Emerald Odyssey",
    description: "Tranquil greens with earthy depth",
    header: "bg-gradient-to-r from-[#064E3B] to-[#10B981] text-white",
    card: "bg-gradient-to-b from-[#D1FAE5] to-[#A7F3D0] rounded-xl shadow-sm",
    serviceButton: "border border-[#10B981] text-[#064E3B]",
    serviceSelected: "bg-gradient-to-r from-[#34D399] to-[#10B981] text-white",
    text: "text-gray-900",
    subText: "text-gray-600",
    accent: "text-[#10B981]",
  },
};

export function getAppTheme(id?: number): AppTheme {
  const key = APP_THEMES[id ?? 1] ? (id as number) : 1;
  return APP_THEMES[key];
}
