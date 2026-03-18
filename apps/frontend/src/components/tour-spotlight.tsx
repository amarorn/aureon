"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour-steps";

// ── Geometry helpers ────────────────────────────────────────────────────────

const PAD = 10; // padding around the spotlight
const TOOLTIP_W = 360;
const TOOLTIP_ESTIMATED_H = 220;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function queryRect(selector: string): Rect | null {
  if (!selector) return null;
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  } catch {
    return null;
  }
}

function spotRect(r: Rect): Rect {
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

type Side = "top" | "bottom" | "left" | "right" | "center";

function chooseSide(r: Rect, preferred?: TourStep["placement"]): Side {
  if (preferred && preferred !== "auto") return preferred as Side;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const spaceBelow = vh - (r.top + r.height);
  const spaceAbove = r.top;
  const spaceRight = vw - (r.left + r.width);
  if (spaceBelow >= TOOLTIP_ESTIMATED_H + 24) return "bottom";
  if (spaceAbove >= TOOLTIP_ESTIMATED_H + 24) return "top";
  if (spaceRight >= TOOLTIP_W + 24) return "right";
  return "bottom";
}

function tooltipPos(sr: Rect, side: Side): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;
  let top = 0;
  let left = 0;

  if (side === "bottom") {
    top = sr.top + sr.height + PAD + gap;
    left = sr.left + sr.width / 2 - TOOLTIP_W / 2;
  } else if (side === "top") {
    top = sr.top - PAD - gap - TOOLTIP_ESTIMATED_H;
    left = sr.left + sr.width / 2 - TOOLTIP_W / 2;
  } else if (side === "right") {
    top = sr.top + sr.height / 2 - TOOLTIP_ESTIMATED_H / 2;
    left = sr.left + sr.width + PAD + gap;
  } else if (side === "left") {
    top = sr.top + sr.height / 2 - TOOLTIP_ESTIMATED_H / 2;
    left = sr.left - PAD - gap - TOOLTIP_W;
  } else {
    // center
    top = vh / 2 - TOOLTIP_ESTIMATED_H / 2;
    left = vw / 2 - TOOLTIP_W / 2;
  }

  // clamp
  const margin = 12;
  left = Math.max(margin, Math.min(vw - TOOLTIP_W - margin, left));
  top = Math.max(margin, Math.min(vh - TOOLTIP_ESTIMATED_H - margin, top));
  return { top, left };
}

// ── Arrow indicator ──────────────────────────────────────────────────────────

function Arrow({ side }: { side: Side }) {
  if (side === "center") return null;
  const base =
    "absolute size-3 border-l-2 border-b-2 border-primary/50 bg-transparent";
  const variants: Record<Side, string> = {
    bottom: "-top-2 left-1/2 -translate-x-1/2 rotate-[135deg]",
    top: "-bottom-2 left-1/2 -translate-x-1/2 -rotate-[45deg]",
    right: "-left-2 top-1/2 -translate-y-1/2 rotate-[45deg]",
    left: "-right-2 top-1/2 -translate-y-1/2 -rotate-[225deg]",
    center: "",
  };
  return <div className={cn(base, variants[side])} />;
}

// ── Main component ───────────────────────────────────────────────────────────

interface TourSpotlightProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onSkip: () => void;
}

interface FrameState {
  spot: Rect | null;
  tipTop: number;
  tipLeft: number;
  side: Side;
  visible: boolean;
}

