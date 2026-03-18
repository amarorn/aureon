"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { tourRegistry } from "@/lib/tour-registry";

export function TourFloatingButton() {
  const [visible, setVisible] = useState(tourRegistry.hasTour);

  useEffect(() => {
    return tourRegistry.subscribe(() => setVisible(tourRegistry.hasTour));
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => tourRegistry.start()}
      title="Ver tutorial desta tela"
      aria-label="Ver tutorial desta tela"
      className="fixed bottom-6 right-6 z-40 group flex size-11 items-center justify-center rounded-full text-white shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.55 0.28 268) 0%, oklch(0.45 0.25 295) 100%)",
        boxShadow:
          "0 4px 20px oklch(0.55 0.28 268 / 45%), 0 0 0 0 oklch(0.55 0.28 268 / 30%)",
        animation: "tour-btn-pulse 3s ease-in-out infinite",
      }}
    >
      <HelpCircle className="size-5 transition-transform duration-200 group-hover:rotate-12" />

      {/* Tooltip label */}
      <span
        className="pointer-events-none absolute right-12 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{
          background: "oklch(0.12 0.016 268)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px oklch(1 0 0 / 8%)",
        }}
      >
        Ver tutorial
      </span>

      <style>{`
        @keyframes tour-btn-pulse {
          0%, 100% { box-shadow: 0 4px 20px oklch(0.55 0.28 268 / 45%), 0 0 0 0 oklch(0.55 0.28 268 / 30%); }
          50%       { box-shadow: 0 4px 20px oklch(0.55 0.28 268 / 45%), 0 0 0 8px oklch(0.55 0.28 268 / 0%); }
        }
      `}</style>
    </button>
  );
}
