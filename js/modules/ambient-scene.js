/**
 * @file Ambient scene: the cursor swarm over Saigon, through a whole day.
 *
 * Layers, back to front: sky with the city's glow, stars, moon and sun, clouds, the
 * light thrown on them by bursts and lightning, surprise events (ambient-events*.js),
 * the cursor murmuration (ambient-murmuration.js), the skyline with its window lights
 * (ambient-sky.js), the Saigon river and its reflections (ambient-river.js), events in
 * front of the city (rain, fog, Landmark 81's LED show), bloom, and a quiet
 * typographic clock. Under it, a caption names the surprise going on (like the
 * location captions of a TV screensaver).
 *
 * The day (ambient-cycle.js) runs on its own clock, compressed into
 * `config.ambient.cycleMinutes`; its look is applied about once a second. The date
 * is real (ambient-calendar.js): tonight's moon, the season, the occasion, and the
 * city's live shows (when Saigon fires its fireworks, the scene turns to night for them).
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
  /** The city's lights are repainted as soon as the blackout wave has moved this much. */
  const BLACKOUT_STEP = 0.012;

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
      this.calendar = Portfolio.ambientCalendar;

      this.cycle = new Portfolio.AmbientCycle(config, options);
      this.sky = new Portfolio.AmbientSky(root);
      this.birdsCanvas = document.createElement('canvas');
      this.birdsCanvas.className = 'ambient__birds';
      this.sky.birdsSlot.replaceWith(this.birdsCanvas); // behind the skyline
      this.flock = new Portfolio.Murmuration(this.birdsCanvas, config.cursors, config.frameBudgetMs);
      const { labels, colors } = Portfolio.config.swarm;
      this.flock.setLeaders(labels, colors);
      this.events = new Portfolio.AmbientEvents(this.sky, config, options);
      this.events.onBegin = (def, tier, caption) => {
        if (tier === 'major' && config.captions && (caption || def.label)) this.showCaption(def, caption);
      };

      this.vignette = document.createElement('div');
      this.vignette.className = 'ambient__vignette';
      this.hud = document.createElement('div');
      this.hud.className = 'ambient__hud';
      this.hud.innerHTML =
        '<div class="ambient__time"></div><div class="ambient__date"></div>' +
        '<div class="ambient__caption"><span class="ambient__caption-place"></span>' +
        '<span class="ambient__caption-title"></span></div>';
      root.append(this.vignette, this.hud);
      this.timeEl = this.hud.querySelector('.ambient__time');
      this.dateEl = this.hud.querySelector('.ambient__date');
      this.captionEl = this.hud.querySelector('.ambient__caption');
      this.placeEl = this.hud.querySelector('.ambient__caption-place');
      this.titleEl = this.hud.querySelector('.ambient__caption-title');
      this.captionUntil = 0;
      this.lastHud = -Infinity;
      this.look = null;
      this.lastLook = -Infinity;
      this.cal = null;
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
      this.cal = this.calendar ? this.calendar.getState() : null;
      if (this.cal) {
        this.sky.setMoon(this.cal.moon);
        this.cycle.setMoon(this.cal.moon);
      }
      this.cycle.start(now);
      this.refreshLook(now, true);
      this.flock.reset(now, origin);
      this.events.reset(now, this.look, this.cal);
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

    /**
     * Names the event going on, under the clock: a small line for where / when it is,
     * then its name; rare ones say so.
     */
    showCaption(def, caption) {
      const text = caption || { title: def.label, place: def.place };
      this.placeEl.textContent = text.place || '';
      this.titleEl.textContent = text.title;
      if (def.rarity === 'rare') {
        const tag = document.createElement('span');
        tag.className = 'ambient__rare';
        tag.textContent = 'hiếm gặp';
        this.titleEl.append(tag);
      }
      this.captionEl.classList.add('is-shown');
      this.captionUntil = performance.now() + (text.ms || CAPTION_MS);
    }

    hideCaption() {
      this.captionEl.classList.remove('is-shown');
      this.captionUntil = 0;
    }

    /** The city's own schedule: during a live show the day holds at night. */
    followCity(now) {
      if (!this.calendar) return;
      this.cal = this.calendar.getState();
      const live = this.cal.live;
      if (live && !this.cycle.holding) this.cycle.holdNight(now, this.look);
      else if (!live && this.cycle.holding) this.cycle.release(now);
    }

    /** How much of the city has switched its lights off (Earth Hour), as the events say. */
    get blackout() {
      const city = this.events.stage && this.events.stage.city;
      return city ? city.blackout : 0;
    }

    refreshLook(now, force = false) {
      this.followCity(now);
      const look = this.cycle.look(now);
      const b = this.blackout;
      look.blackout = b; // the windows go dark building by building (ambient-sky.js)
      if (b > 0) {
        // Less light thrown up into the haze: the city's glow fades and more stars show.
        look.glow = [...look.glow.slice(0, 3), look.glow[3] * (1 - 0.7 * b)];
        look.haze = [...look.haze.slice(0, 3), look.haze[3] * (1 - 0.45 * b)];
        look.stars = Math.min(1, look.stars * (1 + 0.6 * b));
      }
      this.look = look;
      this.sky.apply(look, force);
      this.flock.setInk(look.birds, look.birdGlow);
      this.lastLook = now;
    }

    updateHud(now) {
      // The visitor's clock; the simulated Saigon one when the test lab has moved the date.
      const date = this.calendar && this.calendar.override.offset ? this.calendar.now() : new Date();
      this.timeEl.textContent = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      const day = date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
      // The lunar date matters here (Rằm, mùng 1, Tết): shown next to the solar one.
      const lunar = this.cal && this.cal.lunar;
      this.dateEl.textContent = lunar ? `${day} · ${lunar.day}/${lunar.month} âm lịch` : day;
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
      this.events.step(now, k, this.look, this.cal);
      // The blackout wave moves faster than the once-a-second look: follow it closely.
      const b = this.blackout;
      if (Math.abs(b - (this.look.blackout || 0)) > BLACKOUT_STEP || (b === 0 && this.look.blackout > 0))
        this.refreshLook(now);
      this.flock.step(now, k);
    }

    render(now) {
      this.events.render(now);
      this.sky.river.frame(now, this.events.mirrors());
      this.flock.render(now);
    }
  }

  Portfolio.AmbientScene = AmbientScene;
})((window.Portfolio = window.Portfolio || {}));
