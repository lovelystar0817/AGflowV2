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
    name: "Golden Elegance",
    description: "Luxurious golden theme with warm highlights",
    header: "bg-gradient-to-r from-yellow-600 to-amber-600",
    card: "bg-yellow-50 border-yellow-200",
    text: "text-gray-900",
    subText: "text-gray-600", 
    serviceSelected: "bg-yellow-600 text-white",
    serviceButton: "border-yellow-300 hover:bg-yellow-50 text-yellow-700",
    accent: "text-yellow-600",
    primary: "#CBA135"
  },
  2: {
    id: 2,
    name: "Midnight Blue",
    description: "Professional deep blue with sophisticated styling",
    header: "bg-gradient-to-r from-blue-600 to-blue-700",
    card: "bg-blue-50 border-blue-200",
    text: "text-blue-900",
    subText: "text-blue-600",
    serviceSelected: "bg-blue-600 text-white", 
    serviceButton: "border-blue-300 hover:bg-blue-50 text-blue-700",
    accent: "text-blue-600",
    primary: "#3B82F6"
  },
  3: {
    id: 3,
    name: "Royal Purple", 
    description: "Elegant purple with luxury appeal",
    header: "bg-gradient-to-r from-purple-500 to-violet-600",
    card: "bg-purple-50 border-purple-200",
    text: "text-purple-900",
    subText: "text-purple-600",
    serviceSelected: "bg-purple-500 text-white",
    serviceButton: "border-purple-300 hover:bg-purple-50 text-purple-700",
    accent: "text-purple-500",
    primary: "#A78BFA"
  },
  4: {
    id: 4,
    name: "Ocean Teal",
    description: "Fresh and modern teal theme",
    header: "bg-gradient-to-r from-teal-600 to-cyan-600", 
    card: "bg-teal-50 border-teal-200",
    text: "text-teal-900",
    subText: "text-teal-600",
    serviceSelected: "bg-teal-600 text-white",
    serviceButton: "border-teal-300 hover:bg-teal-50 text-teal-700",
    accent: "text-teal-600",
    primary: "#0D9488"
  },
  5: {
    id: 5,
    name: "Blush Pink",
    description: "Soft and feminine pink theme",
    header: "bg-gradient-to-r from-pink-400 to-rose-500",
    card: "bg-pink-50 border-pink-200", 
    text: "text-pink-900",
    subText: "text-pink-600",
    serviceSelected: "bg-pink-500 text-white",
    serviceButton: "border-pink-300 hover:bg-pink-50 text-pink-700",
    accent: "text-pink-500",
    primary: "#FFAFCC"
  },
  6: {
    id: 6,
    name: "Cyber Cyan",
    description: "Modern and vibrant cyan theme",
    header: "bg-gradient-to-r from-cyan-500 to-blue-500",
    card: "bg-cyan-50 border-cyan-200",
    text: "text-cyan-900", 
    subText: "text-cyan-600",
    serviceSelected: "bg-cyan-500 text-white",
    serviceButton: "border-cyan-300 hover:bg-cyan-50 text-cyan-700",
    accent: "text-cyan-500",
    primary: "#22D3EE"
  },
  7: {
    id: 7,
    name: "Earth Brown",
    description: "Warm and natural brown theme",
    header: "bg-gradient-to-r from-amber-700 to-orange-700",
    card: "bg-amber-50 border-amber-200",
    text: "text-amber-900",
    subText: "text-amber-700", 
    serviceSelected: "bg-amber-700 text-white",
    serviceButton: "border-amber-300 hover:bg-amber-50 text-amber-700",
    accent: "text-amber-700",
    primary: "#B08968"
  },
  8: {
    id: 8,
    name: "Forest Green",
    description: "Natural and refreshing green theme", 
    header: "bg-gradient-to-r from-green-600 to-emerald-600",
    card: "bg-green-50 border-green-200",
    text: "text-green-900",
    subText: "text-green-600",
    serviceSelected: "bg-green-600 text-white",
    serviceButton: "border-green-300 hover:bg-green-50 text-green-700", 
    accent: "text-green-600",
    primary: "#10B981"
  }
};