import confetti from "canvas-confetti";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Kurzer Konfetti-Burst – z. B. nach erfolgreicher Tippabgabe. */
export function burstConfetti() {
  if (REDUCED) return;
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.7 },
    scalar: 0.9,
    colors: ["#22c55e", "#16a34a", "#ffffff", "#fbbf24"],
  });
}

/** Großer Konfetti-Regen – z. B. wenn man Platz 1 ist. */
export function celebrate() {
  if (REDUCED) return;
  const end = Date.now() + 1200;
  const colors = ["#fbbf24", "#22c55e", "#ffffff", "#38bdf8"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
