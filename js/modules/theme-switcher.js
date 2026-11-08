/**
 * @file Home background picker backed by particles.js.
 * The options live in the settings panel (settings.js).
 */
(function (Portfolio) {
  'use strict';

  const OPTION_SELECTOR = '.themes a[data-theme]';
  /** particles.js was tuned for this many updates per second. */
  const DESIGN_FPS = 60;

  let currentTheme = null;

  /**
   * particles.js moves every particle by a fixed step *per frame*, so on a 144 Hz
   * screen it runs 2.4x too fast and redraws 144 times a second. This routes its
   * loop (window.requestAnimFrame / cancelRequestAnimFrame) through a frame pacer
   * (motion.createPacer) so it advances ~60 times a second at any refresh rate:
   * 60/75 Hz -> every frame, 120/144 Hz -> every 2nd, 240 Hz -> every 4th.
   */
  function paceParticles() {
    const raf = window.requestAnimationFrame.bind(window);
    const caf = window.cancelAnimationFrame.bind(window);
    const shouldRun = Portfolio.motion.createPacer(DESIGN_FPS);
    const pending = new Map(); // our token -> current native frame id
    let nextToken = 1;

    window.requestAnimFrame = (callback) => {
      const token = nextToken++;
      const step = (now) => {
        if (!shouldRun(now)) {
          pending.set(token, raf(step)); // skip this display frame
          return;
        }
        pending.delete(token);
        callback(now);
      };
      pending.set(token, raf(step));
      return token;
    };

    window.cancelRequestAnimFrame = (token) => {
      if (pending.has(token)) caf(pending.get(token));
      pending.delete(token);
    };
  }

  function destroyParticles() {
    if (window.pJSDom && window.pJSDom.length > 0) {
      window.pJSDom[0].pJS.fn.vendors.destroypJS();
      window.pJSDom = [];
    }
  }

  /**
   * Replaces the current particle background with the named preset.
   * Unknown names and the `clean` preset leave the background empty.
   * @param {string} name Key of `Portfolio.config.particles.themes`.
   */
  function applyTheme(name) {
    const { containerId, themes } = Portfolio.config.particles;

    currentTheme = name;
    destroyParticles();
    const preset = themes[name];
    if (preset) {
      particlesJS(containerId, JSON.parse(JSON.stringify(preset)));
    }
  }

  Portfolio.themeSwitcher = {
    applyTheme,

    /** Stops the particle loop (e.g. while ambient mode covers the page). */
    pause() {
      destroyParticles();
    },

    /** Restarts the last chosen background. */
    resume() {
      if (currentTheme && !(window.pJSDom && window.pJSDom.length)) applyTheme(currentTheme);
    },

    init() {
      paceParticles(); // must run before the first particlesJS() call
      document.querySelectorAll(OPTION_SELECTOR).forEach((option) => {
        option.addEventListener('click', (event) => {
          event.preventDefault();
          applyTheme(option.dataset.theme);
        });
      });

      applyTheme(Portfolio.config.particles.defaultTheme);
    },
  };
})((window.Portfolio = window.Portfolio || {}));
