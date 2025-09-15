import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, QrCode, ExternalLink, Smartphone } from "lucide-react";
import { type Stylist } from "@shared/schema";

interface QRCodeSectionProps {
  user: Stylist;
}

export default function QRCodeSection({ user }: QRCodeSectionProps) {
  const { toast } = useToast();
  const [qrSize, setQrSize] = useState(200);

  // Generate booking URL
  const bookingUrl = `${window.location.origin}/book/${user.id}`;

  const copyBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast({
        title: "Link copied!",
        description: "Booking link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    try {
      const svg = document.getElementById("qr-code-svg") as SVGElement | null;
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
          link.download = `booking-qr-${user.firstName}-${user.lastName}.png`;
          link.href = canvas.toDataURL("image/png");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast({
            title: "QR Code downloaded!",
            description: "Your booking QR code has been saved as a PNG image.",
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

  const openBookingPage = () => {
    window.open(bookingUrl, "_blank");
  };

  return (
    <div className="space-y-6">
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
                id="qr-code-svg"
                value={bookingUrl}
                size={qrSize}
                level="M"
                includeMargin={true}
                data-testid="qr-code"
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
                data-testid="slider-qr-size"
              />
              <span className="text-sm text-gray-500 w-12">{qrSize}px</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={downloadQRCode}
              variant="outline"
              className="flex-1"
              data-testid="button-download-qr"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
            <Button
              onClick={openBookingPage}
              variant="outline"
              className="flex-1"
              data-testid="button-preview-page"
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
            <Copy className="h-5 w-5" />
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
              data-testid="input-booking-url"
            />
            <Button
              onClick={copyBookingLink}
              variant="outline"
              data-testid="button-copy-link"
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
    </div>
  );
}