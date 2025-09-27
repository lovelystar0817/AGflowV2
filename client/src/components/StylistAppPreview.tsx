import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, MessageCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { APP_THEMES } from "@/lib/appThemes";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { ServiceButton } from "@/components/ServiceButton";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays, isBefore, startOfDay } from "date-fns";
import { availabilitySchema } from "@shared/schema";

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
  stylistId?: string; // Optional - if provided, enables date navigation and availability fetching
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
  stylistId,
  className
}: StylistAppPreviewProps) {
  const theme = APP_THEMES[themeId] || APP_THEMES[1];
  const displayName = businessName || stylistName;

  const safePhotos = Array.isArray(portfolioPhotos) ? portfolioPhotos : [];

  // Date navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch availability for current date if stylistId is provided
    const { data: availability } = useQuery({
    queryKey: ["availability", stylistId, format(currentDate, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!stylistId) return null;
      const response = await apiRequest("GET", `/api/availability/${format(currentDate, "yyyy-MM-dd")}`);
      return availabilitySchema.parse(await response.json());
    },
    enabled: !!stylistId,
  });

  // Date navigation handlers
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  
  const handlePrevDay = () => {
    if (!isBefore(startOfDay(currentDate), startOfDay(new Date()))) {
      setCurrentDate((prev) => subDays(prev, 1));
    }
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

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
            
            {/* Date Navigation */}
            {stylistId && (
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={handlePrevDay} 
                  disabled={isBefore(startOfDay(currentDate), startOfDay(new Date()))}
                  className={cn(
                    "p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
                    theme.text
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className={cn("font-medium text-sm", theme.text)}>
                  {format(currentDate, "EEEE, MMM d")}
                </span>
                <button 
                  onClick={handleNextDay}
                  className={cn(
                    "p-1 rounded-full hover:bg-gray-100",
                    theme.text
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              {availability?.isOpen && availability?.timeRanges?.length ? (
                <div className="text-center">
                  <div className={cn("text-sm mb-2", theme.subText)}>Available Times</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {availability.timeRanges.map((tr, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={cn("text-xs border", theme.accent)}
                      >
                        {formatTime12Hour(tr.start)} - {formatTime12Hour(tr.end)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={cn("text-center text-sm py-4", theme.subText)}>
                  {stylistId ? "No availability for this date" : "Availability not available"}
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
