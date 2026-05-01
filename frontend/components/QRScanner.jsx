"use client";
import { useEffect, useRef, useState } from "react";

export default function QRScanner({ onScan, onError, active = true }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [scannedId, setScannedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!active) return;

    let html5QrCode = null;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        setStatus("scanning");

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            setScannedId(decodedText);
            setStatus("success");
            html5QrCode.stop().catch(() => { });
            onScan?.(decodedText);
          },
          () => { }
        );
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Camera access denied or QR library failed");
        onError?.(err);
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { });
      }
    };
  }, [active]);

  function handleRetry() {
    setStatus("idle");
    setScannedId(null);
    setErrorMsg(null);
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => { }).finally(() => {
        scannerRef.current = null;
        setTimeout(() => setStatus("scanning"), 100);
      });
    }
  }

  return (
    <div className="qr-scanner font-mono border border-green-800 rounded p-3 bg-gray-950">
      <div className="text-green-400 text-xs font-bold tracking-widest mb-2">
        COMPONENT QR VERIFICATION
      </div>

      {status === "idle" && (
        <div className="text-green-600 text-xs text-center py-4">
          INITIALIZING SCANNER...
        </div>
      )}

      {status === "scanning" && (
        <div className="relative">
          <div id="qr-reader" ref={containerRef} className="w-full rounded overflow-hidden" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-400" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-400" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-400" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-400" />
          </div>
          <div className="text-green-600 text-xs text-center mt-2 animate-pulse">
            SCANNING FOR COMPONENT QR CODE...
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="border border-green-500 bg-green-900/20 rounded p-3">
          <div className="text-green-400 font-bold text-sm mb-1">✓ COMPONENT IDENTIFIED</div>
          <div className="text-green-600 text-xs mb-1">COMPONENT ID:</div>
          <div className="text-green-300 text-xs break-all font-mono bg-black/30 p-2 rounded">
            {scannedId}
          </div>
          <div className="text-green-600 text-xs mt-2">
            PROCEEDING TO SUPPLY CHAIN VERIFICATION...
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="border border-red-500 bg-red-900/20 rounded p-3">
          <div className="text-red-400 font-bold text-sm mb-1">⚠ SCANNER ERROR</div>
          <div className="text-red-300 text-xs mb-3">{errorMsg}</div>
          <button
            onClick={handleRetry}
            className="border border-red-500 text-red-400 hover:bg-red-900/30 text-xs px-3 py-1 rounded transition-all"
          >
            RETRY SCAN
          </button>
        </div>
      )}
    </div>
  );
}
