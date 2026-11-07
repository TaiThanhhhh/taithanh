/**
 * @file Accent colour picker.
 *
 * Renders the picker into every `[data-component="color-changer"]` mount point
 * and swaps a single palette stylesheet (`css/<theme>.css`) on selection.
 */
(function (Portfolio) {
  'use strict';

  const STYLESHEET_ID = 'color-theme-stylesheet';
  const SELECTORS = {
    mount: '[data-component="color-changer"]',
    panel: '.color-panel',
    swatch: '.colors a[data-color]',
  };
  const ACTIVE_CLASS = 'color-changer-active';

  /** @returns {string} Inner markup of one colour picker. */
  function template() {
    const swatches = Portfolio.config.colorThemes
      .map((theme) => `<li><a href="#0" class="${theme}" title="${theme}" data-color="${theme}"></a></li>`)
      .join('');

    return `
      <div class="color-panel">
        <img src="images/gear.png" alt="">
      </div>
      <div class="color-selector">
        <div class="heading">Custom Colors</div>
        <div class="colors">
          <ul>${swatches}</ul>
        </div>
      </div>`;
  }

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

  function togglePanels(event) {
    event.preventDefault();
    document.querySelectorAll(SELECTORS.mount).forEach((el) => el.classList.toggle(ACTIVE_CLASS));
  }

  Portfolio.colorSwitcher = {
    applyColor,

    /** Must run before other modules bind listeners to `<a>` elements. */
    render() {
      const markup = template();
      document.querySelectorAll(SELECTORS.mount).forEach((el) => {
        el.innerHTML = markup;
      });
    },

    init() {
      document.querySelectorAll(SELECTORS.panel).forEach((panel) => {
        panel.addEventListener('click', togglePanels);
      });
      document.querySelectorAll(SELECTORS.swatch).forEach((swatch) => {
        swatch.addEventListener('click', (event) => {
          event.preventDefault();
          applyColor(swatch.dataset.color);
        });
      });
    },
  };
})((window.Portfolio = window.Portfolio || {}));
