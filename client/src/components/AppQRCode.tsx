import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, QrCode, Smartphone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AppQRCodeProps {
  stylistId: string;
  appSlug: string;
}

interface QRCodeResponse {
  appQrCodeUrl: string;
}

export function AppQRCode({ stylistId, appSlug }: AppQRCodeProps) {
  const { toast } = useToast();
  const [qrData, setQrData] = useState<string | null>(null);

  // Fetch existing QR code on mount
  const { data: existingQR, isLoading } = useQuery<QRCodeResponse>({
    queryKey: [`/api/stylists/${stylistId}/app-qr`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/stylists/${stylistId}/app-qr`);
      return await response.json();
    },
    enabled: !!stylistId,
    retry: false, // Don't retry on 404
  });

  // Generate QR code mutation
  const generateQRMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/stylists/${stylistId}/app-qr`, {});
      return await response.json();
    },
    onSuccess: (data: QRCodeResponse) => {
      setQrData(data.appQrCodeUrl);
      toast({
        title: "QR Code generated!",
        description: "Your app QR code has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("QR generation error:", error);
      toast({
        title: "Generation failed",
        description: "Could not generate QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update local state when data loads
  useEffect(() => {
    if (existingQR?.appQrCodeUrl) {
      setQrData(existingQR.appQrCodeUrl);
    }
  }, [existingQR]);

  // Extract URL from data URL for display
  const getAppUrl = () => {
    if (qrData && qrData.startsWith("data:image/")) {
      // For data URLs, construct the app URL
      return `${window.location.origin}/app/${appSlug}`;
    }
    return qrData;
  };

  const handleCopyLink = async () => {
    const appUrl = getAppUrl();
    if (!appUrl) return;

    try {
      await navigator.clipboard.writeText(appUrl);
      toast({
        title: "Link copied!",
        description: "The app link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQR = () => {
    if (!qrData) return;

    try {
      const svg = document.getElementById("app-qr-code-svg") as SVGElement | null;
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

      canvas.width = 200;
      canvas.height = 200;

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Create download link
          const link = document.createElement("a");
          link.download = `app-qr-${appSlug}.png`;
          link.href = canvas.toDataURL("image/png");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast({
            title: "QR Code downloaded!",
            description: "Your app QR code has been saved as a PNG image.",
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

  const handleGenerateQR = () => {
    generateQRMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            App QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          App QR Code
        </CardTitle>
        <CardDescription>
          Share this QR code so clients can view your full branded app page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrData ? (
          <>
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-sm border">
                <QRCode
                  id="app-qr-code-svg"
                  value={getAppUrl() || ""}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* App URL Display */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {getAppUrl()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download QR
              </Button>
            </div>
          </>
        ) : (
          /* QR Not Available - Show Generate Button */
          <div className="text-center py-8">
            <div className="max-w-md mx-auto">
              <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No QR Code Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Generate a QR code for your app to share with clients.
              </p>
              <Button
                onClick={handleGenerateQR}
                disabled={generateQRMutation.isPending}
                className="w-full"
              >
                {generateQRMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}