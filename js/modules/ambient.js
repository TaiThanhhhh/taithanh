/**
 * @file Ambient mode controller: turns an idle home page into a living background.
 *
 * - Starts after `config.ambient.idleMs` without input while the home page is
 *   shown (sooner when the page is opened with `?ambient`, e.g. on a second monitor).
 * - Enter: the home page recedes (blur + slight zoom out) while the scene (a day
 *   over Saigon, ambient-scene.js) fades in and the pointer bursts into the cursor swarm. Once the scene is
 *   opaque, the page underneath is hidden so the browser stops painting it.
 * - Exit (any real input): the swarm rushes back into the pointer while the page
 *   comes back into focus. The waking click/key never reaches the page.
 * - Runs at `maxFps` (60) even when the window is not focused (the scene is a
 *   background for a second monitor). With `ecoWhenUnfocused: true` it drops to
 *   30 fps and fewer cursors while you are in a game or another app.
 * - Disabled when the user prefers reduced motion.
 */
(function (Portfolio) {
  'use strict';

  /** Keep in sync with the transitions in css/ambient.css. */
  const ENTER_MS = 1500;
  const EXIT_MS = 900;
  const ECO_FPS = 30;

  const state = {
    config: null,
    options: null,
    root: null,
    scene: null,
    active: false, // scene shown (or entering)
    exiting: false, // swarm collapsing back into the pointer
    locked: false, // when true, moving pointer or clicking does not wake
    idleMs: 0,
    idleTimer: 0,
    rafId: 0,
    lastTime: 0,
    pacers: null,
    eco: false,
    wakeFrom: null,
    hideTimer: 0,
    settleTimer: 0,
    pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  };

  const html = document.documentElement;

  function homeVisible() {
    const home = document.getElementById(Portfolio.config.sections.home);
    return !!home && getComputedStyle(home).display !== 'none';
  }

  function settingsOpen() {
    return !!document.querySelector('.settings.color-changer-active');
  }

  /* ---------- Loop ---------- */

  function frame(now) {
    state.rafId = window.requestAnimationFrame(frame);
    const shouldRun = state.eco ? state.pacers.eco : state.pacers.full;
    if (!shouldRun(now)) return;
    const k = Math.min(Math.max((now - state.lastTime) / Portfolio.motion.FRAME_MS, 0), 3);
    state.lastTime = now;
    state.scene.step(now, k);
    state.scene.render(now);
  }

  function startLoop() {
    if (state.rafId || !(state.active || state.exiting) || document.hidden) return;
    state.lastTime = performance.now();
    state.rafId = window.requestAnimationFrame(frame);
  }

  function stopLoop() {
    window.cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }

  /** Eco (30 fps, fewer cursors) when the window loses focus: only if `ecoWhenUnfocused`. */
  function setEco(eco) {
    const on = eco && !!state.config.ecoWhenUnfocused;
    state.eco = on;
    state.scene?.setEco(on);
  }

  /* ---------- Enter / exit ---------- */

  function enter() {
    if (state.active) return;
    clearTimeout(state.hideTimer);
    clearTimeout(state.settleTimer);
    state.active = true;
    state.exiting = false;

    state.root.hidden = false;
    state.scene = state.scene || new Portfolio.AmbientScene(state.root, state.config, state.options);
    state.scene.resize();
    state.scene.reset(performance.now(), state.pointer); // the pointer bursts into the swarm
    setEco(!document.hasFocus());

    Portfolio.themeSwitcher.pause();
    Portfolio.swarm.setPaused?.(true);
    // Next frame, so the transitions start from the current state.
    window.requestAnimationFrame(() => {
      html.classList.add('is-ambient');
      state.root.classList.add('is-active');
    });
    // Once the scene is opaque, stop painting the page underneath.
    state.settleTimer = setTimeout(() => html.classList.add('is-ambient-settled'), ENTER_MS);
    startLoop();
  }

  function exit() {
    if (!state.active) return;
    clearTimeout(state.settleTimer);
    state.active = false;
    state.exiting = true;

    html.classList.remove('is-ambient-settled'); // page painted again (still blurred)
    state.scene.beginExit(state.pointer); // the swarm rushes back into the pointer
    window.requestAnimationFrame(() => {
      html.classList.remove('is-ambient');
      state.root.classList.remove('is-active');
    });
    Portfolio.themeSwitcher.resume();
    Portfolio.swarm.setPaused?.(false);

    state.hideTimer = setTimeout(() => {
      state.exiting = false;
      stopLoop();
      state.scene.sleep();
      state.root.hidden = true;
    }, EXIT_MS);
  }

  /* ---------- Idle detection ---------- */

  function scheduleIdle() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(tryEnter, state.idleMs);
  }

  function tryEnter() {
    if (!homeVisible() || settingsOpen() || document.hidden) {
      scheduleIdle();
      return;
    }
    state.wakeFrom = null;
    enter();
  }

  function isTesterElement(target) {
    return !!target?.closest?.('.dev-tester-panel, .dev-tester-pill');
  }

  function onPointerMove(event) {
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    if (isTesterElement(event.target)) return;

    if (state.active) {
      if (state.locked) return;
      // Ignore sensor jitter: only a real movement wakes the page.
      if (!state.wakeFrom) state.wakeFrom = { x: event.clientX, y: event.clientY };
      const moved = Math.hypot(event.clientX - state.wakeFrom.x, event.clientY - state.wakeFrom.y);
      if (moved < state.config.wakeDistance) return;
      exit();
    }
    scheduleIdle();
  }

  function onInput(event) {
    if (isTesterElement(event.target)) return;

    if (state.active) {
      if (state.locked) {
        if (event.type === 'keydown' && event.key === 'Escape') {
          exit();
        }
        return;
      }
      // The input that wakes the page must not also act on the page: a click must
      // not open a link underneath, a key (e.g. Esc) must not trigger a shortcut.
      if (event.cancelable && event.type !== 'wheel' && event.type !== 'touchstart') event.preventDefault();
      event.stopPropagation();
      exit();
    }
    scheduleIdle();
  }

  function onVisibilityChange() {
    if (document.hidden) stopLoop();
    else startLoop();
  }

  Portfolio.ambient = {
    get active() {
      return state.active;
    },

    get locked() {
      return state.locked;
    },

    set locked(val) {
      state.locked = !!val;
    },

    setLocked(val) {
      state.locked = !!val;
    },

    enter,
    exit,

    /** Names of the surprise events, for `trigger`. */
    get events() {
      return Portfolio.AmbientEvents.names;
    },

    /**
     * Plays a surprise event now, entering ambient mode if needed (from the console:
     * `Portfolio.ambient.trigger('fireworks')`).
     * @param {string} name
     */
    trigger(name) {
      if (!state.config) return false;
      state.locked = true; // Keep ambient active during testing so pointer movement doesn't instantly dismiss it
      enter();
      return state.scene.trigger(name);
    },

    init() {
      if (typeof window.matchMedia !== 'function') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      state.config = Portfolio.config.ambient;
      state.pacers = {
        full: Portfolio.motion.createPacer(state.config.maxFps),
        eco: Portfolio.motion.createPacer(ECO_FPS),
      };
      const params = new URLSearchParams(window.location.search);
      state.idleMs = params.has('ambient') ? state.config.idleMsWhenRequested : state.config.idleMs;
      state.locked = params.has('locked') || params.has('pin') || params.has('test') || params.has('debug');
      // To try things out: ?ambient&speed=40 (a day in a minute), &at=night, &event=fireworks.
      state.options = {
        speed: params.has('speed') ? Math.max(Number(params.get('speed')) || 1, 0.01) : undefined,
        at: Portfolio.AmbientCycle.phaseOf(params.get('at')),
        event: params.get('event'),
      };

      state.root = document.createElement('div');
      state.root.className = 'ambient';
      state.root.hidden = true;
      state.root.setAttribute('aria-hidden', 'true');
      document.body.appendChild(state.root);

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      // Capture phase on window: runs before any other handler, so a waking key is swallowed.
      window.addEventListener('keydown', onInput, true);
      ['wheel', 'touchstart'].forEach((type) =>
        window.addEventListener(type, onInput, { capture: true, passive: true }),
      );
      // Capture phase, so the waking click is swallowed before it reaches a link.
      state.root.addEventListener('pointerdown', onInput, true);
      state.root.addEventListener('click', onInput, true);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('focus', () => setEco(false));
      window.addEventListener('blur', () => setEco(true));
      window.addEventListener('resize', () => state.scene?.resize());

      scheduleIdle();
    },
  };
})((window.Portfolio = window.Portfolio || {}));
