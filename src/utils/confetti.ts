import type confetti from "canvas-confetti";

let confettiModulePromise: Promise<typeof confetti> | null = null;

const loadConfetti = async (): Promise<typeof confetti> => {
  if (!confettiModulePromise) {
    confettiModulePromise = import("canvas-confetti").then(
      (module) => module.default,
    );
  }
  return confettiModulePromise;
};

export const fireCelebrationConfetti = async (): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }
  const confetti = await loadConfetti();

  confetti({
    particleCount: 160,
    spread: 90,
    origin: { y: 0.7 },
    scalar: 0.9,
  });

  confetti({
    particleCount: 120,
    spread: 120,
    origin: { y: 0.5 },
    scalar: 0.8,
  });
};
