/**
 * @file Typewriter effect for elements marked with `.txt-rotate`.
 *
 * Markup contract:
 *   <span class="txt-rotate" data-rotate='["One", "Two"]' data-period="1200"></span>
 */
(function (Portfolio) {
  'use strict';

  const DEFAULT_PERIOD_MS = 2000;
  const TYPE_BASE_MS = 200;
  const TYPE_JITTER_MS = 100;
  const NEXT_WORD_DELAY_MS = 100;

  class Typewriter {
    /**
     * @param {HTMLElement} element
     * @param {string[]} words
     * @param {number} periodMs Pause after a word is fully typed.
     */
    constructor(element, words, periodMs) {
      this.element = element;
      this.words = words;
      this.periodMs = periodMs || DEFAULT_PERIOD_MS;
      this.wordIndex = 0;
      this.text = '';
      this.isDeleting = false;
    }

    start() {
      this.tick();
    }

    tick() {
      const fullText = this.words[this.wordIndex % this.words.length];
      const nextLength = this.text.length + (this.isDeleting ? -1 : 1);
      this.text = fullText.substring(0, nextLength);

      const wrap = document.createElement('span');
      wrap.className = 'wrap';
      wrap.textContent = this.text;
      this.element.replaceChildren(wrap);

      let delay = TYPE_BASE_MS - Math.random() * TYPE_JITTER_MS;
      if (this.isDeleting) delay /= 2;

      if (!this.isDeleting && this.text === fullText) {
        delay = this.periodMs;
        this.isDeleting = true;
      } else if (this.isDeleting && this.text === '') {
        this.isDeleting = false;
        this.wordIndex += 1;
        delay = NEXT_WORD_DELAY_MS;
      }

      setTimeout(() => this.tick(), delay);
    }
  }

  function startAll() {
    document.querySelectorAll('.txt-rotate').forEach((element) => {
      const raw = element.getAttribute('data-rotate');
      if (!raw) return;

      try {
        const words = JSON.parse(raw);
        const period = parseInt(element.getAttribute('data-period'), 10);
        new Typewriter(element, words, period).start();
      } catch (error) {
        console.error('[typewriter] Invalid data-rotate JSON on', element, error);
      }
    });
  }

  Portfolio.typewriter = {
    init() {
      if (document.readyState === 'complete') {
        startAll();
      } else {
        window.addEventListener('load', startAll, { once: true });
      }
    },
  };
})((window.Portfolio = window.Portfolio || {}));
