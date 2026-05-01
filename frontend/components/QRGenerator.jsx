"use client";
import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRGenerator({ componentId = "", componentName = "" }) {
  const printRef = useRef(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>ChainOfCommand QR - ${componentName}</title>
      <style>
        body { background: #000; color: #0f0; font-family: monospace; display: flex; flex-direction: column; align-items: center; padding: 40px; }
        h2 { color: #00ff46; }
        p { color: #4ade80; font-size: 12px; word-break: break-all; max-width: 300px; text-align: center; }
      </style></head>
      <body>${content}</body></html>
    `);
    w.document.close();
    w.print();
  }

  if (!componentId) {
    return (
      <div className="font-mono text-green-800 text-xs border border-green-900 rounded p-3 text-center">
        NO COMPONENT ID PROVIDED
      </div>
    );
  }

  return (
    <div className="qr-generator font-mono border border-green-800 rounded p-3 bg-gray-950 inline-block">
      <div className="text-green-400 text-xs font-bold tracking-widest mb-3 text-center">
        COMPONENT IDENTIFIER QR
      </div>

      <div ref={printRef} className="flex flex-col items-center gap-3">
        <h2 style={{ color: "#00ff46", fontFamily: "monospace", fontSize: 14 }}>
          {componentName || "DEFENSE COMPONENT"}
        </h2>
        <div className="p-2 bg-black border border-green-700 rounded">
          <QRCodeSVG
            value={componentId}
            size={180}
            bgColor="#000000"
            fgColor="#00ff46"
            level="H"
            includeMargin={false}
          />
        </div>
        <p style={{ color: "#4ade80", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", maxWidth: 200, textAlign: "center" }}>
          {componentId}
        </p>
        <p style={{ color: "#166534", fontFamily: "monospace", fontSize: 10, textAlign: "center" }}>
          CHAINOFCOMMAND SECURE COMPONENT REGISTRY
        </p>
      </div>

      <div className="mt-3 flex gap-2 justify-center">
        <button
          onClick={handlePrint}
          className="border border-green-600 text-green-400 hover:bg-green-900/30 text-xs px-3 py-1 rounded transition-all font-mono"
        >
          PRINT QR LABEL
        </button>
      </div>

      <div className="mt-2 text-green-800 text-xs text-center">
        {componentId.slice(0, 16)}...{componentId.slice(-8)}
      </div>
    </div>
  );
}
