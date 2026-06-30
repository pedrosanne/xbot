'use client';

import { useEffect } from 'react';
import { playSynthesizedSound } from '@/lib/audioSynth';

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('PWA: Service Worker registrado com escopo:', registration.scope);
          })
          .catch((error) => {
            console.error('PWA: Falha ao registrar Service Worker:', error);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }

      // Listen for messages from the Service Worker to play notification sounds
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'PLAY_SOUND') {
          playSynthesizedSound(event.data.soundType);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('load', registerSW);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  return null;
}
