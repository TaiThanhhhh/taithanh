/**
 * @file Fullscreen menu and section routing.
 *
 * Every section lives in the same document; switching "pages" plays the
 * breaker wipe animation while swapping which section is displayed.
 */
(function (Portfolio) {
  'use strict';

  const SELECTORS = {
    menu: '#navigation-content',
    openButton: '.menubar',
    closeButton: '.navigation-close',
    breakers: ['#breaker', '#breaker-two'],
    links: '[data-section]',
  };

  function openMenu() {
    gsap.to(SELECTORS.menu, { duration: Portfolio.config.timings.menuSlide, y: 0 });
  }

  function closeMenu() {
    gsap.to(SELECTORS.menu, { duration: Portfolio.config.timings.menuSlide, y: '-100%' });
  }

  function playBreaker() {
    const { breakerStagger, breakerDuration } = Portfolio.config.timings;

    SELECTORS.breakers.forEach((selector, index) => {
      gsap.set(selector, { display: 'block', delay: index * breakerStagger });
      gsap.set(selector, { display: 'none', delay: breakerDuration });
    });
  }

  /**
   * Shows the section mapped to `sectionKey` and hides every other section.
   * @param {string} sectionKey Key of `Portfolio.config.sections`.
   */
  function navigateTo(sectionKey) {
    const { sections, timings } = Portfolio.config;
    const targetId = sections[sectionKey];
    if (!targetId) return;

    // Hide the menu behind the wipe, then bring it back once the wipe ends.
    gsap.set(SELECTORS.menu, { display: 'none', y: '-100%', delay: timings.pageSwap });
    gsap.set(SELECTORS.menu, { display: 'flex', delay: timings.breakerDuration });

    Object.values(sections)
      .filter((id) => id !== targetId)
      .forEach((id) => gsap.set(`#${id}`, { display: 'none' }));

    playBreaker();
    gsap.set(`#${targetId}`, { display: 'block', delay: timings.pageSwap });

    // Lets other features (e.g. swarm mode) react to the page change.
    document.dispatchEvent(new CustomEvent('portfolio:navigate', { detail: { sectionId: targetId } }));
  }

  Portfolio.navigation = {
    navigateTo,

    init() {
      document.querySelector(SELECTORS.openButton)?.addEventListener('click', openMenu);
      document.querySelector(SELECTORS.closeButton)?.addEventListener('click', closeMenu);

      // Default anchor behaviour (href="#") is intentionally kept: it scrolls
      // the viewport back to the top when switching sections.
      document.querySelectorAll(SELECTORS.links).forEach((link) => {
        link.addEventListener('click', () => navigateTo(link.dataset.section));
      });
    },
  };
})((window.Portfolio = window.Portfolio || {}));
