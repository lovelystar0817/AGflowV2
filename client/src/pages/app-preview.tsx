import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
  Instagram,
  ArrowLeft
} from "lucide-react";
import { format, addDays, isSameDay, isToday } from "date-fns";
import { ServiceButton } from "@/components/ServiceButton";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { APP_THEMES } from "@/lib/appThemes";
import { useAuth } from "@/hooks/use-auth";
import { StylistAppPreview } from "@/components/StylistAppPreview";

interface StylistProfile {
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

export default function AppPreviewPage() {
  const [location, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuth();

  // Fetch fresh stylist profile data
  const { data: stylistProfile, isLoading: profileLoading } = useQuery<StylistProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user?.id,
  });

  // Parse query parameters from URL
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const themeIdFromQuery = searchParams.get('themeId');
  const parsedThemeId = themeIdFromQuery ? parseInt(themeIdFromQuery, 10) : null;
  const themeId = (parsedThemeId && parsedThemeId >= 1 && parsedThemeId <= 4) ? parsedThemeId : (stylistProfile?.themeId || 1);

  // Fetch services for the current user
  const { data: services, isLoading: servicesLoading } = useQuery<{
    items: StylistService[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: [`/api/services`],
    enabled: !!user?.id,
  });

  // Fetch availability for selected date
  const { data: availability } = useQuery<Availability>({
    queryKey: [`/api/availability/${format(selectedDate, 'yyyy-MM-dd')}`],
    enabled: !!user?.id,
  });

  const theme = APP_THEMES[themeId as keyof typeof APP_THEMES] || APP_THEMES[1];

  if (!user) {
    return <div>Please log in to preview your app</div>;
  }

  if (profileLoading || !stylistProfile) {
    return <LoadingSkeleton />;
  }

  const handleBookNow = () => {
    // In preview mode, this could show a message or do nothing
    alert("This is a preview - booking functionality not available here");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const getAvailableSlots = () => {
    if (!availability || !availability.isOpen) return [];
    
    const formatTime12Hour = (time24: string) => {
      const [hours, minutes] = time24.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    
    return availability.timeRanges.map(range => 
      `${formatTime12Hour(range.start)} - ${formatTime12Hour(range.end)}`
    );
  };

  const displayName = stylistProfile?.businessName || `${stylistProfile?.firstName} ${stylistProfile?.lastName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back to Dashboard Button */}
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard/customize-app")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>

      {/* Stylist App Preview */}
      <div className="flex justify-center pb-8">
        <StylistAppPreview
          themeId={themeId}
          stylistId={stylistProfile?.id}
          stylistName={`${stylistProfile?.firstName} ${stylistProfile?.lastName}`}
          businessName={stylistProfile?.businessName || undefined}
          location={stylistProfile?.location || ""}
          phone={stylistProfile?.phone || undefined}
          showPhone={stylistProfile?.showPhone || false}
          bio={stylistProfile?.bio || ""}
          portfolioPhotos={stylistProfile?.portfolioPhotos || []}
          services={services?.items?.map(s => ({
            id: s.id,
            name: s.serviceName,
            price: parseFloat(s.price) || 0,
            duration: s.durationMinutes
          })) || []}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header skeleton */}
        <div className="bg-gray-200 p-6 shadow-lg rounded-b-xl">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>

        <div className="bg-white shadow-xl">
          {/* Portfolio skeleton */}
          <div className="px-6 py-4">
            <Skeleton className="h-48 w-full rounded-lg mb-4" />
          </div>

          {/* Bio skeleton */}
          <div className="px-6 py-4">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Services skeleton */}
          <div className="px-6 py-4">
            <Skeleton className="h-6 w-20 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>

          {/* Availability skeleton */}
          <div className="px-6 py-4">
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Button skeleton */}
          <div className="px-6 py-6 border-t">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}