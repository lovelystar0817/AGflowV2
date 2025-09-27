import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { updateTemplateSchema, type UpdateTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Check, Upload, Palette, Smartphone, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { ThemeGrid } from "@/components/ThemePreview";
import { APP_THEMES } from "@/lib/appThemes";
import { AppQRCode } from "@/components/ui/AppQRCode";
import { StylistAppPreview } from "@/components/StylistAppPreview";

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
    
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please choose an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please choose an image file.",
          variant: "destructive",
        });
        return;
      }

      try {
        // Upload the file
        const formData = new FormData();
        formData.append('photo', file);

        const response = await apiRequest('POST', '/api/upload', formData);
        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const { url } = await response.json();
        
        // Add the uploaded photo URL to the portfolio
        const updatedPhotos = [...portfolioPhotos, url];
        setPortfolioPhotos(updatedPhotos);

        toast({
          title: "Photo uploaded successfully!",
          description: "Your portfolio photo has been added.",
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: "There was an error uploading your photo. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    // Trigger file picker
    input.click();
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
                  Showcase your work with up to 6 photos. Upload high-quality images to highlight your best work.
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
                  {portfolioPhotos.length}/6 photos uploaded. Images are saved to your portfolio and will appear in your public booking app.
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-32"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Preview My App
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>App Preview</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <StylistAppPreview
                      themeId={selectedTheme}
                      stylistName={user?.businessName || user?.name || "Your Business"}
                      businessName={user?.businessName}
                      location={user?.location || "Your Location"}
                      phone={user?.phone}
                      showPhone={true}
                      bio={user?.bio || "Your bio will appear here..."}
                      portfolioPhotos={portfolioPhotos}
                      services={[
                        { id: 1, name: "Service 1", price: 50, duration: 60 },
                        { id: 2, name: "Service 2", price: 75, duration: 90 }
                      ]}
                      className="border-0 shadow-none"
                    />
                  </div>
                </DialogContent>
              </Dialog>
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
