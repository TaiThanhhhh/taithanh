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

  const { css, mix } = Portfolio.AmbientCycle;
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
    const geometry = {
      far: layer(140, 0.06, 0.17, 0.012, 0.032),
      near: layer(90, 0.08, 0.24, 0.018, 0.05),
      landmark81: { x: 0.735, w: 0.034, h: 0.5 },
      bitexco: { x: 0.345, w: 0.024, h: 0.32 }, // the sun rises by it
    };
    // The two towers stand clear: the blocks at their feet are low and rise again further
    // away, so each tower's whole outline reads against the sky instead of melting into a
    // building of the same colour behind it.
    [geometry.bitexco, geometry.landmark81].forEach((tower) => {
      const inner = tower.w * 0.9;
      const valley = tower.w * 2.6;
      [
        [geometry.near, 0.9, 0.26],
        [geometry.far, 1, 0.4],
      ].forEach(([list, k, low]) => {
        list.forEach((b) => {
          // Distance from the tower's axis to the nearest wall of the block (0: the block spans it).
          const dist = b.x + b.w < tower.x ? tower.x - (b.x + b.w) : b.x > tower.x ? b.x - tower.x : 0;
          if (dist > inner + valley) return;
          const u = Math.max(0, (dist - inner) / valley); // 0 at the foot .. 1 at the edge of the valley
          const cap = (tower.h * (low + (0.62 - low) * u * u)) / k;
          if (b.h > cap) {
            b.h = cap;
            if (u < 0.5) b.antenna = false;
          }
        });
      });
    });
    return geometry;
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

  /** Bitexco's outline: a lotus bud tapering to its crown (relative to its width / height). */
  const BITEXCO_EDGE = [
    [0.5, 0],
    [0.62, 0.5],
    [0.45, 0.85],
    [0.12, 1],
  ];

  /** Half-width of Bitexco (share of its base width) at height v (0 base .. 1 top). */
  function bitexcoHalf(v) {
    const [p0, p1, p2, p3] = BITEXCO_EDGE;
    let prev = [p0[0], 0];
    for (let i = 1; i <= 24; i++) {
      const t = i / 24;
      const u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      if (y >= v) return prev[0] + ((x - prev[0]) * (v - prev[1])) / (y - prev[1] || 1);
      prev = [x, y];
    }
    return p3[0];
  }

  /**
   * Traces Bitexco: the bud and the helipad cantilevered from its 52nd floor.
   * Shared with the events (its light shows clip to it).
   */
  function traceBitexco(ctx, tx, tw, th, base) {
    const [, p1, p2, p3] = BITEXCO_EDGE;
    ctx.beginPath();
    ctx.moveTo(tx - tw * 0.5, base);
    ctx.bezierCurveTo(
      tx - tw * p1[0],
      base - th * p1[1],
      tx - tw * p2[0],
      base - th * p2[1],
      tx - tw * p3[0],
      base - th,
    );
    ctx.lineTo(tx + tw * p3[0], base - th);
    ctx.bezierCurveTo(
      tx + tw * p2[0],
      base - th * p2[1],
      tx + tw * p1[0],
      base - th * p1[1],
      tx + tw * 0.5,
      base,
    );
    ctx.closePath();
    // The helipad: a new sub-path starting exactly where the ellipse starts (no stray edge).
    const rot = -0.08;
    ctx.moveTo(tx + tw * 0.55 + tw * 0.55 * Math.cos(rot), base - th * 0.72 + tw * 0.55 * Math.sin(rot));
    ctx.ellipse(tx + tw * 0.55, base - th * 0.72, tw * 0.55, tw * 0.09, rot, 0, Math.PI * 2);
    ctx.rect(tx + tw * 0.2, base - th * 0.72, tw * 0.5, tw * 0.12);
  }

  /** Where a building sits in the blackout wave (0 left .. 1 right, a little jitter). */
  const waveOrder = (x, i) => {
    const s = Math.sin(i * 91.17) * 43758.5453;
    return Math.min(1, Math.max(0, (x + 0.03) / 1.06)) * 0.82 + (s - Math.floor(s)) * 0.17;
  };

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
      // Light thrown on the sky and the clouds by a burst or a lightning strike (screen blend,
      // behind the skyline: the city stays a black silhouette against it). A tiny canvas, upscaled.
      this.flash = el('ambient__flash', 'canvas');
      this.fxBack = el('ambient__fx', 'canvas'); // surprise events behind the skyline (ambient-events.js)
      this.fxBackTrails = el('ambient__fx', 'canvas'); // ...those leaving trails (fireworks), apart
      this.birdsSlot = el('ambient__birds-slot'); // the murmuration canvas goes here (behind the skyline)
      this.skyline = el('ambient__skyline', 'canvas');
      this.lights = el('ambient__lights', 'canvas');
      this.fxFront = el('ambient__fx', 'canvas'); // ...and in front of it (rain, Landmark 81's LED show)
      this.fxFrontTrails = el('ambient__fx', 'canvas');
      this.river = new Portfolio.AmbientRiver(root, this.fxFront); // the Saigon river, between the two
      // Bloom: bright shows glow like through a lens (quarter resolution, blurred, screen blend).
      this.bloom = el('ambient__bloom', 'canvas');
      this.plane = el('ambient__plane');

      this.geometry = buildSkyline(81);
      this.cloudMasks = [];
      this.look = null;
      this.painted = { clouds: '', skyline: '', blackout: 0 };
      this.lightSeed = 0;
      this.shown = new Set(); // sun / moon currently above the horizon
      this.moonPhase = { illumination: 1, waxing: true, full: true };
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
      this.ground = this.height * (1 - Portfolio.AmbientRiver.share);
      this.river.resize(this.width, this.height);
      this.flash.width = 64;
      this.flash.height = 36;
      this.paintStars();
      this.cloudMasks = this.clouds.map((c, i) => this.paintCloudMask(c, i));
      this.paintMoon();
      this.paintSilhouette();
      if (this.look) this.apply(this.look, true);
    }

    /**
     * Tonight's moon, from the lunar calendar: its phase, and which side is lit.
     * @param {{illumination: number, waxing: boolean, full: boolean}} moon
     */
    setMoon(moon) {
      if (!moon) return;
      this.moonPhase = moon;
      this.river.moonLight = moon.illumination;
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
      this.river.apply(look);
      // Earth Hour: the windows follow the blackout wave as it crosses the city.
      const blackout = look.blackout || 0;
      if (force || Math.abs(blackout - this.painted.blackout) > 0.004) {
        this.painted.blackout = blackout;
        this.paintLights(this.lightSeed);
      }
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
      const ground = this.ground;
      const l = this.geometry.landmark81;
      const b = this.geometry.bitexco;
      return {
        W,
        H,
        dpr: this.dpr,
        /** The far bank of the river: the city stands on it, the water is below. */
        ground,
        river: { top: ground, h: H - ground },
        /** Below every roof: things launched from here rise from behind the city. */
        rooftop: ground - H * 0.02,
        landmark: { x: l.x * W, w: l.w * W, h: l.h * H, top: ground - l.h * H },
        bitexco: {
          x: b.x * W,
          w: b.w * W,
          h: b.h * H,
          top: ground - b.h * H,
          /** The helipad: centre of its deck and its half-width. */
          pad: { x: (b.x + b.w * 0.55) * W, y: ground - b.h * H * 0.72, r: b.w * 0.55 * W },
          /** Half-width at height v (0 base .. 1 top), in px. */
          half: (v) => bitexcoHalf(v) * b.w * W,
        },
        traceLandmark: (ctx) => traceLandmark(ctx, l.x * W, l.w * W, l.h * H, ground),
        traceBitexco: (ctx) => traceBitexco(ctx, b.x * W, b.w * W, b.h * H, ground),
        colors: Portfolio.config.swarm.colors,
        look: this.look,
        /** The buildings alone (no haze), to keep an effect on them; it covers the screen from `skylineTop` down. */
        silhouette: this.silhouette,
        skylineTop: ground - H * 0.62,
        skylineH: H * 0.62,
        moonDisc: () => ({ r: this.moonRadius, full: this.moonPhase.full }),
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
      halo.addColorStop(0, `rgba(210, 222, 255, ${0.05 + 0.16 * this.moonPhase.illumination})`);
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
      const k = this.moonPhase.illumination;
      if (k < 0.985) {
        // The terminator is half an ellipse: the lit part is half the disc on the sun's side,
        // plus (gibbous) or minus (crescent) that half-ellipse. Near the equator the lit side
        // faces down towards the set (or rising) sun: an evening crescent lies like a boat.
        const shade = document.createElement('canvas');
        shade.width = size;
        shade.height = size;
        const s2 = shade.getContext('2d');
        s2.translate(m, m);
        s2.rotate(this.moonPhase.waxing ? 0.95 : Math.PI - 0.95);
        const rx = r * Math.abs(1 - 2 * k);
        s2.fillStyle = '#000';
        s2.beginPath();
        s2.arc(0, 0, r * 1.02, Math.PI / 2, -Math.PI / 2); // the dark half (away from the sun)
        s2.ellipse(0, 0, rx, r * 1.02, 0, -Math.PI / 2, Math.PI / 2, k > 0.5);
        s2.fill();
        d.globalCompositeOperation = 'destination-out';
        d.filter = 'blur(0.8px)';
        d.drawImage(shade, 0, 0);
        d.filter = 'none';
        d.globalCompositeOperation = 'destination-over'; // earthshine on the dark side
        d.fillStyle = `rgba(200, 210, 235, ${0.05 + 0.06 * (1 - k)})`;
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
      const b = this.geometry.bitexco;
      traceBitexco(ctx, b.x * W, b.w * W, b.h * H, base);
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

      // The two towers, glass rather than concrete: a sheen of the sky down one side and a thin
      // rim of light on their outline, so they read in front of the blocks around them.
      const sheen = mix(look.near, look.sky[3], 0.32);
      const rim = mix(look.near, look.haze.slice(0, 3), 0.55);
      const glassTower = (trace, cx, w) => {
        ctx.fillStyle = near;
        trace();
        ctx.fill();
        ctx.save();
        ctx.clip();
        const g = ctx.createLinearGradient(cx - w * 0.62, 0, cx + w * 0.62, 0);
        g.addColorStop(0, css([...sheen, 0.55]));
        g.addColorStop(0.35, css([...sheen, 0.12]));
        g.addColorStop(0.7, css([...sheen, 0]));
        g.addColorStop(1, css([...sheen, 0.18]));
        ctx.fillStyle = g;
        ctx.fillRect(cx - w, 0, w * 2, base);
        ctx.restore();
        ctx.strokeStyle = css([...rim, 0.35 + 0.25 * (1 - look.dark)]);
        ctx.lineWidth = 1;
        trace();
        ctx.stroke();
      };
      const l = this.geometry.landmark81;
      glassTower(() => traceLandmark(ctx, l.x * W, l.w * W, l.h * H, base), l.x * W, l.w * W);
      // Bitexco: a tapering lotus bud with its helipad.
      const t = this.geometry.bitexco;
      glassTower(() => traceBitexco(ctx, t.x * W, t.w * W, t.h * H, base), t.x * W, t.w * W);
    }

    /**
     * Window lights: as many as the hour calls for, with a few flipping on each refresh
     * (a gentle flicker). By day the unlit windows catch the sky instead.
     */
    paintLights(seed) {
      const look = this.look;
      if (!look) return;
      this.lightSeed = seed;
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
      // Earth Hour: buildings switch off one after another in a wave across the city; the
      // ones the wave is just reaching stutter; stairwells and exit signs stay lit.
      const blackout = look.blackout || 0;
      const l = this.geometry.landmark81;
      const bx = this.geometry.bitexco;
      const buildings = [
        ...this.geometry.near.map((b) => ({ ...b, h: b.h * 0.9 })),
        { x: l.x - l.w * 0.4, w: l.w * 0.8, h: l.h * 0.84 },
      ];
      const offOf = (x, i) => {
        const o = waveOrder(x, i);
        return {
          off: o < blackout,
          edge: blackout > 0 && blackout < 1 && o >= blackout && o < blackout + 0.04,
        };
      };
      const tones = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]; // warm, white, cool, glass
      const windowAt = (x, y, sw, state) => {
        // The same draws for every window whatever the hour, so each window keeps its
        // own values: as `lit` rises at dusk the lights come on one by one, always in
        // the same order, and go off in reverse late at night.
        let on = stable() < look.lit;
        const tone = stable();
        const f = flicker();
        if (state.off)
          on = on && tone > 0.94; // a few stay on
        else if (state.edge) on = on && f > 0.45;
        else if (f < flickerRate) on = !on;
        if (on) tones[tone < 0.7 ? 0 : tone < 0.9 ? 1 : 2].rect(x, y, sw, 1.6);
        else if (glass) tones[3].rect(x, y, sw, 1.6);
      };
      buildings.forEach((b, i) => {
        const bw = b.w * W;
        const bh = b.h * H;
        const x0 = b.x * W;
        const state = offOf(b.x + b.w / 2, i);
        for (let y = base - bh + 6; y < base - 4; y += 6) {
          for (let x = x0 + 3; x < x0 + bw - 3; x += 5) windowAt(x, y, 1.6, state);
        }
      });
      // Bitexco's floors: long strips of glass following its curved outline.
      const bState = offOf(bx.x, buildings.length);
      const bxc = bx.x * W;
      const bxh = bx.h * H;
      for (let y = base - bxh * 0.9; y < base - 4; y += 5) {
        const half = bitexcoHalf((base - y) / bxh) * bx.w * W - 3;
        for (let x = bxc - half; x < bxc + half - 1; x += 4) windowAt(x, y, 2.6, bState);
      }
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
      this.paintTowerLights(ctx, base, offOf(l.x, buildings.length - 1).off, bState.off);
      // Aviation warning lights stay on whatever happens (Earth Hour too).
      ctx.fillStyle = `rgba(255, 64, 64, ${0.55 + 0.4 * look.dark})`;
      ctx.fillRect(l.x * W - 1.2, base - l.h * H - 1, 2.4, 2.4);
      ctx.fillRect(bxc - 1, base - bxh - 1.5, 2, 2);
    }

    /**
     * The towers' own lights at night: Landmark 81's crown washed in cool white, Bitexco's
     * edges lit up and the ring of lights round its helipad. Off during Earth Hour.
     */
    paintTowerLights(ctx, base, landmarkOff, bitexcoOff) {
      const look = this.look;
      const a = look.lamp * Math.min(1, Math.max(0, (look.dark - 0.4) / 0.35));
      if (a <= 0.02) return;
      const W = this.width;
      const H = this.height;
      ctx.save();
      if (!landmarkOff) {
        const l = this.geometry.landmark81;
        const lx = l.x * W;
        const lw = l.w * W;
        const lh = l.h * H;
        // Crown: vertical fins washed from below, fading upwards.
        const g = ctx.createLinearGradient(0, base - lh * 0.84, 0, base - lh * 0.97);
        g.addColorStop(0, `rgba(205, 228, 255, ${0.55 * a})`);
        g.addColorStop(1, `rgba(205, 228, 255, ${0.08 * a})`);
        ctx.fillStyle = g;
        for (let i = -3; i <= 3; i++) ctx.fillRect(lx + i * lw * 0.045 - 0.5, base - lh * 0.97, 1, lh * 0.13);
        // The setbacks of each tube, outlined.
        ctx.fillStyle = `rgba(205, 228, 255, ${0.35 * a})`;
        [
          [0.5, 0.86],
          [0.7, 0.7],
          [0.84, 0.52],
        ].forEach(([at, width]) => ctx.fillRect(lx - (lw * width) / 2, base - lh * at - 1, lw * width, 1));
      }
      if (!bitexcoOff) {
        const b = this.geometry.bitexco;
        const tx = b.x * W;
        const tw = b.w * W;
        const th = b.h * H;
        // The edges of the bud, washed in warm white.
        ctx.fillStyle = `rgba(255, 236, 200, ${0.4 * a})`;
        for (let v = 0.06; v < 0.99; v += 0.012) {
          const half = bitexcoHalf(v) * tw;
          ctx.fillRect(tx - half, base - th * v, 1, 1.4);
          ctx.fillRect(tx + half - 1, base - th * v, 1, 1.4);
        }
        // The ring of lights round the helipad.
        ctx.fillStyle = `rgba(160, 255, 210, ${0.7 * a})`;
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2;
          ctx.fillRect(
            tx + tw * 0.55 + Math.cos(ang) * tw * 0.53 - 0.6,
            base - th * 0.72 + Math.sin(ang) * tw * 0.07,
            1.2,
            1.2,
          );
        }
        // The crown.
        ctx.fillStyle = `rgba(255, 236, 200, ${0.55 * a})`;
        ctx.fillRect(tx - tw * 0.12, base - th - 0.5, tw * 0.24, 1.2);
      }
      ctx.restore();
    }

    /** Called every frame; cheap. Re-rolls the window lights every few seconds. */
    tick(now) {
      if (now - this.lastLights > LIGHTS_REFRESH_MS) {
        this.lastLights = now;
        this.paintLights(Math.floor(now / LIGHTS_REFRESH_MS));
        this.river.paintStill(this.skyline, this.lights);
      } else if (this.river.dirty) {
        this.river.paintStill(this.skyline, this.lights);
      }
    }
  }

  Portfolio.AmbientSky = AmbientSky;
})((window.Portfolio = window.Portfolio || {}));
