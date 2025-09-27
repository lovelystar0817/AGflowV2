import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { updateTemplateSchema, type UpdateTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Upload, Palette, Smartphone, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

// Note: These components may need to be stubbed or implemented if missing
// PortfolioGallery, ThemeGrid, APP_THEMES, and AppQRCode were from legacy
// For now, we'll implement basic placeholders

interface Portfolio {
  photos: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  maxPhotos: number;
  editable: boolean;
  aspectRatio: string;
  showIndicators: boolean;
}

// Simple portfolio component placeholder
function PortfolioGallery({ photos, onAddPhoto, onRemovePhoto, maxPhotos }: Portfolio) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img src={photo} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => onRemovePhoto(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            onClick={onAddPhoto}
            className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100"
          >
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-500">Add Photo</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

import { APP_THEMES } from "@/lib/appThemes";

interface ThemeGridProps {
  selectedTheme: number;
  onThemeSelect: (themeId: number) => void;
  businessName: string;
  location: string;
  bio: string;
  showMockup: boolean;
}

function ThemeGrid({ selectedTheme, onThemeSelect, businessName }: ThemeGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Object.entries(APP_THEMES).map(([id, theme]) => (
        <button
          key={id}
          onClick={() => onThemeSelect(parseInt(id))}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            selectedTheme === parseInt(id)
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className={`w-full h-24 rounded mb-3 ${theme.header}`} />
          <p className="font-medium text-sm">{theme.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
          <p className="text-xs text-gray-400 mt-1">{businessName}</p>
        </button>
      ))}
    </div>
  );
}

import { AppQRCode } from "@/components/ui/AppQRCode";

export default function CustomizeAppPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Initialize local UI state
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>(
    user?.portfolioPhotos || []
  );
  const [selectedTheme, setSelectedTheme] = useState<number>(
    user?.themeId || 1
  );
  const [showQRCode, setShowQRCode] = useState<boolean>(false);

  // Update local state when user data loads
  useEffect(() => {
    if (user) {
      setPortfolioPhotos(user.portfolioPhotos || []);
      setSelectedTheme(user.themeId || 1);
    }
  }, [user]);

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: UpdateTemplate) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template saved!",
        description: "Your app theme and portfolio have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setShowQRCode(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddPhoto = () => {
    if (portfolioPhotos.length >= 6) {
      toast({
        title: "Maximum photos reached",
        description: "You can upload up to 6 portfolio photos.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real implementation, this would open a file picker
    // For now, we'll just add a placeholder URL
    const newPhoto = `https://images.unsplash.com/photo-${Date.now()}?w=400&h=400&fit=crop`;
    const updatedPhotos = [...portfolioPhotos, newPhoto];
    setPortfolioPhotos(updatedPhotos);
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = portfolioPhotos.filter((_, i) => i !== index);
    setPortfolioPhotos(updatedPhotos);
  };

  const handleThemeSelect = (themeId: number) => {
    setSelectedTheme(themeId);
  };

  const handleSaveTemplate = () => {
    const templateData = {
      themeId: selectedTheme,
      portfolioPhotos,
    };
    updateTemplateMutation.mutate(templateData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center space-x-3 mb-2">
            <Palette className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Customize Your App
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Personalize your public booking app appearance and information.
          </p>
        </div>

        <div className="space-y-8">
            {/* Business Settings Notice */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Business Information</span>
                </CardTitle>
                <CardDescription>
                  To update your business name, phone, bio, or location, go to Business Settings in the dashboard. These changes will automatically reflect in your app preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setLocation("/settings/business")}
                  className="w-full sm:w-auto"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Business Settings
                </Button>
              </CardContent>
            </Card>

            {/* Portfolio Photos */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Photos</CardTitle>
                <CardDescription>
                  Showcase your work with up to 6 photos (demo functionality - file upload coming soon).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PortfolioGallery
                  photos={portfolioPhotos}
                  onAddPhoto={handleAddPhoto}
                  onRemovePhoto={handleRemovePhoto}
                  maxPhotos={6}
                  editable={true}
                  aspectRatio="square"
                  showIndicators={true}
                />
                <p className="text-sm text-gray-500 mt-4">
                  {portfolioPhotos.length}/6 photos uploaded. Note: This is a demo - actual file upload coming soon!
                </p>
              </CardContent>
            </Card>

            {/* Theme Selector */}
            <Card>
              <CardHeader>
                <CardTitle>App Theme</CardTitle>
                <CardDescription>
                  Choose a color theme for your public booking app with live preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeGrid
                  selectedTheme={selectedTheme}
                  onThemeSelect={handleThemeSelect}
                  businessName={user?.businessName || "Your Business"}
                  location={user?.location || "Your Location"}
                  bio={user?.bio || "Your bio will appear here..."}
                  showMockup={true}
                />
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Preview functionality can be added later
                  toast({
                    title: "Preview coming soon!",
                    description: "App preview functionality will be available in a future update.",
                  });
                }}
                className="min-w-32"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Preview My App
              </Button>
              <Button
                type="button"
                onClick={handleSaveTemplate}
                disabled={updateTemplateMutation.isPending}
                className="min-w-48"
              >
                {updateTemplateMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4" />
                    <span>Save Template & Generate QR</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

        {/* QR Code Display */}
        {showQRCode && user?.appSlug && (
          <div className="mt-8">
            <AppQRCode
              url={`${window.location.origin}/app/${user.appSlug}`}
              title="Your App is Ready!"
              description="Scan this QR code or share the link to let customers book with you."
            />
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setLocation("/")}
                className="min-w-32"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
