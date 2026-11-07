/**
 * @file Intro loader: slides the splash screen away once all assets have loaded.
 */
(function (Portfolio) {
  'use strict';

  const SELECTORS = {
    loader: '#loader',
    home: '#header',
    navigation: '#navigation-content',
  };

  function hideLoader() {
    const delay = Portfolio.config.timings.loaderExit;

    gsap.to(SELECTORS.loader, { duration: delay, y: '-100%', opacity: 0 });
    gsap.set(SELECTORS.loader, { display: 'none', delay });
    gsap.set(SELECTORS.home, { display: 'block', delay });
    gsap.set(SELECTORS.navigation, { display: 'none' });
    gsap.set(SELECTORS.navigation, { display: 'flex', delay });
  }

  Portfolio.loader = {
    init() {
      if (document.readyState === 'complete') {
        hideLoader();
      } else {
        window.addEventListener('load', hideLoader, { once: true });
      }
    },
  };
})((window.Portfolio = window.Portfolio || {}));
