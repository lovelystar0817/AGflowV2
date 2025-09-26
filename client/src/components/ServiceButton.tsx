import { Button } from "@/components/ui/button";
import { Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_THEMES } from "@/lib/appThemes";

interface StylistService {
  id: number;
  serviceName: string;
  price: string;
  durationMinutes?: number;
}

interface ServiceButtonProps {
  service: StylistService;
  themeId?: number;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

// Map APP_THEMES into handy extras for outline/ghost variants
const themeClassExtras: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, { pricePill: string; outlineBorder: string; ghostHover: string }> = {
  1: { pricePill: "text-white", outlineBorder: "border-[#CBA135]", ghostHover: "hover:bg-yellow-50" },
  2: { pricePill: "text-white", outlineBorder: "border-[#3B82F6]", ghostHover: "hover:bg-[#0B1220]/40" },
  3: { pricePill: "text-white", outlineBorder: "border-[#A78BFA]", ghostHover: "hover:bg-purple-50" },
  4: { pricePill: "text-white", outlineBorder: "border-[#0D9488]", ghostHover: "hover:bg-teal-50" },
  5: { pricePill: "text-white", outlineBorder: "border-[#FFAFCC]", ghostHover: "hover:bg-pink-50" },
  6: { pricePill: "text-white", outlineBorder: "border-[#22D3EE]", ghostHover: "hover:bg-cyan-50" },
  7: { pricePill: "text-white", outlineBorder: "border-[#B08968]", ghostHover: "hover:bg-amber-50" },
  8: { pricePill: "text-white", outlineBorder: "border-[#10B981]", ghostHover: "hover:bg-green-50" },
};

export function ServiceButton({ 
  service, 
  themeId = 1, 
  onClick, 
  className,
  variant = "default",
  size = "default"
}: ServiceButtonProps) {
  const theme = APP_THEMES[themeId as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] ?? APP_THEMES[1];
  const extras = themeClassExtras[(themeId as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) || 1];

  if (variant === "outline") {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={onClick}
        className={cn(
          "h-auto p-4 flex items-center justify-between rounded-xl border-2 transition-all duration-200",
          extras.outlineBorder,
          theme.card,
          "hover:shadow-md hover:scale-[1.02]",
          className
        )}
      >
        <div className="flex-1 text-left">
          <h4 className={cn("font-semibold", theme.text)}>{service.serviceName}</h4>
          {service.durationMinutes && (
            <div className={cn("flex items-center space-x-1 text-xs mt-1", theme.subText)}>
              <Clock className="h-3 w-3" />
              <span>{service.durationMinutes} min</span>
            </div>
          )}
        </div>
        <div className="ml-4">
          <div 
            className={cn("text-sm font-bold px-3 py-1 rounded-full", theme.serviceSelected)}
          >
            ${service.price}
          </div>
        </div>
      </Button>
    );
  }

  if (variant === "ghost") {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={onClick}
        className={cn(
          "h-auto p-4 flex items-center justify-between rounded-xl transition-all duration-200",
          theme.card,
          extras.ghostHover,
          "hover:shadow-sm",
          className
        )}
      >
        <div className="flex-1 text-left">
          <h4 className={cn("font-medium", theme.text)}>{service.serviceName}</h4>
          {service.durationMinutes && (
            <div className={cn("flex items-center space-x-1 text-xs mt-1", theme.subText)}>
              <Clock className="h-3 w-3" />
              <span>{service.durationMinutes} min</span>
            </div>
          )}
        </div>
        <div className="ml-4">
          <span className={cn("text-sm font-semibold", theme.accent)}>
            ${service.price}
          </span>
        </div>
      </Button>
    );
  }

  // Default pill-style gradient button
  return (
    <Button
      size={size}
      onClick={onClick}
      className={cn(
        "h-auto p-4 rounded-full transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg",
        "font-semibold border-0",
        theme.serviceSelected,
        className
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 text-left">
          <div className={cn("font-semibold", theme.text)}>{service.serviceName}</div>
          {service.durationMinutes && (
            <div className={cn("flex items-center space-x-1 text-xs mt-1", theme.subText)}>
              <Clock className="h-3 w-3" />
              <span>{service.durationMinutes} min</span>
            </div>
          )}
        </div>
        <div className="ml-4 flex items-center space-x-1">
          <DollarSign className="h-4 w-4" />
          <span className="font-bold">{service.price}</span>
        </div>
      </div>
    </Button>
  );
}