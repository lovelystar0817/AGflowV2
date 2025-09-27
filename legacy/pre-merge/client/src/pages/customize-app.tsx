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
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { ThemeGrid } from "@/components/ThemePreview";
import { APP_THEMES } from "@/lib/appThemes";
import { AppQRCode } from "@/components/AppQRCode";

// Theme templates are now imported from ThemePreview component

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

  const selectedThemeData = APP_THEMES[selectedTheme];

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
                  onClick={() => setLocation("/dashboard/business-settings")}
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
                  Showcase your work with up to 6 photos (coming soon - file upload functionality).
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
                onClick={() => setLocation("/dashboard")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/app/preview?themeId=${selectedTheme}`)}
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
                onClick={() => setLocation("/dashboard")}
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