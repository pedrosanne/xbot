/**
 * Web Audio API Sound Synthesizer
 * Generates premium notification sounds (Kaching, Chime, Beeps) dynamically in the browser
 * without requiring external MP3 assets.
 */

let globalAudioContext = null;
let isUnlocked = false;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!globalAudioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      globalAudioContext = new AudioContext();
    }
  }
  return globalAudioContext;
}

export function unlockAudio() {
  if (isUnlocked || typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const unlock = () => {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Play a silent buffer to definitively unlock iOS Web Audio
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    isUnlocked = true;

    ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
      document.removeEventListener(evt, unlock, true);
    });
  };

  ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlock, true);
  });
}

export async function playSynthesizedSound(type) {
  if (typeof window === 'undefined') return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(e => console.warn('Could not resume context:', e));
  }
  
  try {
    // If the sound type is a custom URL (uploaded file), play it directly via Web Audio API (fixes iOS)
    if (type && (type.startsWith('http://') || type.startsWith('https://') || type.startsWith('/api/uploads/'))) {
      try {
        const response = await fetch(type);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await new Promise((resolve, reject) => {
          ctx.decodeAudioData(arrayBuffer, resolve, reject);
        });
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (e) {
        console.error("Error playing custom audio via Web Audio API:", e);
        // Fallback
        const customAudio = new Audio(type);
        customAudio.play().catch(err => console.error("Fallback HTML Audio failed:", err));
      }
      return;
    }

    const now = ctx.currentTime;
    
    if (type === 'sale') {
      // --- "CHA-CHING" (Cash Register) ---
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const bellGain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1500, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2200, now);
      
      bellGain.gain.setValueAtTime(0.25, now);
      bellGain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
      
      osc1.connect(bellGain);
      osc2.connect(bellGain);
      bellGain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
      
      // Coin rattle
      const bufferSize = ctx.sampleRate * 0.3; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(3, now);
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.setValueAtTime(0.15, now + 0.04);
      noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
      
      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noiseNode.start(now + 0.04);
      noiseNode.stop(now + 0.3);
      
    } else if (type === 'message') {
      // --- "DING" (Pleasant chime) ---
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.3);
      
    } else {
      // --- "DEFAULT" (Soft double beep) ---
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(783.99, now + 0.08);
      
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.setValueAtTime(0, now + 0.06);
      gainNode.gain.setValueAtTime(0.12, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.22);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (err) {
    console.error('Failed to play synthesized sound:', err);
  }
}
