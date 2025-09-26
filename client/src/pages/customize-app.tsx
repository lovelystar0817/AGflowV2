import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { updateProfileSchema, type UpdateProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Check, Plus, X, Upload, Palette, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { ThemeGrid } from "@/components/ThemePreview";
import { APP_THEMES } from "@/lib/appThemes";

// Theme templates are now imported from ThemePreview component

export default function CustomizeAppPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Form comes first so we can initialize local state from its values
  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      businessName: "",
      phone: "",
      location: "",
      services: [],
      bio: "",
      businessHours: {},
      yearsOfExperience: 0,
      instagramHandle: "",
      bookingLink: "",
      showPhone: false,
      portfolioPhotos: [],
      themeId: 1,
      appSlug: "",
    },
  });

  // Initialize local UI state from current form defaults
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>(
    (form.getValues("portfolioPhotos") as string[] | undefined) || []
  );
  const [selectedTheme, setSelectedTheme] = useState<number>(
    (form.getValues("themeId") as number | undefined) || 1
  );

  // Populate form with existing user data when loaded
  useEffect(() => {
    if (user) {
      form.reset({
        businessName: user.businessName || "",
        phone: user.phone || "",
        location: user.location || "",
        services: [], // We don't edit services here
        bio: user.bio || "",
        businessHours: user.businessHours || {},
        yearsOfExperience: user.yearsOfExperience || 0,
        instagramHandle: user.instagramHandle || "",
        bookingLink: user.bookingLink || "",
        showPhone: user.showPhone || false,
        portfolioPhotos: user.portfolioPhotos || [],
        themeId: user.themeId || 1,
        appSlug: user.appSlug || "",
      });
      
      setPortfolioPhotos(user.portfolioPhotos || []);
      setSelectedTheme(user.themeId || 1);
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "App customization saved!",
        description: "Your app appearance has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving customization",
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
    form.setValue("portfolioPhotos", updatedPhotos);
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = portfolioPhotos.filter((_, i) => i !== index);
    setPortfolioPhotos(updatedPhotos);
    form.setValue("portfolioPhotos", updatedPhotos);
  };

  const handleThemeSelect = (themeId: number) => {
    setSelectedTheme(themeId);
    form.setValue("themeId", themeId);
  };

  const onSubmit = (data: UpdateProfile) => {
    // Include the current portfolioPhotos and themeId in the submission
    const submissionData = {
      ...data,
      portfolioPhotos,
      themeId: selectedTheme,
    };
    updateProfileMutation.mutate(submissionData);
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Business Information</span>
                </CardTitle>
                <CardDescription>
                  Basic information that will be displayed on your public app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your Business Name" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appSlug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App URL Slug</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="your-salon-name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          This will be your public app URL: yourapp.com/{field.value || "your-slug"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City, State" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1 (555) 123-4567" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="showPhone"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Phone Publicly</FormLabel>
                          <FormDescription>
                            Display your phone number on your public app
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell clients about yourself and your expertise..."
                          className="min-h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  businessName={form.watch("businessName") || "Your Business"}
                  location={form.watch("location") || "Your Location"}
                  bio={form.watch("bio") || "Your bio will appear here..."}
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
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="min-w-32"
              >
                {updateProfileMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4" />
                    <span>Save Changes</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}