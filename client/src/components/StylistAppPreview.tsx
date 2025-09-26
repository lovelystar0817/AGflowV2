import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, MessageCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { APP_THEMES } from "@/lib/appThemes";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { ServiceButton } from "@/components/ServiceButton";
import { cn } from "@/lib/utils";

export interface StylistAppPreviewProps {
  themeId: number;
  stylistName: string;
  businessName?: string;
  location: string;
  phone?: string;
  showPhone: boolean;
  bio: string;
  portfolioPhotos: string[];
  services: { id: number; name: string; price: number; duration?: number }[];
  availabilityPreview?: {
    date?: string;
    isOpen?: boolean;
    timeRanges?: { start: string; end: string }[];
  };
  className?: string;
}

export function StylistAppPreview({
  themeId,
  stylistName,
  businessName,
  location,
  phone,
  showPhone,
  bio,
  portfolioPhotos,
  services,
  availabilityPreview,
  className
}: StylistAppPreviewProps) {
  const theme = themeId && APP_THEMES[themeId] ? APP_THEMES[themeId] : APP_THEMES[1];
  const displayName = businessName || stylistName;

  const safePhotos = Array.isArray(portfolioPhotos) ? portfolioPhotos : [];

  const serviceItems = services?.map(s => ({
    id: s.id,
    serviceName: s.name,
    price: String(s.price),
    durationMinutes: s.duration,
  })) || [];

  return (
    <div className={cn("w-full max-w-md mx-auto bg-white shadow-xl rounded-b-xl", className)}>
      {/* Header */}
      <div className={cn(theme.header, "p-6 rounded-t-xl")}> 
        <div className="text-center mb-2">
          <h1 className={cn("text-2xl font-bold", theme.text)}>{displayName}</h1>
          <div className={cn("flex items-center justify-center space-x-4 text-sm opacity-90", theme.subText)}>
            {location && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{location}</span>
              </div>
            )}
            {showPhone && phone && (
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span>{phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio */}
      <div className="px-6 py-4">
        <PortfolioGallery
          photos={safePhotos}
          editable={false}
          aspectRatio="square"
          showIndicators={true}
          className="mb-4"
        />
      </div>

      <div className="p-6 space-y-6">
        {/* Bio */}
        {bio && (
          <Card className={cn(theme.card)}>
            <CardContent className="p-4">
              <h3 className={cn("font-semibold mb-2", theme.text)}>About</h3>
              <p className={cn("text-sm leading-relaxed", theme.subText)}>{bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <Card className={cn(theme.card)}>
          <CardContent className="p-4">
            <h3 className={cn("font-semibold mb-4", theme.text)}>Services</h3>
            <div className="space-y-3">
              {serviceItems.map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  themeId={themeId}
                  variant="outline"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Availability Preview */}
        <Card className={cn(theme.card)}>
          <CardContent className="p-4">
            <h3 className={cn("font-semibold mb-4", theme.text)}>Availability</h3>
            <div className="space-y-2">
              {availabilityPreview?.isOpen && availabilityPreview?.timeRanges?.length ? (
                <div className="text-center">
                  <div className={cn("text-sm mb-2", theme.subText)}>Available Times</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {availabilityPreview.timeRanges.map((tr, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={cn("text-xs border", theme.accent)}
                      >
                        {tr.start} - {tr.end}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={cn("text-center text-sm py-4", theme.subText)}>
                  No availability for this date
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Message Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <Button className={cn("w-full font-semibold", theme.serviceSelected)}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Message {stylistName}
        </Button>
      </div>
    </div>
  );
}
