/// <reference types="vite/client" />

declare global {
  interface Window {
    __FIREBASE_CONFIG__?: Record<string, string>;
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
