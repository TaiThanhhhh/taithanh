/**
 * @file Ambient sky: Saigon through a whole day, the stage for the cursor murmuration.
 *
 * Made for a second monitor at work or while gaming: sky with the glow the city
 * throws on its haze, stars, sun and moon, clouds, a skyline (Landmark 81,
 * Bitexco) with window lights, and a plane crossing now and then. Every colour
 * comes from the current look of the day (ambient-cycle.js), applied about once
 * a second by the scene.
 *
 * Cost: shapes (stars, cloud masks, skyline) are painted on resize. A new look
 * only sets CSS custom properties and re-tints the clouds / repaints the flat
 * skyline when a colour actually changed (a couple of ms, at most once a
 * second). Movement (clouds, stars, sun, moon, plane) is CSS on the compositor;
 * the window lights are re-rolled every few seconds.
 */
(function (Portfolio) {
  'use strict';

  const { css } = Portfolio.AmbientCycle;
  const LIGHTS_REFRESH_MS = 2500;

  /** Deterministic RNG so the skyline and stars are the same on every visit. */
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ---------- Skyline geometry (relative to width / height) ---------- */

  function buildSkyline(seed) {
    const r = rng(seed);
    const layer = (count, minH, maxH, minW, maxW) => {
      const list = [];
      let x = -0.02;
      while (x < 1.02 && list.length < count) {
        const w = minW + r() * (maxW - minW);
        list.push({ x, w, h: minH + r() ** 1.6 * (maxH - minH), antenna: r() < 0.18, stepped: r() < 0.3 });
        x += w * (0.75 + r() * 0.45);
      }
      // Close slivers between neighbours: by day the bright haze behind them would show as
      // hairlines. Wider gaps stay, they give the skyline depth.
      list.forEach((b, i) => {
        const gap = list[i + 1] ? list[i + 1].x - (b.x + b.w) : 0;
        if (gap > 0 && gap < 0.006) b.w += gap + 0.0005;
      });
      return list;
    };
    return {
      far: layer(140, 0.06, 0.17, 0.012, 0.032),
      near: layer(90, 0.08, 0.24, 0.018, 0.05),
      landmark81: { x: 0.735, w: 0.034, h: 0.5 },
      bitexco: { x: 0.33, w: 0.024, h: 0.32 },
    };
  }

  /**
   * Traces Landmark 81: square tubes stepping in towards a crown and spire.
   * Shared with the LED show event, which clips to it.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} lx Centre x.
   * @param {number} lw Width at the base.
   * @param {number} lh Height.
   * @param {number} base Ground line (y).
   */
  function traceLandmark(ctx, lx, lw, lh, base) {
    const tiers = [
      [0, 1],
      [0.5, 0.86],
      [0.7, 0.7],
      [0.84, 0.52],
      [0.93, 0.3],
    ];
    ctx.beginPath();
    ctx.moveTo(lx - lw / 2, base);
    tiers.forEach(([at, width], i) => {
      const next = tiers[i + 1];
      ctx.lineTo(lx - (lw * width) / 2, base - lh * at);
      ctx.lineTo(lx - (lw * width) / 2, base - lh * (next ? next[0] : 0.97));
    });
    ctx.lineTo(lx - 1, base - lh * 0.97);
    ctx.lineTo(lx, base - lh);
    ctx.lineTo(lx + 1, base - lh * 0.97);
    [...tiers].reverse().forEach(([at, width], i, arr) => {
      const prev = arr[i - 1];
      ctx.lineTo(lx + (lw * width) / 2, base - lh * (prev ? prev[0] : 0.97));
      ctx.lineTo(lx + (lw * width) / 2, base - lh * at);
    });
    ctx.lineTo(lx + lw / 2, base);
    ctx.closePath();
  }

  class AmbientSky {
    constructor(root) {
      this.root = root;
      const el = (cls, tag = 'div', parent = root) => {
        const node = document.createElement(tag);
        node.className = cls;
        parent.appendChild(node);
        return node;
      };
      this.gradient = el('ambient__sky-gradient');
      this.cityGlow = el('ambient__city-glow');
      this.belt = el('ambient__belt'); // Belt of Venus over the Earth's shadow, at dusk and dawn
      this.starfield = el('ambient__starfield'); // fades out by day
      this.stars = el('ambient__stars', 'canvas', this.starfield);
      this.twinkle = el('ambient__stars ambient__stars--twinkle', 'canvas', this.starfield);
      this.moon = el('ambient__moon', 'canvas');
      this.sun = el('ambient__sun');
      this.clouds = [0, 1, 2, 3].map((i) => {
        const c = el(`ambient__cloud ambient__cloud--${i}`, 'canvas');
        c.style.animationDuration = `${[420, 560, 340, 680][i]}s`;
        c.style.animationDelay = `${[-140, -320, -60, -520][i]}s`;
        return c;
      });
      this.fxBack = el('ambient__fx', 'canvas'); // surprise events behind the skyline (ambient-events.js)
      this.birdsSlot = el('ambient__birds-slot'); // the murmuration canvas goes here (behind the skyline)
      this.skyline = el('ambient__skyline', 'canvas');
      this.lights = el('ambient__lights', 'canvas');
      this.fxFront = el('ambient__fx', 'canvas'); // ...and in front of it (rain, Landmark 81's LED show)
      this.plane = el('ambient__plane');

      this.geometry = buildSkyline(81);
      this.cloudMasks = [];
      this.look = null;
      this.painted = { clouds: '', skyline: '' };
      this.shown = new Set(); // sun / moon currently above the horizon
      this.moonLight = 1;
      this.lastLights = 0;
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      [this.skyline, this.lights].forEach((c) => {
        c.width = Math.round(this.width * this.dpr);
        c.height = Math.round(this.height * 0.62 * this.dpr);
      });
      [this.stars, this.twinkle].forEach((c) => {
        c.width = Math.round(this.width);
        c.height = Math.round(this.height * 0.8);
      });
      const sun = Math.round(Math.min(this.width, this.height) * 0.55);
      Object.assign(this.sun.style, {
        width: `${sun}px`,
        height: `${sun}px`,
        margin: `${-sun / 2}px 0 0 ${-sun / 2}px`,
      });
      this.paintStars();
      this.cloudMasks = this.clouds.map((c, i) => this.paintCloudMask(c, i));
      this.paintMoon();
      this.paintSilhouette();
      if (this.look) this.apply(this.look, true);
    }

    /** A new moon for each visit: usually a crescent or gibbous, sometimes full. */
    newMoon() {
      this.moonLight = Math.random() < 0.3 ? 1 : 0.3 + Math.random() * 0.65;
      if (this.width) this.paintMoon();
    }

    /**
     * Applies a look of the day.
     * @param {object} look From AmbientCycle#look.
     * @param {boolean} [force] Repaint everything and place the sun / moon without a transition.
     */
    apply(look, force = false) {
      this.look = look;
      const s = this.root.style;
      look.sky.forEach((c, i) => s.setProperty(`--sky-${i}`, css(c)));
      s.setProperty('--glow', css(look.glow));
      s.setProperty('--stars', look.stars.toFixed(3));
      s.setProperty('--vignette', look.vignette.toFixed(3));
      s.setProperty('--hud-shadow', look.hudShadow.toFixed(3));
      s.setProperty('--plane', look.plane.toFixed(3));
      s.setProperty('--belt', look.belt.toFixed(3));
      s.setProperty('--belt-x', look.beltX.toFixed(3));

      this.place('sun', look.sun, force);
      if (look.sun) {
        this.sun.style.setProperty('--sun-core', css(look.sun.core));
        this.sun.style.setProperty('--sun-halo', css(look.sun.halo));
        this.sun.style.setProperty('--sun-halo-soft', css(look.sun.haloSoft));
      }
      this.place('moon', look.moon, force);

      // Canvases are only repainted when a (rounded) colour actually changed.
      const clouds = css(look.cloudTop) + css(look.cloudBase);
      if (force || clouds !== this.painted.clouds) {
        this.painted.clouds = clouds;
        this.clouds.forEach((c, i) => this.tintCloud(c, this.cloudMasks[i]));
      }
      const skyline = css(look.far) + css(look.near) + css(look.haze);
      if (force || skyline !== this.painted.skyline) {
        this.painted.skyline = skyline;
        this.paintSkyline();
      }
      if (force) this.paintLights(0);
    }

    /** Moves the sun or the moon; a 1 s CSS transition smooths the steps between looks. */
    place(name, body, force) {
      const el = this[name];
      if (!body) {
        el.style.opacity = '0';
        this.shown.delete(name);
        return;
      }
      // Rising again: jump to the new position instead of sliding across from where it set.
      el.style.transition = force || !this.shown.has(name) ? 'none' : '';
      this.shown.add(name);
      el.style.opacity = body.alpha.toFixed(3);
      el.style.transform = `translate3d(${(body.x * this.width).toFixed(1)}px, ${(body.y * this.height).toFixed(1)}px, 0)`;
    }

    /** Geometry the surprise events need, in screen px. */
    stage() {
      const W = this.width;
      const H = this.height;
      const l = this.geometry.landmark81;
      return {
        W,
        H,
        dpr: this.dpr,
        /** Below every roof: things launched from here rise from behind the city. */
        rooftop: H * 0.95,
        landmark: { x: l.x * W, w: l.w * W, h: l.h * H },
        traceLandmark: (ctx) => traceLandmark(ctx, l.x * W, l.w * W, l.h * H, H),
        colors: Portfolio.config.swarm.colors,
        look: this.look,
        /** The buildings alone (no haze), to keep an effect on them; it covers the screen from `skylineTop` down. */
        silhouette: this.silhouette,
        skylineTop: H * 0.38,
        moonDisc: () => ({ r: this.moonRadius, full: this.moonLight >= 1 }),
        /** CSS filter on the moon (the eclipse dims it); '' resets it. */
        setMoonFilter: (filter) => {
          this.moon.style.filter = filter;
        },
      };
    }

    /* ---------- Painting ---------- */

    /** Two star layers: a steady one and a sparse one whose opacity breathes (twinkle, CSS only). */
    paintStars() {
      const r = rng(7);
      const steady = this.stars.getContext('2d');
      const twinkle = this.twinkle.getContext('2d');
      steady.clearRect(0, 0, this.stars.width, this.stars.height);
      twinkle.clearRect(0, 0, this.twinkle.width, this.twinkle.height);
      const count = Math.round((this.stars.width * this.stars.height) / 2200);
      for (let i = 0; i < count; i++) {
        const x = r() * this.stars.width;
        const y = r() ** 1.4 * this.stars.height; // denser high in the sky, washed out near the city
        const size = r() < 0.05 ? 1.7 : r() < 0.3 ? 1.15 : 0.75;
        const ctx = r() < 0.16 ? twinkle : steady;
        ctx.fillStyle = `rgba(${r() < 0.2 ? '200, 215, 255' : '255, 248, 235'}, ${0.45 + r() * 0.5})`;
        ctx.fillRect(x, y, size, size);
      }
    }

    /** The moon with its halo; the dark side is cut by an offset disc and keeps a faint earthshine. */
    paintMoon() {
      const r = Math.max(8, Math.min(this.width, this.height) * 0.016);
      this.moonRadius = r;
      const size = Math.ceil(r * 8);
      const m = size / 2;
      const canvas = this.moon;
      canvas.width = size;
      canvas.height = size;
      canvas.style.margin = `${-m}px 0 0 ${-m}px`;
      const ctx = canvas.getContext('2d');
      const halo = ctx.createRadialGradient(m, m, r * 0.8, m, m, m);
      halo.addColorStop(0, `rgba(210, 222, 255, ${0.05 + 0.16 * this.moonLight})`);
      halo.addColorStop(1, 'rgba(210, 222, 255, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);

      const disc = document.createElement('canvas');
      disc.width = size;
      disc.height = size;
      const d = disc.getContext('2d');
      const circle = (x, y, radius) => {
        d.beginPath();
        d.arc(x, y, radius, 0, Math.PI * 2);
        d.fill();
      };
      d.fillStyle = 'rgb(240, 238, 226)';
      circle(m, m, r);
      d.globalCompositeOperation = 'source-atop'; // maria: soft grey patches
      d.fillStyle = 'rgba(150, 150, 160, 0.22)';
      circle(m - r * 0.3, m - r * 0.2, r * 0.35);
      circle(m + r * 0.25, m + r * 0.3, r * 0.28);
      circle(m + r * 0.1, m - r * 0.42, r * 0.18);
      if (this.moonLight < 1) {
        const offset = 2 * r * this.moonLight;
        d.globalCompositeOperation = 'destination-out';
        d.filter = 'blur(1px)';
        d.fillStyle = '#000';
        circle(m - offset * 0.8, m - offset * 0.6, r * 1.02);
        d.filter = 'none';
        d.globalCompositeOperation = 'destination-over'; // earthshine on the dark side
        d.fillStyle = 'rgba(200, 210, 235, 0.08)';
        circle(m, m, r);
      }
      ctx.drawImage(disc, 0, 0);
    }

    /**
     * Shape of a cloud as a white mask (painted once per resize, re-tinted with each look):
     * a wide soft body plus crisper puffs along the top and a flat base. Puffs stay well
     * inside the canvas so the blur is never cut by its edges.
     * @returns {HTMLCanvasElement} The mask.
     */
    paintCloudMask(canvas, index) {
      const w = Math.round(this.width * [0.42, 0.55, 0.32, 0.6][index]);
      const h = Math.round(w * 0.3);
      canvas.width = w;
      canvas.height = h;
      canvas.style.top = `${[0.08, 0.22, 0.36, 0.03][index] * this.height}px`;
      const mask = document.createElement('canvas');
      mask.width = w;
      mask.height = h;
      const ctx = mask.getContext('2d');
      const r = rng(100 + index);
      const puff = (cx, cy, rad, alpha) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      };
      const baseY = h * 0.66;
      ctx.filter = `blur(${Math.round(h * 0.06)}px)`;
      for (let i = 0; i < 26; i++) {
        const t = 0.2 + r() * 0.6;
        const rad = h * (0.12 + r() * 0.1) * (0.7 + Math.sin(t * Math.PI) * 0.5);
        puff(w * t, baseY - rad * 0.55, rad, 0.55);
      }
      ctx.filter = `blur(${Math.max(2, Math.round(h * 0.015))}px)`;
      for (let i = 0; i < 34; i++) {
        const t = 0.24 + r() * 0.52;
        const dome = Math.sin(((t - 0.24) / 0.52) * Math.PI);
        puff(w * t, baseY - h * (0.12 + dome * 0.3) - r() * h * 0.06, h * (0.05 + r() * 0.07), 0.45);
      }
      ctx.filter = 'none';
      // Flat base.
      ctx.globalCompositeOperation = 'destination-out';
      const fade = ctx.createLinearGradient(0, baseY - h * 0.02, 0, baseY + h * 0.12);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, baseY - h * 0.02, w, h);
      return mask;
    }

    /** Tints a cloud: its top takes the sky's colour, its base the light from below (city or sun). */
    tintCloud(canvas, mask) {
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      const tint = ctx.createLinearGradient(0, 0, 0, canvas.height);
      tint.addColorStop(0, css(this.look.cloudTop));
      tint.addColorStop(0.75, css(this.look.cloudBase));
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    /** Black shapes of every building, once per resize: a mask for effects on the city (cloud shadows). */
    paintSilhouette() {
      this.silhouette = this.silhouette || document.createElement('canvas');
      this.silhouette.width = this.skyline.width;
      this.silhouette.height = this.skyline.height;
      const ctx = this.silhouette.getContext('2d');
      const W = this.width;
      const H = this.height;
      const base = this.skyline.height / this.dpr;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#000';
      [
        [this.geometry.far, 1],
        [this.geometry.near, 0.9],
      ].forEach(([list, k]) =>
        list.forEach((b) => ctx.fillRect(b.x * W, base - b.h * H * k, b.w * W, b.h * H * k)),
      );
      const l = this.geometry.landmark81;
      traceLandmark(ctx, l.x * W, l.w * W, l.h * H, base);
      ctx.fill();
    }

    paintSkyline() {
      const look = this.look;
      const ctx = this.skyline.getContext('2d');
      const W = this.width;
      const H = this.height;
      const base = this.skyline.height / this.dpr; // canvas covers the bottom 62% of the screen
      const near = css(look.near);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, base);
      const drawLayer = (list, color, scale) => {
        ctx.fillStyle = color;
        list.forEach((b) => {
          const bw = b.w * W;
          const bh = b.h * H * scale;
          const x = b.x * W;
          ctx.fillRect(x, base - bh, bw, bh);
          if (b.stepped) ctx.fillRect(x + bw * 0.2, base - bh - bh * 0.08, bw * 0.6, bh * 0.08 + 1);
          if (b.antenna) ctx.fillRect(x + bw * 0.5 - 0.75, base - bh - H * 0.025, 1.5, H * 0.025);
        });
      };
      drawLayer(this.geometry.far, css(look.far), 1);
      // Low haze between the layers (warm city glow at night, bright air by day): aerial perspective.
      const haze = ctx.createLinearGradient(0, base - H * 0.22, 0, base);
      haze.addColorStop(0, css([...look.haze.slice(0, 3), 0]));
      haze.addColorStop(1, css(look.haze));
      ctx.fillStyle = haze;
      ctx.fillRect(0, base - H * 0.22, W, H * 0.22);
      drawLayer(this.geometry.near, near, 0.9);

      ctx.fillStyle = near;
      const l = this.geometry.landmark81;
      traceLandmark(ctx, l.x * W, l.w * W, l.h * H, base);
      ctx.fill();

      // Bitexco: a tapering lotus bud with its helipad.
      const t = this.geometry.bitexco;
      const tx = t.x * W;
      const tw = t.w * W;
      const th = t.h * H;
      ctx.beginPath();
      ctx.moveTo(tx - tw * 0.5, base);
      ctx.bezierCurveTo(
        tx - tw * 0.62,
        base - th * 0.5,
        tx - tw * 0.45,
        base - th * 0.85,
        tx - tw * 0.12,
        base - th,
      );
      ctx.lineTo(tx + tw * 0.12, base - th);
      ctx.bezierCurveTo(
        tx + tw * 0.45,
        base - th * 0.85,
        tx + tw * 0.62,
        base - th * 0.5,
        tx + tw * 0.5,
        base,
      );
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(tx + tw * 0.55, base - th * 0.72, tw * 0.55, tw * 0.09, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(tx + tw * 0.2, base - th * 0.72, tw * 0.5, tw * 0.12);
    }

    /**
     * Window lights: as many as the hour calls for, with a few flipping on each refresh
     * (a gentle flicker). By day the unlit windows catch the sky instead.
     */
    paintLights(seed) {
      const look = this.look;
      if (!look) return;
      const ctx = this.lights.getContext('2d');
      const W = this.width;
      const H = this.height;
      const base = this.lights.height / this.dpr;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, base);
      const stable = rng(2024);
      const flicker = rng(seed + 1);
      const flickerRate = 0.03 * Math.min(1, look.lit / 0.1); // by day almost nothing flickers
      const glass = look.glass[3] > 0.01;
      const l = this.geometry.landmark81;
      const buildings = [
        ...this.geometry.near.map((b) => ({ ...b, h: b.h * 0.9 })),
        { x: l.x - l.w * 0.4, w: l.w * 0.8, h: l.h * 0.84 },
      ];
      const tones = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]; // warm, white, cool, glass
      buildings.forEach((b) => {
        const bw = b.w * W;
        const bh = b.h * H;
        const x0 = b.x * W;
        for (let y = base - bh + 6; y < base - 4; y += 6) {
          for (let x = x0 + 3; x < x0 + bw - 3; x += 5) {
            // The same draws for every window whatever the hour, so each window keeps its
            // own values: as `lit` rises at dusk the lights come on one by one, always in
            // the same order, and go off in reverse late at night.
            const on = stable() < look.lit;
            const tone = stable();
            if (on !== flicker() < flickerRate)
              tones[tone < 0.7 ? 0 : tone < 0.9 ? 1 : 2].rect(x, y, 1.6, 1.6);
            else if (glass) tones[3].rect(x, y, 1.6, 1.6);
          }
        }
      });
      const lamp = look.lamp;
      [
        `rgba(255, 214, 150, ${0.78 * lamp})`,
        `rgba(255, 244, 220, ${0.72 * lamp})`,
        `rgba(190, 220, 255, ${0.68 * lamp})`,
        css(look.glass),
      ].forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fill(tones[i]);
      });
      // Aviation warning light on Landmark 81's spire.
      ctx.fillStyle = `rgba(255, 64, 64, ${0.55 + 0.4 * look.dark})`;
      ctx.fillRect(l.x * W - 1.2, base - l.h * H - 1, 2.4, 2.4);
    }

    /** Called every frame; cheap. Re-rolls the window lights every few seconds. */
    tick(now) {
      if (now - this.lastLights > LIGHTS_REFRESH_MS) {
        this.lastLights = now;
        this.paintLights(Math.floor(now / LIGHTS_REFRESH_MS));
      }
    }
  }

  Portfolio.AmbientSky = AmbientSky;
})((window.Portfolio = window.Portfolio || {}));
