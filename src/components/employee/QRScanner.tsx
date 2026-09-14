"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (token: string) => void;
}

export function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    async function initScanner() {
      console.log("[QRScanner] Component mount / isOpen = true");

      // --- DIAGNOSTIC LOGGING START ---
      console.log("--- QR Scanner Diagnostics ---");
      console.log("Origin:", window.location.origin);
      console.log("isSecureContext:", window.isSecureContext);
      console.log("mediaDevices type:", typeof navigator.mediaDevices);

      if (navigator.mediaDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          console.log(`Found ${videoDevices.length} video devices:`, videoDevices);
        } catch (err) {
          console.error("enumerateDevices Error:", err);
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log("getUserMedia: SUCCESS (Permission granted by browser)");
          stream.getTracks().forEach(track => track.stop());
          console.log("Diagnostic stream stopped.");
        } catch (err: any) {
          console.error("getUserMedia: FAILURE");
          console.error("Error Name:", err.name);
          console.error("Error Message:", err.message);
        }
      } else {
        console.error("navigator.mediaDevices is UNDEFINED");
      }
      // --- DIAGNOSTIC LOGGING END ---

      if (scannerRef.current) {
        console.log("[QRScanner] Scanner already exists, stopping before restart...");
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode("qr-reader-region");
      console.log("[QRScanner] Html5Qrcode instance created");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      console.log("[QRScanner] Calling scanner.start()...");
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Prefer rear camera
          config,
          (decodedText) => {
            console.log("[QRScanner] Scan success:", decodedText);
            onScanSuccess(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // Silence noise
          }
        );
        console.log("[QRScanner] scanner.start() SUCCESS");
      } catch (err) {
        console.error("[QRScanner] html5-qrcode.start Error:", err);
      }
    }

    initScanner();

    return () => {
      console.log("[QRScanner] Component unmount / isOpen = false");
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (!scannerRef.current) {
      console.log("[QRScanner] stopScanner: No scanner instance to stop");
      return;
    }

    try {
      if (scannerRef.current.isScanning) {
        console.log("[QRScanner] Calling scanner.stop()...");
        await scannerRef.current.stop();
        console.log("[QRScanner] scanner.stop() SUCCESS");
      } else {
        console.log("[QRScanner] scanner.stop() skipped (not scanning)");
      }
    } catch (err) {
      console.error("[QRScanner] Failed to stop scanner:", err);
    } finally {
      try {
        console.log("[QRScanner] Calling scanner.clear()...");
        scannerRef.current.clear();
        console.log("[QRScanner] scanner.clear() SUCCESS");
      } catch (err) {
        console.error("[QRScanner] Failed to clear scanner:", err);
      }
      scannerRef.current = null;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Scan QR Code">
      <div className="flex flex-col gap-4">
        <div
          id="qr-reader-region"
          className="overflow-hidden rounded-lg bg-black aspect-square w-full max-w-sm mx-auto"
        />
        <p className="text-center text-sm text-ink-600">
          Point your camera at the official office QR code.
        </p>
        <Button variant="secondary" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
