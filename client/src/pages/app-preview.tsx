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
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch current user's profile data
  const { data: stylist, isLoading: stylistLoading } = useQuery<StylistProfile>({
    queryKey: ["/api/profile"],
  });

  // Fetch services for the current user
  const { data: services, isLoading: servicesLoading } = useQuery<StylistService[]>({
    queryKey: [`/api/services`],
    enabled: !!stylist?.id,
  });

  // Fetch availability for selected date
  const { data: availability } = useQuery<Availability>({
    queryKey: [`/api/availability/${format(selectedDate, 'yyyy-MM-dd')}`],
    enabled: !!stylist?.id,
  });

  const theme = stylist ? APP_THEMES[stylist.themeId as keyof typeof APP_THEMES] || APP_THEMES[1] : APP_THEMES[1];

  if (stylistLoading) {
    return <LoadingSkeleton />;
  }

  if (!stylist) {
    return <div>Please log in to preview your app</div>;
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
    return availability.timeRanges.map(range => `${range.start} - ${range.end}`);
  };

  const displayName = stylist.businessName || `${stylist.firstName} ${stylist.lastName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`${theme.header} p-6 shadow-lg`}>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/dashboard/customize-app")}
              className="absolute left-4 top-4 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customize
            </Button>
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

        {/* Bio */}
        {stylist.bio && (
          <div className="px-6 py-4">
            <p className="text-gray-700 leading-relaxed">{stylist.bio}</p>
          </div>
        )}

        {/* Services */}
        {services && services.length > 0 && (
          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold mb-3">Services</h3>
            <div className="space-y-2">
              {services.slice(0, 4).map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  themeId={stylist.themeId}
                  onClick={() => {}}
                  variant="outline"
                  size="sm"
                />
              ))}
              {services.length > 4 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  +{services.length - 4} more services
                </p>
              )}
            </div>
          </div>
        )}

        {/* Availability Calendar */}
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold mb-3">Available Times</h3>

          {/* Date Selector */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateSelect(addDays(selectedDate, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="font-medium">
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
              </div>
              <div className="text-sm text-gray-500">
                {format(selectedDate, "MMM d")}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateSelect(addDays(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            {getAvailableSlots().length > 0 ? (
              getAvailableSlots().slice(0, 3).map((slot, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {}}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {slot}
                </Button>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No availability for this date</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Button */}
        <div className="px-6 py-6 border-t">
          <Button
            onClick={() => alert("This is a preview - messaging functionality not available here")}
            className={`w-full ${theme.serviceSelected} hover:opacity-90 text-white py-3 text-lg font-medium`}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Message {stylist.firstName}
          </Button>
        </div>
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