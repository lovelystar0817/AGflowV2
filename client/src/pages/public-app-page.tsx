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
import { StylistAppPreview } from "@/components/StylistAppPreview";

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
      {/* Stylist App Preview */}
      <div className="flex justify-center pb-8">
        <StylistAppPreview
          themeId={stylist.themeId}
          stylistId={stylist.id}
          stylistName={`${stylist.firstName} ${stylist.lastName}`}
          businessName={stylist.businessName || undefined}
          location={stylist.location || ""}
          phone={stylist.phone || undefined}
          showPhone={stylist.showPhone || false}
          bio={stylist.bio || ""}
          portfolioPhotos={stylist.portfolioPhotos || []}
          services={services?.map(s => ({
            id: s.id,
            name: s.serviceName,
            price: parseFloat(s.price) || 0,
            duration: s.durationMinutes
          })) || []}
        />
      </div>

      {/* Client-specific sticky bottom section */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-3 max-w-md mx-auto">
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