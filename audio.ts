// Polyfill or safely get AudioContext
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playSound(type: 'click' | 'correct' | 'wrong' | 'match' | 'levelup') {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      // Short high-pitched click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'correct') {
      // Cheerful rising perfect fourth code
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'wrong') {
      // Downward buzzer
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.linearRampToValueAtTime(110, now + 0.25); // A2
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'match') {
      // Soft nice double beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1046.50, now + 0.12); // C6
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'levelup') {
      // Glorious arpeggio
      const freqs = [392, 523, 659, 784, 1046]; // G4, C5, E5, G5, C6
      freqs.forEach((f, idx) => {
        const oscNode = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscNode.type = 'triangle';
        oscNode.frequency.setValueAtTime(f, now + idx * 0.08);
        gainNode.gain.setValueAtTime(0.08, now + idx * 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        oscNode.start(now + idx * 0.08);
        oscNode.stop(now + idx * 0.08 + 0.3);
      });
    }
  } catch (err) {
    // Audio Context might be blocked or not supported, ignore silently to prevent crashes
    console.log('Audio feedback not activated yet (user action required).', err);
  }
}
