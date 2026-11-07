/**
 * @file Settings panel: one slide-out panel (gear tab) with every visual setting.
 *
 * Rendered once into `[data-component="settings"]`, outside the page sections,
 * so it is available on every page. Groups:
 *  - Colors     : accent palettes (handled by color-switcher.js)
 *  - Background : particle presets for the home page (handled by theme-switcher.js)
 *
 * Closes on Esc and on a click outside the panel.
 */
(function (Portfolio) {
  'use strict';

  const MOUNT_SELECTOR = '[data-component="settings"]';
  const OPEN_CLASS = 'color-changer-active';

  /** Background presets shown in the panel; `className` keeps the original button shades. */
  const BACKGROUNDS = [
    { key: 'particles', label: 'Particles', className: 'theme-clean' },
    { key: 'clean', label: 'Clean', className: 'theme-particles' },
    { key: 'snow', label: 'Snow', className: 'theme-snow' },
    { key: 'dust', label: 'Dust', className: 'theme-dust' },
  ];

  function template() {
    const swatches = Portfolio.config.colorThemes
      .map((theme) => `<li><a href="#0" class="${theme}" title="${theme}" data-color="${theme}"></a></li>`)
      .join('');
    const backgrounds = BACKGROUNDS.map(
      ({ key, label, className }) =>
        `<li><a href="#0" class="${className}" title="${label}" data-theme="${key}">${label}</a></li>`,
    ).join('');

    return `
      <button type="button" class="color-panel settings__tab" aria-label="Settings" aria-expanded="false">
        <img src="images/gear.png" alt="">
      </button>
      <div class="color-selector settings__body">
        <div class="heading">Colors</div>
        <div class="colors"><ul>${swatches}</ul></div>
        <div class="heading settings__heading">Background</div>
        <div class="themes"><ul>${backgrounds}</ul></div>
      </div>`;
  }

  function setOpen(root, open) {
    root.classList.toggle(OPEN_CLASS, open);
    root.querySelector('.settings__tab')?.setAttribute('aria-expanded', String(open));
  }

  Portfolio.settings = {
    /** Must run before modules that bind to the panel's controls. */
    render() {
      const root = document.querySelector(MOUNT_SELECTOR);
      if (root) root.innerHTML = template();
    },

    init() {
      const root = document.querySelector(MOUNT_SELECTOR);
      if (!root) return;

      root.querySelector('.settings__tab').addEventListener('click', (event) => {
        event.preventDefault();
        setOpen(root, !root.classList.contains(OPEN_CLASS));
      });
      document.addEventListener('click', (event) => {
        if (!root.contains(event.target)) setOpen(root, false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !root.classList.contains(OPEN_CLASS)) return;
        setOpen(root, false);
        // Esc closes the panel only; other Esc shortcuts (e.g. swarm off) wait for the next press.
        event.stopImmediatePropagation();
      });
    },
  };
})((window.Portfolio = window.Portfolio || {}));
