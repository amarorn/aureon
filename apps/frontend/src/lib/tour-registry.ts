// Lightweight singleton that connects PageTour (per-page) with TourFloatingButton (global).
// No Zustand or React context needed — just a module-level store with subscribers.

export interface TourStartOptions {
  stepIndex?: number;
  selector?: string;
}

type StartFn = (options?: TourStartOptions) => void;
type Listener = () => void;

let _start: StartFn | null = null;
const _listeners = new Set<Listener>();

export const tourRegistry = {
  register(fn: StartFn) {
    _start = fn;
    _listeners.forEach((l) => l());
  },
  unregister() {
    _start = null;
    _listeners.forEach((l) => l());
  },
  start(options?: TourStartOptions) {
    _start?.(options);
  },
  get hasTour() {
    return _start !== null;
  },
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
