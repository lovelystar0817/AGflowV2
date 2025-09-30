import { useState, useEffect } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, QrCode, ExternalLink, Smartphone, Palette, Link, Upload, Save, Settings } from "lucide-react";
import { type Stylist } from "@shared/schema";
import { APP_THEMES, getAppTheme } from "@/lib/appThemes";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TabbedQRCodeSectionProps {
  user: Stylist;
  activeSubTab?: "booking" | "app";
  onSubTabChange?: (tab: "booking" | "app") => void;
}

export default function TabbedQRCodeSection({ 
  user, 
  activeSubTab = "booking", 
  onSubTabChange 
}: TabbedQRCodeSectionProps) {
  const { toast } = useToast();
  const [qrSize, setQrSize] = useState(200);
  const [currentSubTab, setCurrentSubTab] = useState(activeSubTab);
  const [appQrImageUrl, setAppQrImageUrl] = useState<string | null>(null);
  const [appQrLoading, setAppQrLoading] = useState(false);
  
  // Customize tab state
  const [selectedThemeId, setSelectedThemeId] = useState(user.themeId || 1);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update internal state when prop changes
  useEffect(() => {
    setCurrentSubTab(activeSubTab);
  }, [activeSubTab]);

  const handleSubTabChange = (tab: "booking" | "app") => {
    setCurrentSubTab(tab);
    onSubTabChange?.(tab);
  };

  // Generate URLs
  const bookingUrl = `${window.location.origin}/book/${user.id}`;
  const appUrl = user.appSlug ? `${window.location.origin}/app/${user.appSlug}` : null;

  // Fetch saved App QR image (data URL) if available
  useEffect(() => {
    if (!user?.id) return;
    setAppQrLoading(true);
    fetch(`/api/stylists/${user.id}/app-qr`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return (data && typeof data.appQrCodeUrl === "string") ? data.appQrCodeUrl : null;
      })
      .then((url) => setAppQrImageUrl(url))
      .catch(() => setAppQrImageUrl(null))
      .finally(() => setAppQrLoading(false));
  }, [user?.id]);

  const copyToClipboard = async (text: string, type: string) => {
  try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copied!",
        description: `${type} link has been copied to your clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = (id: string, fileName: string) => {
    try {
      // If we already have a PNG data URL from server, download that directly
      if (id === "app-qr-code-svg" && appQrImageUrl && appQrImageUrl.startsWith("data:image/")) {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = appQrImageUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "QR Code downloaded!", description: "Your QR code has been saved as an image." });
        return;
      }

      const svg = document.getElementById(id) as SVGElement | null;
      if (!svg) {
        toast({
          title: "Download failed",
          description: "Could not find QR code to download.",
          variant: "destructive",
        });
        return;
      }

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      canvas.width = qrSize;
      canvas.height = qrSize;

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Create download link
          const link = document.createElement("a");
          link.download = fileName;
          link.href = canvas.toDataURL("image/png");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast({
            title: "QR Code downloaded!",
            description: "Your QR code has been saved as a PNG image.",
          });
        }
      };

      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download QR code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openPreview = (url: string) => {
    window.open(url, "_blank");
  };

  // Portfolio file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setPortfolioFiles(prev => [...prev, ...imageFiles]);
  };

  // Remove portfolio file
  const removePortfolioFile = (index: number) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Save changes function
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // First upload portfolio files if any
      const portfolioUrls: string[] = [];
      
      if (portfolioFiles.length > 0) {
        setIsUploading(true);
        
        // Upload each file individually using the existing /api/upload endpoint
        for (const file of portfolioFiles) {
          const formData = new FormData();
          formData.append('photo', file);

          // Use apiRequest so CSRF header is added automatically for FormData
          const uploadResponse = await apiRequest('POST', '/api/upload', formData);
          const uploadResult = await uploadResponse.json();
          portfolioUrls.push(uploadResult.url);
        }
        setIsUploading(false);
      }

      // Update user profile with theme and portfolio using the correct endpoint
      const updateData = {
        themeId: selectedThemeId,
        ...(portfolioUrls.length > 0 && { portfolioPhotos: portfolioUrls })
      };

      const response = await apiRequest('PATCH', '/api/profile', updateData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      toast({
        title: "Changes Saved Successfully!",
        description: "Your booking page has been updated with your new theme and portfolio."
      });

      // Clear uploaded files after successful save
      setPortfolioFiles([]);
      
      // Invalidate relevant queries so public booking page sees updated theme/data
      queryClient.invalidateQueries({ queryKey: ["/api/public/stylist", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Small delay then reload to show updated data in dashboard
      setTimeout(() => {
        window.location.reload();
      }, 100);

    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "There was an error updating your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={currentSubTab} onValueChange={(value) => handleSubTabChange(value as "booking" | "app")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Booking QR
          </TabsTrigger>
          <TabsTrigger value="app" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Customize
          </TabsTrigger>
        </TabsList>

        {/* Booking Tab */}
        <TabsContent value="booking" className="space-y-6 mt-6">
          {/* QR Code Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Your Booking QR Code
              </CardTitle>
              <CardDescription>
                Clients can scan this QR code to book appointments directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg shadow-sm border">
                  <QRCode
                    id="booking-qr-code-svg"
                    value={bookingUrl}
                    size={qrSize}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>

              {/* QR Size Control */}
              <div className="space-y-2">
                <Label htmlFor="qr-size">QR Code Size</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="qr-size"
                    type="range"
                    min="150"
                    max="300"
                    step="25"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-12">{qrSize}px</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => downloadQRCode("booking-qr-code-svg", `booking-qr-${user.firstName}-${user.lastName}.png`)}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
                <Button
                  onClick={() => openPreview(bookingUrl)}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview Page
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Booking Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Booking Link
              </CardTitle>
              <CardDescription>
                Share this direct link with your clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={bookingUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  onClick={() => copyToClipboard(bookingUrl, "Booking")}
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Usage Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                How to Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">QR Code:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Print on business cards</li>
                    <li>• Display in your salon</li>
                    <li>• Share on social media</li>
                    <li>• Add to marketing materials</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Direct Link:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Send via text message</li>
                    <li>• Share in emails</li>
                    <li>• Post on websites</li>
                    <li>• Include in signatures</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> Clients can book appointments without creating an account. 
                  They'll see your services, available times, and can book instantly!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customize Tab */}
        <TabsContent value="app" className="space-y-6 mt-6">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Choose Your Theme
              </CardTitle>
              <CardDescription>
                Select a theme that matches your brand and style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Theme</Label>
                <Select value={selectedThemeId.toString()} onValueChange={(value) => setSelectedThemeId(parseInt(value))}>
                  <SelectTrigger id="theme-select">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(APP_THEMES).map((theme) => (
                      <SelectItem key={theme.id} value={theme.id.toString()}>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ 
                              background: theme.accent.includes('gradient') 
                                ? theme.accent 
                                : theme.accent.replace('text-', 'bg-').replace('[', '').replace(']', '')
                            }}
                          />
                          <span className="font-medium">{theme.name}</span>
                          <span className="text-sm text-gray-500">- {theme.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Theme Preview */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="text-sm font-medium mb-2">Preview:</div>
                <div className={`p-3 rounded-lg ${getAppTheme(selectedThemeId).card}`}>
                  <div className={`font-semibold ${getAppTheme(selectedThemeId).text}`}>
                    {getAppTheme(selectedThemeId).name}
                  </div>
                  <div className={`text-sm ${getAppTheme(selectedThemeId).subText}`}>
                    {getAppTheme(selectedThemeId).description}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                To update your bio, go to Business Settings. Your bio changes will automatically reflect in your app preview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.href = '/settings/business?from=customize'}
                className="w-full sm:w-auto"
              >
                <Settings className="h-4 w-4 mr-2" />
                Business Settings
              </Button>
            </CardContent>
          </Card>

          {/* Portfolio Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Portfolio Photos
              </CardTitle>
              <CardDescription>
                Upload photos of your work to showcase on your booking page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Input */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="portfolio-upload"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="portfolio-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">
                    Click to upload portfolio photos
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG, JPEG up to 5MB each
                  </span>
                </label>
              </div>

              {/* Preview Uploaded Files */}
              {portfolioFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {portfolioFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-xs p-2">
                          <span className="text-center truncate">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removePortfolioFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Portfolio Photos */}
              {user.portfolioPhotos && user.portfolioPhotos.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Portfolio:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {user.portfolioPhotos.map((photo, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={photo} 
                          alt={`Portfolio ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Changes */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={handleSaveChanges}
                  disabled={isSaving || isUploading}
                  className="w-full"
                  size="lg"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Saving Changes...</span>
                    </div>
                  ) : isUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Uploading Images...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </div>
                  )}
                </Button>
                
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Auto-Update:</strong> When you save changes, your public booking page will automatically update with your new theme, bio, and portfolio photos. No manual refresh needed!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}