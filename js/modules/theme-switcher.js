/**
 * @file Home background picker backed by particles.js.
 * The options live in the settings panel (settings.js).
 */
(function (Portfolio) {
  'use strict';

  const OPTION_SELECTOR = '.themes a[data-theme]';

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

    destroyParticles();
    const preset = themes[name];
    if (preset) {
      particlesJS(containerId, JSON.parse(JSON.stringify(preset)));
    }
  }

  Portfolio.themeSwitcher = {
    applyTheme,

    init() {
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
