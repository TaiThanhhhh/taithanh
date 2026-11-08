/**
 * @file Swarm mode controller: on/off switch, input wiring, interaction dispatching, and animation loop.
 *
 * When on, a flock of cursors (swarm-flock.js) flies around the pointer and
 * builds the page as it scrolls into view (swarm-builder.js). Each section is
 * rebuilt when you navigate to it.
 *
 * The mode responds to pointer movement, clicks, presses/holds, hovering over
 * interactive targets, leaving/entering the viewport, and idle states.
 * Unavailable on touch-only devices and when reduced motion is preferred. Esc turns off.
 */
(function (Portfolio) {
  'use strict';

  const TOGGLE_SELECTOR = '[data-swarm-toggle]';
  const INTERACTIVE_SELECTOR =
    'a, button, input, textarea, select, [role="button"], .menubar, .navigation-close, .swarm-switch, .settings, .color-changer, .work-panel, .service, [data-interactive]';
  const FRAME_MS = 1000 / 60;

  const state = {
    enabled: false,
    paused: false,
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
    // Elapsed time in 60fps frames. Clamp at 0 to avoid negative delta.
    const k = Math.min(Math.max((now - state.lastTime) / FRAME_MS, 0), 3);
    state.lastTime = now;
    state.flock.update(k, now);
    state.builder.update(now);
    state.flock.render(k, now);
    state.rafId = window.requestAnimationFrame(frame);
  }

  function startLoop() {
    if (state.rafId || !state.enabled || state.paused) return;
    state.lastTime = performance.now();
    state.rafId = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    window.cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }

  /* ---------- Input & Interaction Events ---------- */

  function onPointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.flock?.setPointer(event.clientX, event.clientY, performance.now());
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    state.flock?.setPointerDown(true);
    state.flock?.scatter(event.clientX, event.clientY);
  }

  function onPointerUp() {
    state.flock?.setPointerDown(false);
  }

  function onPointerOver(event) {
    const target = event.target?.closest?.(INTERACTIVE_SELECTOR);
    if (!target) return;
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    state.flock?.setHoverTarget({
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      width: r.width,
      height: r.height,
    });
  }

  function onPointerOut(event) {
    const target = event.target?.closest?.(INTERACTIVE_SELECTOR);
    if (target && !target.contains(event.relatedTarget)) {
      state.flock?.setHoverTarget(null);
    }
  }

  function onPointerLeave() {
    state.flock?.setPointerInside(false);
  }

  function onPointerEnter() {
    state.flock?.setPointerInside(true);
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
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('pointerout', onPointerOut, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.documentElement.addEventListener('pointerenter', onPointerEnter);
    window.addEventListener('resize', onResize);
    document.addEventListener('portfolio:navigate', onNavigate);

    startLoop();
    window.requestAnimationFrame(() => state.layer?.classList.add('is-visible'));
  }

  function disable() {
    stopLoop();
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('pointerover', onPointerOver);
    document.removeEventListener('pointerout', onPointerOut);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    document.documentElement.removeEventListener('pointerenter', onPointerEnter);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('portfolio:navigate', onNavigate);

    state.builder?.revealAll();
    state.flock?.destroy();

    const layer = state.layer;
    state.layer = null;
    state.flock = null;
    state.builder = null;
    if (layer) {
      layer.classList.remove('is-visible');
      layer.addEventListener('transitionend', () => layer.remove(), { once: true });
      setTimeout(() => layer.remove(), 600);
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

    /** Freezes the loop without turning the mode off (e.g. while ambient mode covers the page). */
    setPaused(paused) {
      state.paused = paused;
      if (paused) stopLoop();
      else startLoop();
    },

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
