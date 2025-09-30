import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, QrCode } from "lucide-react";

type Props = { stylistId: string };

export default function AppQRCode({ stylistId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null); // server-saved PNG data URL
  const [working, setWorking] = useState(false);
  const svgRef = useRef<HTMLDivElement | null>(null);

  // Fetch current App URL and server QR (if any)
  useEffect(() => {
    let cancelled = false;
    const fetchQr = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stylists/${stylistId}/app-qr`, { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        setAppUrl(data.appUrl ?? null);
        setQrUrl(data.appQrCodeUrl ?? null);
      } catch (e) {
        console.error("fetch app qr failed", e);
        if (!cancelled) {
          setAppUrl(null);
          setQrUrl(null);
          toast({ title: "Failed to load", description: "Could not fetch App QR" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchQr();
    return () => {
      cancelled = true;
    };
  }, [stylistId, toast]);

  // Ask server to generate and persist a PNG QR; update state
  const handleGenerate = async () => {
    try {
      setWorking(true);
      const res = await fetch(`/api/stylists/${stylistId}/app-qr`, { method: "POST", credentials: "include" });
      const data = await res.json();
      setAppUrl(data.appUrl ?? null);
      setQrUrl(data.appQrCodeUrl ?? null);
      toast({ title: "QR created", description: "App QR has been generated." });
    } catch (e) {
      console.error("generate app qr failed", e);
      toast({ title: "Failed", description: "Could not generate App QR", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  // Download server PNG or convert fallback SVG to PNG
  const handleDownload = async () => {
    if (qrUrl) {
      const a = document.createElement("a");
      a.href = qrUrl;
      a.download = "app-qr.png";
      a.click();
      return;
    }

    try {
      const container = svgRef.current;
      if (!container) throw new Error("SVG container missing");
      const svg = container.querySelector("svg");
      if (!svg) throw new Error("SVG not found");
      const svgString = new XMLSerializer().serializeToString(svg as Node);
      const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 512;
        canvas.height = img.height || 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no-canvas-ctx");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = png;
        a.download = "app-qr.png";
        a.click();
      };
      img.onerror = (err) => {
        console.error("svg->png failed", err);
        window.open(svgData, "_blank");
      };
      img.src = svgData;
    } catch (err) {
      toast({ title: "Download failed", description: "Could not download QR code.", variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      toast({ title: "Copied", description: "App link copied to clipboard." });
    } catch (e) {
      console.error("copy failed", e);
      toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          App QR Code
        </CardTitle>
        <CardDescription>Share this QR code so clients can view your full branded app page</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            {loading ? (
              <div className="w-48 h-48 grid place-items-center text-gray-400">Loading…</div>
            ) : qrUrl ? (
              <img src={qrUrl} alt="App QR" className="w-48 h-48" />
            ) : (
              <div ref={svgRef} className="w-48 h-48 grid place-items-center">
                <QRCodeSVG value={appUrl ?? ""} size={200} level="M" includeMargin={true} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>

          {!qrUrl && (
            <Button onClick={handleGenerate} disabled={working || loading} className="flex-1">
              {working ? (
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
          )}
        </div>

        <div className="flex gap-2 items-center">
          <Input value={appUrl ?? ""} readOnly className="flex-1 font-mono text-sm" placeholder="Your app link will appear here" />
          <Button onClick={handleCopyLink} variant="outline" disabled={!appUrl}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}