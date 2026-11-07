/**
 * @file Accent colour picker: swaps a single palette stylesheet (`css/<theme>.css`).
 * The swatches live in the settings panel (settings.js).
 */
(function (Portfolio) {
  'use strict';

  const STYLESHEET_ID = 'color-theme-stylesheet';
  const SWATCH_SELECTOR = '.colors a[data-color]';

  /**
   * Applies a palette by pointing one shared <link> at its stylesheet.
   * @param {string} theme One of `Portfolio.config.colorThemes`.
   */
  function applyColor(theme) {
    if (!Portfolio.config.colorThemes.includes(theme)) return;

    let link = document.getElementById(STYLESHEET_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = STYLESHEET_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `css/${theme}.css`;
  }

  Portfolio.colorSwitcher = {
    applyColor,

    init() {
      document.querySelectorAll(SWATCH_SELECTOR).forEach((swatch) => {
        swatch.addEventListener('click', (event) => {
          event.preventDefault();
          applyColor(swatch.dataset.color);
        });
      });
    },
  };
})((window.Portfolio = window.Portfolio || {}));
