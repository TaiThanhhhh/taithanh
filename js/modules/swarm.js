/**
 * @file Swarm mode controller: on/off switch, input wiring and the animation loop.
 *
 * When on, a flock of cursors (swarm-flock.js) flies around the pointer and
 * builds the page as it scrolls into view (swarm-builder.js). Each section is
 * rebuilt when you navigate to it.
 *
 * The mode is unavailable on touch-only devices and when the user prefers
 * reduced motion. Esc turns it off from anywhere.
 */
(function (Portfolio) {
  'use strict';

  const TOGGLE_SELECTOR = '[data-swarm-toggle]';
  const FRAME_MS = 1000 / 60;

  const state = {
    enabled: false,
    layer: null,
    flock: null,
    builder: null,
    rafId: 0,
    lastTime: 0,
    pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  };

  /* ---------- Environment ---------- */

  function isSupported() {
    if (typeof window.matchMedia !== 'function') return false;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return finePointer && !reducedMotion;
  }

  function readPreference() {
    try {
      const stored = window.localStorage.getItem(Portfolio.config.swarm.storageKey);
      return stored ? stored === 'on' : Portfolio.config.swarm.defaultOn;
    } catch {
      return Portfolio.config.swarm.defaultOn;
    }
  }

  function writePreference(on) {
    try {
      window.localStorage.setItem(Portfolio.config.swarm.storageKey, on ? 'on' : 'off');
    } catch {
      /* Storage unavailable (private mode etc.): the mode just won't persist. */
    }
  }

  /* ---------- Loop ---------- */

  function frame(now) {
    const k = Math.min((now - state.lastTime) / FRAME_MS, 3); // frame-rate independent
    state.lastTime = now;
    state.flock.update(k, now);
    state.builder.update(now);
    state.flock.render();
    state.rafId = window.requestAnimationFrame(frame);
  }

  function startLoop() {
    if (state.rafId || !state.enabled) return;
    state.lastTime = performance.now();
    state.rafId = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    window.cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }

  /* ---------- Input ---------- */

  function onPointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.flock?.setPointer(event.clientX, event.clientY, performance.now());
  }

  function onPointerDown(event) {
    state.flock?.scatter(event.clientX, event.clientY);
  }

  function onResize() {
    state.flock?.resize();
  }

  function onNavigate(event) {
    state.builder?.markPending(document.getElementById(event.detail.sectionId));
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && state.enabled) setEnabled(false);
  }

  function onVisibilityChange() {
    if (document.hidden) stopLoop();
    else startLoop();
  }

  /* ---------- Lifecycle ---------- */

  function enable() {
    const config = Portfolio.config.swarm;
    state.layer = document.createElement('div');
    state.layer.className = 'swarm-layer';
    state.layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(state.layer);

    state.flock = new Portfolio.SwarmFlock(state.layer, config, state.pointer);
    state.builder = new Portfolio.SwarmBuilder(state.flock, state.layer, config);
    state.builder.markPending(document);

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);
    document.addEventListener('portfolio:navigate', onNavigate);
    startLoop();
    window.requestAnimationFrame(() => state.layer?.classList.add('is-visible'));
  }

  function disable() {
    stopLoop();
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('portfolio:navigate', onNavigate);

    state.builder?.revealAll();
    const layer = state.layer;
    state.layer = null;
    state.flock = null;
    state.builder = null;
    if (layer) {
      layer.classList.remove('is-visible');
      layer.addEventListener('transitionend', () => layer.remove(), { once: true });
      setTimeout(() => layer.remove(), 600); // fallback if no transition runs
    }
  }

  function syncToggles() {
    document.querySelectorAll(TOGGLE_SELECTOR).forEach((toggle) => {
      toggle.setAttribute('aria-pressed', String(state.enabled));
    });
  }

  /**
   * Turns swarm mode on or off and remembers the choice.
   * @param {boolean} on
   */
  function setEnabled(on) {
    if (on === state.enabled || (on && !isSupported())) return;
    state.enabled = on;
    if (on) enable();
    else disable();
    writePreference(on);
    syncToggles();
  }

  Portfolio.swarm = {
    setEnabled,

    get enabled() {
      return state.enabled;
    },

    init() {
      const toggles = document.querySelectorAll(TOGGLE_SELECTOR);
      if (!isSupported()) {
        toggles.forEach((toggle) => {
          toggle.hidden = true;
        });
        return;
      }

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('visibilitychange', onVisibilityChange);
      toggles.forEach((toggle) => {
        toggle.addEventListener('click', (event) => {
          event.preventDefault();
          setEnabled(!state.enabled);
        });
      });

      setEnabled(readPreference());
      syncToggles();
    },
  };
})((window.Portfolio = window.Portfolio || {}));
