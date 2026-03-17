"use client";

import { useState, useEffect, useCallback } from "react";
import { TourSpotlight } from "@/components/tour-spotlight";
import { TOUR_STEPS, wasTourSeen, markTourSeen, type TourId } from "@/lib/tour-steps";
import { tourRegistry } from "@/lib/tour-registry";

interface PageTourProps {
  tourId: TourId;
  /** Auto-start the tour on the user's first visit to this page (default: true) */
  autoStart?: boolean;
}

export function PageTour({ tourId, autoStart = true }: PageTourProps) {
  const steps = TOUR_STEPS[tourId] ?? [];
  const [run, setRun] = useState(false);
  const [step, setStep] = useState(0);

  const start = useCallback(() => {
    setStep(0);
    setRun(true);
  }, []);

  const stop = useCallback(() => {
    setRun(false);
    markTourSeen(tourId);
  }, [tourId]);

  // Auto-start on first visit
  useEffect(() => {
    if (!autoStart || steps.length === 0 || wasTourSeen(tourId)) return;
    const t = setTimeout(start, 700);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register with the global registry so TourFloatingButton can trigger it
  useEffect(() => {
    if (steps.length === 0) return;
    tourRegistry.register(start);
    return () => tourRegistry.unregister();
  }, [start, steps.length]);

  if (!run || steps.length === 0) return null;

  return (
    <TourSpotlight
      steps={steps}
      currentStep={step}
      onNext={() => {
        if (step < steps.length - 1) setStep((s) => s + 1);
        else stop();
      }}
      onPrev={() => setStep((s) => Math.max(0, s - 1))}
      onClose={stop}
      onSkip={stop}
    />
  );
}
