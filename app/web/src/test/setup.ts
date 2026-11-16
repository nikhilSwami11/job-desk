import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom has no matchMedia; pretend to be a phone (narrow) unless a test overrides it.
beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = "";
  window.scrollTo = () => {};
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => cleanup());
