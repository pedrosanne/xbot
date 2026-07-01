/**
 * Web Audio API Sound Synthesizer
 * Generates premium notification sounds (Kaching, Chime, Beeps) dynamically in the browser
 * without requiring external MP3 assets.
 */

export function playSynthesizedSound(type) {
  if (typeof window === 'undefined') return;
  
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
  try {
    // If the sound type is a custom URL (uploaded file), play it directly
    if (type && (type.startsWith('http://') || type.startsWith('https://') || type.startsWith('/api/uploads/'))) {
      const customAudio = new Audio(type);
      customAudio.play().catch(e => console.error("Error playing custom audio from URL:", e));
      return;
    }

    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    if (type === 'sale') {
      // --- "CHA-CHING" (Cash Register) ---
      
      // 1. High-pitched metallic bell strike
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
      
      // 2. Coin rattle (white noise burst with bandpass filter)
      const bufferSize = ctx.sampleRate * 0.3; // 0.3 seconds
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
      // Start slightly after the bell strike to simulate the coins clinking
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
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
      
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
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
      
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
