import { useState, useEffect } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, QrCode, ExternalLink, Smartphone, Palette, Link } from "lucide-react";
import { type Stylist } from "@shared/schema";

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
            App QR
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

        {/* App Tab */}
        <TabsContent value="app" className="space-y-6 mt-6">
          {appUrl ? (
            <>
              {/* QR Code Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Your App Preview QR Code
                  </CardTitle>
                  <CardDescription>
                    Share your styled app preview with your custom theme
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg shadow-sm border">
                      <QRCode
                        id="app-qr-code-svg"
                        value={appUrl}
                        size={qrSize}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                  </div>

                  {/* QR Size Control */}
                  <div className="space-y-2">
                    <Label htmlFor="app-qr-size">QR Code Size</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="app-qr-size"
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
                      onClick={() => downloadQRCode("app-qr-code-svg", `app-qr-${user.firstName}-${user.lastName}.png`)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR Code
                    </Button>
                    <Button
                      onClick={() => openPreview(appUrl)}
                      variant="outline"
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview App
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* App Link */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    App Preview Link
                  </CardTitle>
                  <CardDescription>
                    Share this link to show your styled app preview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={appUrl}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(appUrl, "App preview")}
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
                    How to Use App QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">App Preview QR:</h4>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        <li>• Show clients your styling</li>
                        <li>• Portfolio presentations</li>
                        <li>• Social media marketing</li>
                        <li>• Professional consultations</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Features:</h4>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                        <li>• Custom theme display</li>
                        <li>• Portfolio gallery</li>
                        <li>• Service showcase</li>
                        <li>• Professional branding</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      ✨ <strong>Pro Tip:</strong> Use this to showcase your app design and branding to potential clients. 
                      It displays your custom theme, portfolio, and services in a beautiful mobile-friendly layout!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  App QR Code Not Available
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center py-8">
                <div className="max-w-md mx-auto">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Palette className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Customize Your App First
                  </h3>
                  <p className="text-gray-600 mb-4">
                    To generate an App QR code, you need to first customize your app template with themes and portfolio photos.
                  </p>
                  <Button
                    onClick={() => window.location.href = "/dashboard/customize-app"}
                    className="w-full"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Customize My App
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}