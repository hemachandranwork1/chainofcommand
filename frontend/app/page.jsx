"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  const [dots, setDots] = useState("");

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);

    const redirectTimer = setTimeout(() => {
      router.push("/login");
    }, 1800);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono">
      <style>{`
        @keyframes scanline {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.8; }
          94% { opacity: 1; }
          96% { opacity: 0.9; }
          97% { opacity: 1; }
        }
        .terminal-flicker { animation: flicker 4s infinite; }
        .scanline {
          position: absolute;
          width: 100%;
          height: 2px;
          background: rgba(0, 255, 70, 0.07);
          animation: scanline 3s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="relative w-full max-w-lg px-8 terminal-flicker overflow-hidden">
        <div className="scanline" />

        <div className="text-center mb-8">
          <div className="text-green-900 text-xs tracking-widest mb-4">
            ████████████████████████████████████████
          </div>
          <div className="text-green-400 text-xs tracking-widest mb-1">
            ▶ DEFENSE PROCUREMENT SECURITY SYSTEM
          </div>
          <h1 className="text-3xl font-bold text-green-400 tracking-widest mb-1">
            CHAINOFCOMMAND
          </h1>
          <div className="text-green-700 text-xs tracking-wider">
            DUAL-LAYER BLOCKCHAIN VERIFICATION
          </div>
          <div className="text-green-900 text-xs tracking-widest mt-2">
            ████████████████████████████████████████
          </div>
        </div>

        <div className="space-y-2 text-xs text-green-700 mb-8">
          {[
            "LOADING IDENTITY REGISTRY...",
            "LOADING COMPONENT REGISTRY...",
            "LOADING PROCUREMENT GATE...",
            "LOADING AUDIT LOG...",
            "LOADING GOVERNANCE MULTISIG...",
            "LOADING CIRCUIT BREAKER...",
          ].map((line, i) => (
            <div
              key={line}
              className="flex items-center gap-2"
              style={{ opacity: 1, animationDelay: `${i * 0.2}s` }}
            >
              <span className="text-green-600">✓</span>
              <span>{line}</span>
            </div>
          ))}
        </div>

        <div className="border border-green-800 rounded p-3 text-center">
          <div className="text-green-400 text-sm font-bold tracking-widest">
            INITIALIZING CHAINOFCOMMAND{dots}
          </div>
          <div className="mt-2 w-full bg-green-950 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(dots.length / 3) * 100}%`, transition: "width 0.4s ease" }}
            />
          </div>
          <div className="text-green-800 text-xs mt-2">
            REDIRECTING TO AUTHENTICATION...
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="text-green-900 text-xs">
            TRUST THE PERSON. TRUST THE COMPONENT. TRUST NOTHING ELSE.
          </div>
        </div>
      </div>
    </div>
  );
}
