/**
 * @file Ambient scene: the cursor swarm over Saigon, through a whole day.
 *
 * Layers, back to front: sky with the city's glow, stars, moon and sun, clouds,
 * surprise events (ambient-events*.js), the cursor murmuration
 * (ambient-murmuration.js), the skyline with its window lights (ambient-sky.js),
 * events in front of the city (rain, fog, Landmark 81's LED show), and a quiet
 * typographic clock. Under it, a caption names the surprise going on (like the
 * location captions of a TV screensaver).
 *
 * The day (ambient-cycle.js) runs on its own clock, compressed into
 * `config.ambient.cycleMinutes`; its look is applied about once a second.
 *
 * Transitions: entering, the pointer bursts into the swarm; leaving, the swarm
 * rushes back into the pointer (driven by ambient.js).
 */
(function (Portfolio) {
  'use strict';

  const HUD_REFRESH_MS = 1000;
  const CAPTION_MS = 8000;
  /** How often the day's look is re-applied: colours move too slowly to need more. */
  const LOOK_REFRESH_MS = 1000;
  /** The clock drifts a few pixels over minutes so no glyph stays on the same pixels (OLED). */
  const DRIFT_PERIOD_MS = 37 * 60000;

  const pad = (n) => String(n).padStart(2, '0');

  class AmbientScene {
    /**
     * @param {HTMLElement} root Overlay element that hosts the scene.
     * @param {object} config `Portfolio.config.ambient`.
     * @param {{speed?: number, at?: number, event?: string}} [options] Overrides to try things out.
     */
    constructor(root, config, options = {}) {
      this.root = root;
      this.config = config;

      this.cycle = new Portfolio.AmbientCycle(config, options);
      this.sky = new Portfolio.AmbientSky(root);
      this.birdsCanvas = document.createElement('canvas');
      this.birdsCanvas.className = 'ambient__birds';
      this.sky.birdsSlot.replaceWith(this.birdsCanvas); // behind the skyline
      this.flock = new Portfolio.Murmuration(this.birdsCanvas, config.cursors, config.frameBudgetMs);
      const { labels, colors } = Portfolio.config.swarm;
      this.flock.setLeaders(labels, colors);
      this.events = new Portfolio.AmbientEvents(this.sky.fxBack, this.sky.fxFront, config, options);
      this.events.onBegin = (def, tier) => {
        if (tier === 'major' && config.captions && def.label) this.showCaption(def);
      };

      this.vignette = document.createElement('div');
      this.vignette.className = 'ambient__vignette';
      this.hud = document.createElement('div');
      this.hud.className = 'ambient__hud';
      this.hud.innerHTML =
        '<div class="ambient__time"></div><div class="ambient__date"></div><div class="ambient__caption"></div>';
      root.append(this.vignette, this.hud);
      this.timeEl = this.hud.querySelector('.ambient__time');
      this.dateEl = this.hud.querySelector('.ambient__date');
      this.captionEl = this.hud.querySelector('.ambient__caption');
      this.captionUntil = 0;
      this.lastHud = -Infinity;
      this.look = null;
      this.lastLook = -Infinity;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.sky.resize();
      this.flock.resize(window.innerWidth, window.innerHeight, dpr);
      const stage = this.sky.stage();
      // Fireworks and thunder make the flock flinch.
      stage.startle = (x, y, radius) => this.flock.startle(x, y, radius, performance.now());
      this.events.resize(stage);
    }

    /** @param {{x: number, y: number}} origin Where the pointer was: the swarm bursts out of it. */
    reset(now, origin) {
      this.cycle.start(now);
      this.sky.newMoon();
      this.refreshLook(now, true);
      this.flock.reset(now, origin);
      this.events.reset(now, this.look);
      this.hideCaption();
      this.updateHud(now);
    }

    /** @param {{x: number, y: number}} point The swarm collapses back into the pointer. */
    beginExit(point) {
      this.cycle.stop(performance.now());
      this.flock.gather(point);
    }

    /** The scene is hidden: let go of what holds memory (event canvases). */
    sleep() {
      this.events.stop();
    }

    setEco(eco) {
      this.flock.setEco(eco);
    }

    /** Plays a surprise event now (see `Portfolio.ambient.events`). */
    trigger(name) {
      return this.events.trigger(name, performance.now());
    }

    /** Names the event going on, under the clock; rare ones say so. */
    showCaption(def) {
      this.captionEl.textContent = def.label;
      if (def.rarity === 'rare') {
        const tag = document.createElement('span');
        tag.className = 'ambient__rare';
        tag.textContent = 'hiếm gặp';
        this.captionEl.append(tag);
      }
      this.captionEl.classList.add('is-shown');
      this.captionUntil = performance.now() + CAPTION_MS;
    }

    hideCaption() {
      this.captionEl.classList.remove('is-shown');
      this.captionUntil = 0;
    }

    refreshLook(now, force = false) {
      this.look = this.cycle.look(now);
      this.sky.apply(this.look, force);
      this.flock.setInk(this.look.birds, this.look.birdGlow);
      this.lastLook = now;
    }

    updateHud(now) {
      const date = new Date();
      this.timeEl.textContent = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      this.dateEl.textContent = date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      // Imperceptible drift (a few px per minute) so the clock never burns into an OLED.
      const a = ((Date.now() % DRIFT_PERIOD_MS) / DRIFT_PERIOD_MS) * Math.PI * 2;
      this.hud.style.transform = `translate3d(${(Math.sin(a) * 2.2).toFixed(2)}vw, ${(Math.sin(a * 2) * -1.4).toFixed(2)}vh, 0)`;
      this.lastHud = now;
    }

    step(now, k) {
      if (now - this.lastLook > LOOK_REFRESH_MS) this.refreshLook(now);
      if (now - this.lastHud > HUD_REFRESH_MS) this.updateHud(now);
      if (this.captionUntil && now > this.captionUntil) this.hideCaption();
      this.sky.tick(now);
      this.events.step(now, k, this.look);
      this.flock.step(now, k);
    }

    render(now) {
      this.events.render();
      this.flock.render(now);
    }
  }

  Portfolio.AmbientScene = AmbientScene;
})((window.Portfolio = window.Portfolio || {}));
