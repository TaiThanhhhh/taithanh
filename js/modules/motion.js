/**
 * @file Frame-rate independent animation helpers.
 *
 * Anything animated per frame must look the same on 60, 75, 144 or 240 Hz
 * screens. These helpers express smoothing in real time instead of "per frame".
 */
(function (Portfolio) {
  'use strict';

  const FRAME_MS = 1000 / 60;

  Portfolio.motion = Object.freeze({
    FRAME_MS,

    /**
     * Converts a per-60fps-frame smoothing factor into the factor for a frame of
     * `k` 60fps-frames (k = dt / 16.67ms), so lerp(a, b, factor) behaves the same
     * at any refresh rate.
     * @param {number} perFrame Fraction covered per 60fps frame (0..1).
     * @param {number} k Elapsed time in 60fps frames.
     */
    smoothing(perFrame, k) {
      return 1 - (1 - perFrame) ** k;
    },

    /**
     * Exponential approach of `current` towards `target` at `rate` per second.
     * @param {number} dtMs Elapsed time in milliseconds.
     */
    damp(current, target, rate, dtMs) {
      return current + (target - current) * (1 - Math.exp((-rate * dtMs) / 1000));
    },

    /**
     * Frame pacer: call it on every requestAnimationFrame; it returns true on every
     * n-th display frame, with n = round(refreshRate / targetFps). An integer divisor
     * keeps the pacing even on 120/144/240 Hz screens (no judder). The refresh rate
     * is tracked continuously, so moving the window to another monitor adapts.
     * @param {number} targetFps
     * @returns {(now: number) => boolean}
     */
    createPacer(targetFps) {
      let frameMs = 1000 / targetFps; // moving average of the display frame time
      let lastTime = 0;
      let frameCount = 0;
      return (now) => {
        if (lastTime) frameMs += (Math.min(Math.max(now - lastTime, 0), 50) - frameMs) * 0.05;
        lastTime = now;
        const divisor = Math.max(1, Math.round(1000 / frameMs / targetFps));
        frameCount++;
        return frameCount % divisor === 0;
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
