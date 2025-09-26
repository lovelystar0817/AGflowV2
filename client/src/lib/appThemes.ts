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
    card: "bg-white shadow-md rounded-xl",
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
    card: "bg-[#1F2937] text-white rounded-xl",
    serviceButton: "bg-[#0B1220] border border-[#3B82F6] text-white",
    serviceSelected: "bg-[#3B82F6] text-white ring-2 ring-[#3B82F6]/50",
    text: "text-white",
    subText: "text-gray-300",
    accent: "text-[#3B82F6]",
  },
  3: {
    id: 3,
    name: "Creative Flow",
    description: "Playful gradients and artsy feel",
    header: "bg-gradient-to-r from-[#A78BFA] to-[#FCA5A5] text-white",
    card: "bg-gradient-to-r from-[#A78BFA]/10 to-[#FCA5A5]/10 rounded-xl",
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
    card: "bg-white border border-gray-200 rounded-xl",
    serviceButton: "border border-[#0D9488] text-[#0D9488]",
    serviceSelected: "bg-gradient-to-b from-[#0EA5A3] to-[#0D9488] text-white",
    text: "text-gray-900",
    subText: "text-gray-600",
    accent: "text-[#0D9488]",
  },
};

export function getAppTheme(id?: number): AppTheme {
  const key = APP_THEMES[id ?? 1] ? (id as number) : 1;
  return APP_THEMES[key];
}
