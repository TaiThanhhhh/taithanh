/**
 * @file Application entry point. Boots every feature module in order.
 */
(function (Portfolio) {
  'use strict';

  function bootstrap() {
    // Render dynamic markup first so later modules can bind to it.
    Portfolio.colorSwitcher.render();

    Portfolio.loader.init();
    Portfolio.themeSwitcher.init();
    Portfolio.colorSwitcher.init();
    Portfolio.navigation.init();
    Portfolio.typewriter.init();
    Portfolio.cursor.init();
    Portfolio.contactForm.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})((window.Portfolio = window.Portfolio || {}));
