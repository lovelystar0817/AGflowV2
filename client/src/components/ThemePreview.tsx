import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Smartphone, MapPin, Phone, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_THEMES, type AppTheme } from "@/lib/appThemes";

// Using centralized APP_THEMES from lib/appThemes

interface ThemePreviewProps {
  theme: AppTheme;
  isSelected?: boolean;
  onClick?: () => void;
  businessName?: string;
  location?: string;
  bio?: string;
  showMockup?: boolean;
  className?: string;
}

export function ThemePreview({
  theme,
  isSelected = false,
  onClick,
  businessName = "Your Business",
  location = "Your Location",
  bio = "Your bio will appear here...",
  showMockup = true,
  className
}: ThemePreviewProps) {
  if (!showMockup) {
    // Simple theme card without mockup
    return (
      <Card
        className={cn(
          "relative cursor-pointer rounded-lg border-2 transition-all duration-200 hover:shadow-md",
          isSelected 
            ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
          className
        )}
        onClick={onClick}
      >
        <div className={cn("h-24 rounded-t-md", theme.header)} />
        <div className="p-4">
          <h3 className={cn("font-semibold", theme.text)}>
            {theme.name}
          </h3>
          <p className={cn("text-sm", theme.subText)}>
            {theme.description}
          </p>
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}
      </Card>
    );
  }

  // Full mockup preview
  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
        isSelected 
          ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
          : 'border-gray-200 hover:border-gray-300',
        className
      )}
      onClick={onClick}
    >
      {/* Theme color bar */}
      <div className={cn("h-8 rounded-t-lg", theme.header)} />
      
      {/* Theme info */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn("font-semibold", theme.text)}>
              {theme.name}
            </h3>
            <p className={cn("text-sm", theme.subText)}>
              {theme.description}
            </p>
          </div>
          {isSelected && (
            <div className="bg-primary text-primary-foreground rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Mobile mockup */}
      <div className="p-4">
        <div className="max-w-48 mx-auto">
          <div className="relative">
            <div className="flex items-center justify-center mb-2">
              <Smartphone className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-xs text-gray-500">Live Preview</span>
            </div>
            
            {/* Phone mockup */}
            <div className="border-2 border-gray-300 rounded-2xl p-1 bg-gray-100">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                {/* Header */}
                <div className={cn(theme.header, "p-3 text-center rounded-t-xl")}> 
                  <h4 className="text-sm font-bold truncate">
                    {businessName}
                  </h4>
                  <div className="flex items-center justify-center space-x-2 text-xs opacity-90 mt-1">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-2.5 w-2.5" />
                      <span className="truncate">{location}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-3">
                  {/* Bio */}
                  <div>
                    <p className={cn("text-xs line-clamp-2", theme.subText)}>
                      {bio}
                    </p>
                  </div>

                  {/* Sample service buttons */}
                  <div className="space-y-2">
                    <div className={cn("h-6 rounded-full text-xs flex items-center justify-center font-medium", theme.serviceSelected)}>
                      Haircut & Style - $45
                    </div>
                    <div className={cn("h-6 rounded-full text-xs flex items-center justify-center font-medium", theme.serviceButton)}>
                      Color & Highlights - $85
                    </div>
                  </div>

                  {/* Sample rating */}
                  <div className="flex items-center justify-center space-x-1 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" 
                      />
                    ))}
                    <span className={cn("text-xs ml-1", theme.subText)}>5.0</span>
                  </div>
                </div>

                {/* Bottom action */}
                <div className="p-3 border-t border-gray-100">
                  <div className={cn("h-6 rounded-full text-xs flex items-center justify-center font-semibold", theme.serviceSelected)}>
                    Book Appointment
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface ThemeGridProps {
  selectedTheme: number;
  onThemeSelect: (themeId: number) => void;
  businessName?: string;
  location?: string;
  bio?: string;
  showMockup?: boolean;
  className?: string;
}

export function ThemeGrid({
  selectedTheme,
  onThemeSelect,
  businessName,
  location,
  bio,
  showMockup = true,
  className
}: ThemeGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 gap-4",
      showMockup ? "lg:grid-cols-2" : "lg:grid-cols-4",
      className
    )}>
      {Object.values(APP_THEMES).map((theme) => (
        <ThemePreview
          key={theme.id}
          theme={theme}
          isSelected={selectedTheme === theme.id}
          onClick={() => onThemeSelect(theme.id)}
          businessName={businessName}
          location={location}
          bio={bio}
          showMockup={showMockup}
        />
      ))}
    </div>
  );
}