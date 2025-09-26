import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Phone, 
  Calendar, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Star,
  Instagram
} from "lucide-react";
import { format, addDays, isSameDay, isToday } from "date-fns";
import { ServiceButton } from "@/components/ServiceButton";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { APP_THEMES } from "@/lib/appThemes";

interface PublicStylist {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string;
  location: string;
  bio: string;
  instagramHandle?: string;
  businessHours: any;
  showPhone: boolean;
  phone?: string;
  portfolioPhotos: string[];
  themeId: number;
  appSlug: string;
}

interface StylistService {
  id: number;
  serviceName: string;
  price: string;
  durationMinutes?: number;
}

interface Availability {
  date: string;
  isOpen: boolean;
  timeRanges: { start: string; end: string }[];
}

// Theme values are sourced from APP_THEMES

export default function PublicAppPage() {
  const [, params] = useRoute("/app/:slug");
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const slug = params?.slug;

  // Fetch stylist by slug
  const { data: stylist, isLoading: stylistLoading, error: stylistError } = useQuery<PublicStylist>({
    queryKey: [`/api/public/stylist/slug/${slug}`],
    enabled: !!slug,
  });

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery<StylistService[]>({
    queryKey: [`/api/public/services/${stylist?.id}`],
    enabled: !!stylist?.id,
  });

  // Fetch availability for selected date
  const { data: availability } = useQuery<Availability>({
    queryKey: [`/api/public/availability/${stylist?.id}/${format(selectedDate, 'yyyy-MM-dd')}`],
    enabled: !!stylist?.id,
  });

  const theme = stylist ? APP_THEMES[stylist.themeId as keyof typeof APP_THEMES] || APP_THEMES[1] : APP_THEMES[1];

  useEffect(() => {
    if (stylistError) {
      setLocation("/not-found");
    }
  }, [stylistError, setLocation]);

  if (stylistLoading) {
    return <LoadingSkeleton />;
  }

  if (!stylist) {
    return <div>Stylist not found</div>;
  }



  const handleBookNow = () => {
    setLocation(`/book/${stylist.id}`);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const getAvailableSlots = () => {
    if (!availability || !availability.isOpen) return [];
    return availability.timeRanges.map(range => `${range.start} - ${range.end}`);
  };

  const displayName = stylist.businessName || `${stylist.firstName} ${stylist.lastName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`${theme.header} p-6 shadow-lg`}>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
            <div className="flex items-center justify-center space-x-4 text-sm opacity-90">
              {stylist.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{stylist.location}</span>
                </div>
              )}
              {stylist.showPhone && stylist.phone && (
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>{stylist.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        {/* Portfolio Gallery */}
        {stylist.portfolioPhotos && stylist.portfolioPhotos.length > 0 && (
          <div className="px-6 py-4">
            <PortfolioGallery
              photos={stylist.portfolioPhotos}
              editable={false}
              aspectRatio="square"
              showIndicators={true}
              className="mb-4"
            />
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Bio Card */}
          {stylist.bio && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{stylist.bio}</p>
                {stylist.instagramHandle && (
                  <div className="mt-3 pt-3 border-t">
                    <a
                      href={`https://instagram.com/${stylist.instagramHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-pink-600 text-sm font-medium"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>@{stylist.instagramHandle.replace('@', '')}</span>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Services Card */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Services</h3>
              {servicesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {services?.map((service) => (
                    <ServiceButton
                      key={service.id}
                      service={service}
                      themeId={stylist.themeId}
                      variant="outline"
                      onClick={() => handleBookNow()}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar Preview */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Availability</h3>
              
              {/* Date selector */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateSelect(addDays(selectedDate, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {format(selectedDate, 'EEEE')}
                  </div>
                  <div className="text-lg font-bold">
                    {format(selectedDate, 'MMM d')}
                  </div>
                  {isToday(selectedDate) && (
                    <Badge variant="secondary" className="text-xs">Today</Badge>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateSelect(addDays(selectedDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Available time slots */}
              <div className="space-y-2">
                {getAvailableSlots().length > 0 ? (
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">Available Times</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {getAvailableSlots().map((slot, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className={`text-xs ${theme.accent} border ${theme.accent.replace('text-', 'border-')}`}
                        >
                          {slot}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No availability for this date
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky bottom section */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 space-y-3">
          {/* Message button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // In a real app, this would open a messaging interface
              alert("Messaging feature coming soon!");
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </Button>

          {/* Book Now button */}
          <Button
            className={`w-full font-semibold ${theme.serviceSelected}`}
            onClick={handleBookNow}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-400 to-gray-600 text-white p-6">
        <div className="max-w-md mx-auto">
          <Skeleton className="h-8 w-48 mx-auto mb-2 bg-white/20" />
          <Skeleton className="h-4 w-32 mx-auto bg-white/20" />
        </div>
      </div>
      
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        <Skeleton className="aspect-square w-full" />
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}