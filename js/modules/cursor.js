/**
 * @file Custom mouse follower that grows over interactive elements.
 */
(function (Portfolio) {
  'use strict';

  const CURSOR_SELECTOR = '.cursor';
  const INTERACTIVE_SELECTOR = '.menubar, a, .navigation-close';

  const STATE = {
    idle: { scale: 1, opacity: 0.6 },
    hover: { scale: 1.4, opacity: 1 },
  };

  Portfolio.cursor = {
    init() {
      const cursor = document.querySelector(CURSOR_SELECTOR);
      if (!cursor) return;

      window.addEventListener('mousemove', (event) => {
        gsap.to(cursor, { x: event.clientX, y: event.clientY, stagger: 0.002 });
      });

      document.querySelectorAll(INTERACTIVE_SELECTOR).forEach((el) => {
        el.addEventListener('mouseenter', () => gsap.to(cursor, STATE.hover));
        el.addEventListener('mouseleave', () => gsap.to(cursor, STATE.idle));
      });
    },
  };
})((window.Portfolio = window.Portfolio || {}));
