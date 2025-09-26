import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppQRCodeProps {
  url: string;
  title?: string;
  description?: string;
}

export const AppQRCode: React.FC<AppQRCodeProps> = ({
  url,
  title = "Your App is Ready!",
  description = "Scan this QR code or share the link to let customers book with you."
}) => {
  const { toast } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "The app link has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) {
      toast({
        title: "Download failed",
        description: "QR code not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "my-app-qr.png";
    link.click();

    toast({
      title: "QR code downloaded!",
      description: "The QR code has been saved to your downloads.",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Smartphone className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <QRCodeCanvas value={url} size={180} />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 break-all bg-gray-50 p-2 rounded">
            {url}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};