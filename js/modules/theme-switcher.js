/**
 * @file Background theme picker backed by particles.js.
 */
(function (Portfolio) {
  'use strict';

  const SELECTORS = {
    container: '.theme-changer',
    panel: '.theme-panel',
    option: '.themes a[data-theme]',
  };
  const ACTIVE_CLASS = 'theme-changer-active';

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
      const container = document.querySelector(SELECTORS.container);

      document.querySelector(SELECTORS.panel)?.addEventListener('click', (event) => {
        event.preventDefault();
        container?.classList.toggle(ACTIVE_CLASS);
      });

      document.querySelectorAll(SELECTORS.option).forEach((option) => {
        option.addEventListener('click', (event) => {
          event.preventDefault();
          applyTheme(option.dataset.theme);
        });
      });

      applyTheme(Portfolio.config.particles.defaultTheme);
    },
  };
})((window.Portfolio = window.Portfolio || {}));
