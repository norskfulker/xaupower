"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeScannedAddress } from "@/lib/qr";
import { cn } from "@/lib/utils";

type BarcodeDetectorLike = {
  detect: (
    source: CanvasImageSource | ImageBitmap
  ) => Promise<Array<{ rawValue?: string }>>;
};

function getDetector(): BarcodeDetectorLike | null {
  const Ctor = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

export function QrScannerDialog({
  open,
  onOpenChange,
  onScan,
  title = "Scan QR code",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (value: string) => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = getDetector();

    async function start() {
      setError(null);
      if (!detector) {
        setError(
          "This browser cannot scan QR from the camera. Upload a QR image or paste the address."
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setScanning(true);

        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const raw = codes[0]?.rawValue;
              if (raw) {
                onScanRef.current(normalizeScannedAddress(raw));
                onOpenChange(false);
                return;
              }
            }
          } catch {
            /* keep scanning */
          }
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
        };
        void tick();
      } catch {
        setError("Camera access was blocked. Upload a QR image instead.");
      }
    }

    void start();

    return () => {
      stopped = true;
      setScanning(false);
      window.cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onOpenChange]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const detector = getDetector();
    if (!detector) {
      toast.error("QR image scan is not supported in this browser");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close();
      const raw = codes[0]?.rawValue;
      if (!raw) {
        toast.error("No QR code found in that image");
        return;
      }
      onScan(normalizeScannedAddress(raw));
      onOpenChange(false);
    } catch {
      toast.error("Could not read that image");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Point the camera at a wallet QR, or upload a screenshot.
          </DialogDescription>
        </DialogHeader>
        <video
          ref={videoRef}
          className="aspect-square w-full rounded-xl bg-ink object-cover"
          playsInline
          muted
        />
        {scanning && (
          <p className="text-xs text-muted-label">Looking for a QR code…</p>
        )}
        {error && <p className="text-sm text-hotpink">{error}</p>}
        <label
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full cursor-pointer"
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          Upload QR image
        </label>
      </DialogContent>
    </Dialog>
  );
}