export function TourSpotlight({
  steps,
  currentStep,
  onNext,
  onPrev,
  onClose,
  onSkip,
}: TourSpotlightProps) {
  const step = steps[currentStep];
  const [frame, setFrame] = useState<FrameState>({
    spot: null,
    tipTop: 0,
    tipLeft: 0,
    side: "bottom",
    visible: false,
  });
  const [mounted, setMounted] = useState(false);
  const frameRef = useRef<FrameState>(frame);
  frameRef.current = frame;

  useEffect(() => setMounted(true), []);

  // Compute layout for current step
  const layout = useCallback(() => {
    if (!step) return;

    const raw = queryRect(step.target);
    const side = raw ? chooseSide(raw, step.placement) : "center";

    if (!raw) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setFrame({
        spot: null,
        tipTop: vh / 2 - TOOLTIP_ESTIMATED_H / 2,
        tipLeft: vw / 2 - TOOLTIP_W / 2,
        side: "center",
        visible: true,
      });
      return;
    }

    const sr = spotRect(raw);
    const { top: tipTop, left: tipLeft } = tooltipPos(sr, side);
    setFrame({ spot: sr, tipTop, tipLeft, side, visible: true });
  }, [step]);

  // On step change: fade out → scroll into view → recompute → fade in
  useEffect(() => {
    setFrame((f) => ({ ...f, visible: false }));

    const el = step?.target ? document.querySelector(step.target) : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    const delay = el ? 380 : 60;
    const t = setTimeout(() => layout(), delay);
    return () => clearTimeout(t);
  }, [currentStep, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute on scroll / resize
  useEffect(() => {
    const handler = () => layout();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [layout]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      else if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  if (!mounted || !step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const { spot, tipTop, tipLeft, side, visible } = frame;

  const content = (
    <>
      {/* Dark veil — click anywhere to close */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{
          backgroundColor: spot ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.72)",
          transition: "background-color 0.3s ease",
          pointerEvents: "auto",
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* Spotlight — box-shadow creates the overlay cutout */}
      {spot && (
        <div
          className="fixed pointer-events-none z-[9991] rounded-xl"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            border: "2px solid oklch(0.62 0.26 268 / 55%)",
            // Subtle inner glow
            outline: "4px solid oklch(0.62 0.26 268 / 12%)",
            transition: "top 0.38s cubic-bezier(0.4,0,0.2,1), left 0.38s cubic-bezier(0.4,0,0.2,1), width 0.38s cubic-bezier(0.4,0,0.2,1), height 0.38s cubic-bezier(0.4,0,0.2,1)",
            opacity: visible ? 1 : 0,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[9999] pointer-events-auto"
        style={{
          top: tipTop,
          left: tipLeft,
          width: TOOLTIP_W,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.97)",
          transition: "opacity 0.28s ease, transform 0.28s ease",
        }}
      >
        {/* Arrow indicator */}
        <div className="relative">
          <Arrow side={side} />

          {/* Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.12 0.016 268)",
              boxShadow:
                "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px oklch(1 0 0 / 9%)",
            }}
          >
            {/* Gradient header */}
            <div
              className="px-5 pt-4 pb-3.5 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.55 0.28 268) 0%, oklch(0.45 0.25 295) 100%)",
              }}
            >
              {/* Decorative blur dot */}
              <div
                className="absolute -top-6 -right-6 size-24 rounded-full opacity-20 blur-2xl"
                style={{ background: "oklch(0.8 0.1 268)" }}
              />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">
                      Passo {currentStep + 1} de {steps.length}
                    </p>
                    <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">
                      {step.title}
                    </h3>
                </div>

                <button
                  onClick={onClose}
                  className="shrink-0 flex size-6 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all mt-0.5"
                  aria-label="Fechar tour"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pt-4 pb-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.content}
              </p>

              {/* Progress pills */}
              <div className="flex items-center gap-1.5 mt-4">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i === currentStep ? 24 : 6,
                      background:
                        i === currentStep
                          ? "oklch(0.62 0.26 268)"
                          : i < currentStep
                          ? "oklch(0.62 0.26 268 / 40%)"
                          : "oklch(1 0 0 / 12%)",
                    }}
                  />
                ))}
                <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
                  {currentStep + 1}/{steps.length}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={onSkip}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1"
                >
                  Pular tour
                </button>

                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <button
                      onClick={onPrev}
                      className="flex items-center gap-1 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-all"
                    >
                      <ChevronLeft className="size-3.5" />
                      Voltar
                    </button>
                  )}

                  <button
                    onClick={isLast ? onClose : onNext}
                    className={cn(
                      "flex items-center gap-1 h-8 px-4 rounded-lg text-xs font-semibold text-white transition-all",
                      "hover:opacity-90 active:scale-95"
                    )}
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.55 0.28 268) 0%, oklch(0.45 0.25 295) 100%)",
                      boxShadow: "0 2px 12px oklch(0.55 0.28 268 / 35%)",
                    }}
                  >
                    {isLast ? (
                      "Concluir ✓"
                    ) : (
                      <>
                        Próximo
                        <ChevronRight className="size-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
