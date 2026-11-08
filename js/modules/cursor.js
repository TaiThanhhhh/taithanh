/**
 * @file Custom mouse follower that grows over interactive elements.
 *
 * The ring follows the pointer through a single requestAnimationFrame loop with
 * time-based (exponential) smoothing, so it trails the pointer by the same amount
 * of time on any refresh rate. The loop sleeps while the ring is at rest.
 */
(function (Portfolio) {
  'use strict';

  const CURSOR_SELECTOR = '.cursor';
  const INTERACTIVE_SELECTOR = '.menubar, a, .navigation-close';
  /** How fast the ring catches up with the pointer (1/s). Higher = tighter. */
  const FOLLOW_RATE = 14;
  /** Below this distance (px) the ring snaps and the loop sleeps. */
  const REST_EPSILON = 0.1;

  const STATE = {
    idle: { scale: 1, opacity: 0.6, duration: 0.35, overwrite: 'auto' },
    hover: { scale: 1.4, opacity: 1, duration: 0.35, overwrite: 'auto' },
  };

  /** Fast per-frame property setter (gsap.quickSetter when available). */
  function setter(el, prop) {
    if (typeof gsap.quickSetter === 'function') return gsap.quickSetter(el, prop, 'px');
    return (value) => gsap.set(el, { [prop]: value });
  }

  Portfolio.cursor = {
    init() {
      const cursor = document.querySelector(CURSOR_SELECTOR);
      if (!cursor) return;

      const setX = setter(cursor, 'x');
      const setY = setter(cursor, 'y');
      const target = { x: 0, y: 0 };
      const pos = { x: 0, y: 0 };
      let seen = false;
      let rafId = 0;
      let lastTime = 0;

      function tick(now) {
        // Clamp: rAF timestamps can precede lastTime slightly; a long pause must not teleport.
        const dt = Math.min(Math.max(now - lastTime, 0), 100);
        lastTime = now;
        pos.x = Portfolio.motion.damp(pos.x, target.x, FOLLOW_RATE, dt);
        pos.y = Portfolio.motion.damp(pos.y, target.y, FOLLOW_RATE, dt);

        const resting =
          Math.abs(target.x - pos.x) < REST_EPSILON && Math.abs(target.y - pos.y) < REST_EPSILON;
        if (resting) {
          pos.x = target.x;
          pos.y = target.y;
        }
        setX(pos.x);
        setY(pos.y);
        rafId = resting ? 0 : window.requestAnimationFrame(tick);
      }

      window.addEventListener(
        'mousemove',
        (event) => {
          target.x = event.clientX;
          target.y = event.clientY;
          if (!seen) {
            // First move: appear under the pointer instead of flying in from a corner.
            seen = true;
            pos.x = target.x;
            pos.y = target.y;
          }
          if (!rafId) {
            lastTime = performance.now();
            rafId = window.requestAnimationFrame(tick);
          }
        },
        { passive: true },
      );

      document.querySelectorAll(INTERACTIVE_SELECTOR).forEach((el) => {
        el.addEventListener('mouseenter', () => gsap.to(cursor, STATE.hover));
        el.addEventListener('mouseleave', () => gsap.to(cursor, STATE.idle));
      });
    },
  };
})((window.Portfolio = window.Portfolio || {}));
