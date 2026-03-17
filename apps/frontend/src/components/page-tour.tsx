"use client";

import { useState, useEffect, useCallback } from "react";
import { TourSpotlight } from "@/components/tour-spotlight";
import { TOUR_STEPS, wasTourSeen, markTourSeen, type TourId } from "@/lib/tour-steps";
import { tourRegistry } from "@/lib/tour-registry";
import { consumeSupportTourRequest } from "@/lib/support/ui-actions";

interface PageTourProps {
  tourId: TourId;
  /** Auto-start the tour on the user's first visit to this page (default: true) */
  autoStart?: boolean;
}

export function PageTour({ tourId, autoStart = true }: PageTourProps) {
  const steps = TOUR_STEPS[tourId] ?? [];
  const [run, setRun] = useState(false);
  const [step, setStep] = useState(0);

  const start = useCallback((options?: { stepIndex?: number; selector?: string }) => {
    let initialStep = 0;

    if (options?.selector) {
      const index = steps.findIndex((tourStep) => tourStep.target === options.selector);
      if (index >= 0) {
        initialStep = index;
      }
    } else if (
      typeof options?.stepIndex === "number" &&
      Number.isFinite(options.stepIndex)
    ) {
      initialStep = Math.max(0, Math.min(steps.length - 1, options.stepIndex));
    }

    setStep(initialStep);
    setRun(true);
  }, [steps]);

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

  useEffect(() => {
    if (steps.length === 0) return;
    const pendingRequest = consumeSupportTourRequest(tourId);
    if (!pendingRequest) return;

    const t = setTimeout(() => {
      start({
        stepIndex: pendingRequest.stepIndex,
        selector: pendingRequest.selector,
      });
    }, 250);

    return () => clearTimeout(t);
  }, [start, steps.length, tourId]);

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
