import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetSupabaseMock } from './supabaseMock';
import { resetGymSettingsCache } from '../content/useGymSettings';

// Every test talks to the in-memory fake Supabase, never the real project.
vi.mock('../lib/supabase', async () => ({ supabase: (await import('./supabaseMock')).supabaseMock }));

beforeEach(() => {
  resetSupabaseMock();
  resetGymSettingsCache();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom does not implement these browser APIs used by some components.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!window.scrollTo) {
  window.scrollTo = () => {};
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver ??= ResizeObserverStub;

// jsdom has no object URLs (used for photo previews before upload).
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:preview';
  URL.revokeObjectURL = () => {};
}
