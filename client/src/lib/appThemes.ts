export interface AppTheme {
  id: number;
  name: string;
  description: string;
  header: string; // CSS classes for header/banner area
  card: string; // CSS classes for card backgrounds
  text: string; // CSS classes for primary text
  subText: string; // CSS classes for secondary text
  serviceSelected: string; // CSS classes for selected services
  serviceButton: string; // CSS classes for service buttons
  accent: string; // CSS classes for accent elements
  primary: string; // Primary color hex code
}

export const APP_THEMES: Record<number, AppTheme> = {
  1: {
    id: 1,
    name: "Ocean Blue",
    description: "Professional and calming ocean-inspired theme",
    header: "bg-gradient-to-r from-blue-500 to-blue-600",
    card: "bg-blue-50 border-blue-200",
    text: "text-blue-900",
    subText: "text-blue-600",
    serviceSelected: "bg-blue-500 text-white",
    serviceButton: "border-blue-300 hover:bg-blue-50 text-blue-700",
    accent: "text-blue-500",
    primary: "#3b82f6"
  },
  2: {
    id: 2,
    name: "Elegant Purple",
    description: "Sophisticated and luxurious purple theme",
    header: "bg-gradient-to-r from-purple-500 to-purple-600",
    card: "bg-purple-50 border-purple-200",
    text: "text-purple-900",
    subText: "text-purple-600",
    serviceSelected: "bg-purple-500 text-white",
    serviceButton: "border-purple-300 hover:bg-purple-50 text-purple-700",
    accent: "text-purple-500",
    primary: "#8b5cf6"
  },
  3: {
    id: 3,
    name: "Forest Green",
    description: "Natural and refreshing green theme",
    header: "bg-gradient-to-r from-green-500 to-emerald-600",
    card: "bg-green-50 border-green-200",
    text: "text-green-900",
    subText: "text-green-600",
    serviceSelected: "bg-green-500 text-white",
    serviceButton: "border-green-300 hover:bg-green-50 text-green-700",
    accent: "text-green-500",
    primary: "#10b981"
  },
  4: {
    id: 4,
    name: "Warm Orange",
    description: "Energetic and welcoming orange theme",
    header: "bg-gradient-to-r from-orange-500 to-amber-600",
    card: "bg-orange-50 border-orange-200",
    text: "text-orange-900",
    subText: "text-orange-600",
    serviceSelected: "bg-orange-500 text-white",
    serviceButton: "border-orange-300 hover:bg-orange-50 text-orange-700",
    accent: "text-orange-500",
    primary: "#f59e0b"
  },
  5: {
    id: 5,
    name: "Classic Black",
    description: "Sleek and modern monochrome theme",
    header: "bg-gradient-to-r from-gray-800 to-gray-900",
    card: "bg-gray-50 border-gray-200",
    text: "text-gray-900",
    subText: "text-gray-600",
    serviceSelected: "bg-gray-800 text-white",
    serviceButton: "border-gray-300 hover:bg-gray-50 text-gray-700",
    accent: "text-gray-700",
    primary: "#1f2937"
  },
  6: {
    id: 6,
    name: "Rose Gold",
    description: "Elegant and feminine rose gold theme",
    header: "bg-gradient-to-r from-pink-400 to-rose-500",
    card: "bg-pink-50 border-pink-200",
    text: "text-pink-900",
    subText: "text-pink-600",
    serviceSelected: "bg-pink-500 text-white",
    serviceButton: "border-pink-300 hover:bg-pink-50 text-pink-700",
    accent: "text-pink-500",
    primary: "#ec4899"
  },
  7: {
    id: 7,
    name: "Sunset Red",
    description: "Bold and passionate red theme",
    header: "bg-gradient-to-r from-red-500 to-red-600",
    card: "bg-red-50 border-red-200",
    text: "text-red-900",
    subText: "text-red-600",
    serviceSelected: "bg-red-500 text-white",
    serviceButton: "border-red-300 hover:bg-red-50 text-red-700",
    accent: "text-red-500",
    primary: "#ef4444"
  },
  8: {
    id: 8,
    name: "Teal Wave",
    description: "Fresh and modern teal theme",
    header: "bg-gradient-to-r from-teal-500 to-cyan-600",
    card: "bg-teal-50 border-teal-200",
    text: "text-teal-900",
    subText: "text-teal-600",
    serviceSelected: "bg-teal-500 text-white",
    serviceButton: "border-teal-300 hover:bg-teal-50 text-teal-700",
    accent: "text-teal-500",
    primary: "#14b8a6"
  }
};