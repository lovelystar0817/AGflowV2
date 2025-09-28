import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
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

export default function PublicAppPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/:slug");
  const { user } = useAuth(); // Check if client is logged in
  
  const slug = params?.slug;

  // Fetch stylist profile by slug
  const { data: stylistProfile, isLoading: isProfileLoading, error: profileError } = useQuery<StylistProfile>({
    queryKey: [`/api/public/stylist/slug/${slug}`],
    enabled: !!slug,
  });

  // Fetch stylist services
  const { data: services, isLoading: isServicesLoading } = useQuery<{ items: StylistService[] }>({
    queryKey: [`/api/public/stylist/${stylistProfile?.id}/services`],
    enabled: !!stylistProfile?.id,
  });

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (profileError || !stylistProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Stylist Not Found</h2>
          <p className="text-gray-600 mb-4">The stylist profile you're looking for doesn't exist or is not available.</p>
          <Button onClick={() => setLocation("/")}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const clientLoggedIn = false; // Placeholder state - set to false for now

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stylist App Preview with Custom Message Handler */}
      <div className="flex justify-center pb-8">
        <div className="w-full max-w-md mx-auto bg-white shadow-lg rounded-t-3xl overflow-hidden">
          <StylistAppPreview
            themeId={stylistProfile.themeId}
            stylistId={stylistProfile.id}
            stylistName={`${stylistProfile.firstName} ${stylistProfile.lastName}`}
            businessName={stylistProfile.businessName || undefined}
            location={stylistProfile.location || ""}
            phone={stylistProfile.phone || undefined}
            showPhone={stylistProfile.showPhone || false}
            bio={stylistProfile.bio || ""}
            portfolioPhotos={stylistProfile.portfolioPhotos || []}
            services={services?.items?.map(s => ({
              id: s.id,
              name: s.serviceName,
              price: parseFloat(s.price) || 0,
              duration: s.durationMinutes
            })) || []}
          />
          
          {/* Override the sticky message button with conditional auth UI */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
            {!clientLoggedIn ? (
              <div className="flex gap-2">
                <a href="/login" className="w-1/2 py-2 rounded bg-indigo-600 text-white text-center">
                  Log In
                </a>
                <a href="/signup" className="w-1/2 py-2 rounded bg-gray-600 text-white text-center">
                  Sign Up
                </a>
              </div>
            ) : (
              <button className="w-full py-2 rounded bg-indigo-600 text-white">
                Message Stylist
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}