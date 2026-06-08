'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
  useEffect(() => {
    // Only register service worker in browser environments and when not already registered
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('PWA: Service Worker registrado com escopo:', registration.scope);
          })
          .catch((error) => {
            console.error('PWA: Falha ao registrar Service Worker:', error);
          });
      });
    }
  }, []);

  return null;
}
