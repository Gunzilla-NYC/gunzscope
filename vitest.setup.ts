/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock localStorage for tests with actual storage behavior
// Uses a Proxy to support Object.keys(localStorage) which some code uses
const localStorageStore: Record<string, string> = {};
const localStorageBase = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(localStorageStore)) {
      delete localStorageStore[key];
    }
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};

// Proxy to support Object.keys(localStorage) returning stored keys
const localStorageMock = new Proxy(localStorageBase, {
  ownKeys() {
    return Object.keys(localStorageStore);
  },
  getOwnPropertyDescriptor(_, prop) {
    if (prop in localStorageStore) {
      return { enumerable: true, configurable: true, value: localStorageStore[prop as string] };
    }
    return Object.getOwnPropertyDescriptor(localStorageBase, prop);
  },
});
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock IntersectionObserver for components that use sticky detection
class IntersectionObserverMock {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Simulate element being visible (not intersecting = not sticky)
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'IntersectionObserver', { value: IntersectionObserverMock });

// Suppress console.warn/error in tests unless explicitly testing them
// Tests that need to spy on console should mock it themselves
