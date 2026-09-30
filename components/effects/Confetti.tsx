'use client';

import confetti from 'canvas-confetti';

export function fireConfetti(options?: confetti.Options) {
  const defaults: confetti.Options = {
    spread: 60,
    startVelocity: 30,
    ticks: 200,
    origin: { y: 0.7 },
    colors: ['#34D399', '#FBBF24', '#F87171', '#60A5FA', '#F472B6'],
  };

  try {
    confetti({
      ...defaults,
      ...options,
    });
  } catch {
    // Graceful fallback if window or canvas isn't available
  }
}

export function fireGoalCelebration() {
  const end = Date.now() + 1000;
  const colors = ['#10B981', '#F59E0B', '#38BDF8', '#F97316'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
