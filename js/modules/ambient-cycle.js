/**
 * @file Ambient cycle: a whole day over Saigon, compressed into `config.ambient.cycleMinutes`.
 *
 * Not tied to the real clock. Each visit starts at golden hour (the most
 * striking light for the murmuration) and the day runs on from there:
 * golden hour → dusk → blue hour → night → late night → pre-dawn → sunrise →
 * morning → noon → afternoon → golden hour again. Waking the page briefly and
 * going idle again resumes the day where it would be (`resumeMinutes`).
 *
 * The day is a list of keyframes ("looks"). Between two keyframes every value
 * eases (smoothstep), so the sky never jumps and lingers a little on each
 * keyframe. The sun and the moon follow their own arcs, computed from the phase.
 */
(function (Portfolio) {
  'use strict';

  /**
   * Colours are [r, g, b] or [r, g, b, alpha]; `sky` runs from the zenith down
   * to the horizon. lit: share of windows with the lights on; lamp: how bright
   * those lights read (low by day); glass: unlit windows catching the sky;
   * birds/birdGlow: colour of the murmuration and how much it glows (1 = light
   * at night, 0 = dark silhouettes by day); dark: 0 = full day .. 1 = deep night
   * (drives the moon and which surprise events fit); belt: the Belt of Venus, a
   * pink band over the Earth's bluish shadow opposite the sun, just after sunset
   * and before sunrise.
   */
  const KEYFRAMES = [
    {
      at: 0,
      name: 'golden',
      sky: [
        [58, 72, 122],
        [124, 118, 162],
        [222, 150, 132],
        [250, 172, 104],
        [255, 198, 122],
      ],
      glow: [255, 170, 90, 0.3],
      stars: 0,
      cloudTop: [118, 96, 136, 0.62],
      cloudBase: [255, 156, 112, 0.78],
      far: [118, 82, 96],
      near: [38, 26, 38],
      haze: [255, 156, 112, 0.34],
      lit: 0.03,
      lamp: 0.6,
      glass: [255, 192, 124, 0.24],
      birds: [30, 22, 34],
      birdGlow: 0,
      dark: 0.3,
      vignette: 0.75,
      hudShadow: 0.5,
      plane: 0.7,
      belt: 0,
    },
    {
      at: 0.08,
      name: 'dusk',
      sky: [
        [30, 38, 84],
        [72, 64, 120],
        [168, 98, 130],
        [228, 122, 104],
        [250, 152, 106],
      ],
      glow: [255, 130, 92, 0.28],
      stars: 0.12,
      cloudTop: [72, 62, 104, 0.6],
      cloudBase: [236, 112, 112, 0.7],
      far: [82, 58, 84],
      near: [22, 16, 28],
      haze: [228, 120, 110, 0.34],
      lit: 0.12,
      lamp: 0.85,
      glass: [240, 140, 120, 0.1],
      birds: [24, 18, 30],
      birdGlow: 0.2,
      dark: 0.55,
      vignette: 0.85,
      hudShadow: 0.45,
      plane: 0.85,
      belt: 0.8,
    },
    {
      at: 0.15,
      name: 'blue',
      sky: [
        [10, 18, 52],
        [22, 38, 92],
        [50, 62, 126],
        [94, 80, 136],
        [148, 96, 122],
      ],
      glow: [255, 150, 96, 0.2],
      stars: 0.5,
      cloudTop: [40, 52, 96, 0.55],
      cloudBase: [122, 82, 112, 0.6],
      far: [30, 34, 62],
      near: [10, 12, 24],
      haze: [92, 70, 112, 0.4],
      lit: 0.27,
      lamp: 1,
      glass: [240, 140, 120, 0],
      birds: [176, 190, 244],
      birdGlow: 0.85,
      dark: 0.8,
      vignette: 1,
      hudShadow: 0.4,
      plane: 0.9,
      belt: 0.4,
    },
    {
      at: 0.22,
      name: 'night',
      sky: [
        [3, 5, 12],
        [7, 11, 25],
        [17, 19, 39],
        [29, 23, 41],
        [42, 28, 43],
      ],
      glow: [255, 150, 96, 0.13],
      stars: 1,
      cloudTop: [30, 36, 62, 0.5],
      cloudBase: [78, 56, 70, 0.55],
      far: [17, 18, 31],
      near: [7, 9, 15],
      haze: [52, 36, 54, 0.42],
      lit: 0.3,
      lamp: 1,
      glass: [200, 220, 250, 0],
      birds: [206, 218, 255],
      birdGlow: 1,
      dark: 1,
      vignette: 1,
      hudShadow: 0.4,
      plane: 0.9,
      belt: 0,
    },
    {
      at: 0.45,
      name: 'late',
      sky: [
        [2, 3, 8],
        [4, 7, 17],
        [10, 13, 28],
        [18, 16, 30],
        [26, 20, 32],
      ],
      glow: [255, 150, 96, 0.07],
      stars: 1,
      cloudTop: [24, 28, 48, 0.45],
      cloudBase: [52, 42, 58, 0.45],
      far: [14, 15, 26],
      near: [5, 7, 12],
      haze: [40, 30, 46, 0.38],
      lit: 0.07,
      lamp: 1,
      glass: [200, 220, 250, 0],
      birds: [206, 218, 255],
      birdGlow: 1,
      dark: 1,
      vignette: 1,
      hudShadow: 0.4,
      plane: 0.9,
      belt: 0,
    },
    {
      at: 0.58,
      name: 'predawn',
      sky: [
        [8, 14, 40],
        [24, 34, 76],
        [70, 70, 118],
        [150, 100, 130],
        [220, 140, 130],
      ],
      glow: [255, 160, 130, 0.22],
      stars: 0.35,
      cloudTop: [60, 62, 104, 0.55],
      cloudBase: [210, 130, 140, 0.6],
      far: [60, 56, 90],
      near: [18, 18, 32],
      haze: [190, 130, 150, 0.35],
      lit: 0.1,
      lamp: 0.95,
      glass: [255, 200, 170, 0],
      birds: [190, 200, 240],
      birdGlow: 0.7,
      dark: 0.75,
      vignette: 0.95,
      hudShadow: 0.4,
      plane: 0.9,
      belt: 0.75,
    },
    {
      at: 0.64,
      name: 'sunrise',
      sky: [
        [60, 96, 160],
        [120, 150, 200],
        [220, 180, 170],
        [255, 190, 140],
        [255, 214, 160],
      ],
      glow: [255, 200, 140, 0.32],
      stars: 0,
      cloudTop: [205, 186, 206, 0.7],
      cloudBase: [255, 190, 150, 0.8],
      far: [130, 120, 140],
      near: [50, 46, 62],
      haze: [255, 200, 170, 0.4],
      lit: 0.03,
      lamp: 0.5,
      glass: [255, 210, 170, 0.2],
      birds: [34, 30, 44],
      birdGlow: 0,
      dark: 0.3,
      vignette: 0.75,
      hudShadow: 0.5,
      plane: 0.7,
      belt: 0.25,
    },
    {
      at: 0.7,
      name: 'morning',
      sky: [
        [60, 120, 200],
        [110, 165, 225],
        [165, 205, 240],
        [205, 228, 245],
        [225, 236, 240],
      ],
      glow: [255, 255, 255, 0.08],
      stars: 0,
      cloudTop: [255, 255, 255, 0.92],
      cloudBase: [205, 215, 232, 0.85],
      far: [140, 160, 186],
      near: [70, 84, 106],
      haze: [220, 232, 245, 0.45],
      lit: 0.01,
      lamp: 0.35,
      glass: [205, 225, 250, 0.16],
      birds: [34, 38, 52],
      birdGlow: 0,
      dark: 0,
      vignette: 0.7,
      hudShadow: 0.55,
      plane: 0.6,
      belt: 0,
    },
    {
      at: 0.82,
      name: 'noon',
      sky: [
        [40, 104, 196],
        [88, 152, 224],
        [140, 190, 238],
        [190, 220, 245],
        [214, 232, 244],
      ],
      glow: [255, 255, 255, 0.06],
      stars: 0,
      cloudTop: [255, 255, 255, 0.95],
      cloudBase: [200, 212, 230, 0.85],
      far: [150, 170, 195],
      near: [78, 92, 114],
      haze: [225, 236, 248, 0.5],
      lit: 0,
      lamp: 0.35,
      glass: [215, 232, 250, 0.14],
      birds: [34, 38, 52],
      birdGlow: 0,
      dark: 0,
      vignette: 0.7,
      hudShadow: 0.55,
      plane: 0.6,
      belt: 0,
    },
    {
      at: 0.93,
      name: 'afternoon',
      sky: [
        [54, 104, 180],
        [110, 150, 210],
        [180, 190, 215],
        [230, 206, 180],
        [245, 214, 170],
      ],
      glow: [255, 210, 150, 0.18],
      stars: 0,
      cloudTop: [255, 248, 240, 0.9],
      cloudBase: [228, 200, 188, 0.85],
      far: [150, 148, 165],
      near: [70, 68, 88],
      haze: [240, 220, 200, 0.45],
      lit: 0.01,
      lamp: 0.4,
      glass: [255, 225, 190, 0.18],
      birds: [34, 32, 44],
      birdGlow: 0,
      dark: 0.1,
      vignette: 0.72,
      hudShadow: 0.55,
      plane: 0.6,
      belt: 0,
    },
  ];

  /** The sun rises at 0.6 and sets at 0.045 of the next day, just after golden hour. */
  const SUN = { rise: 0.6, span: 0.445 };
  const MOON = { rise: 0.1, span: 0.5 };

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smooth = (x) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
  };
  const wrap = (x) => ((x % 1) + 1) % 1;

  /** Mixes two numbers or two (nested) arrays of numbers. */
  function mix(a, b, u) {
    if (typeof a === 'number') return a + (b - a) * u;
    return a.map((v, i) => mix(v, b[i], u));
  }

  /** CSS colour from [r, g, b] or [r, g, b, a]. */
  function css(c) {
    const rgb = `${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}`;
    return c.length > 3 ? `rgba(${rgb}, ${Math.max(0, c[3]).toFixed(3)})` : `rgb(${rgb})`;
  }

  /** Progress (0..1) of a body across its arc, or null while it is below the horizon. */
  function arc(phase, body) {
    const u = wrap(phase - body.rise) / body.span;
    return u <= 1 ? u : null;
  }

  /**
   * Positions are shares of the screen (x from the left, y from the top). Both arcs stay
   * clear of the clock in the bottom-left corner.
   */
  function sunAt(u) {
    const altitude = Math.sin(Math.PI * u);
    const low = 1 - smooth((altitude - 0.08) / 0.5); // deep orange near the horizon, white high up
    const halo = mix([255, 246, 220, 0.3], [255, 140, 70, 0.5], low);
    return {
      // Rises by Bitexco, sets just behind Landmark 81.
      x: 0.36 + 0.4 * u,
      y: 0.95 - 0.72 * altitude,
      altitude,
      alpha: 1,
      core: mix([255, 250, 236], [255, 168, 96], low),
      halo,
      haloSoft: [halo[0], halo[1], halo[2], halo[3] * 0.3],
    };
  }

  function moonAt(u, dark) {
    return {
      x: 0.38 + 0.56 * u,
      y: 0.92 - 0.66 * Math.sin(Math.PI * u),
      alpha: smooth((dark - 0.45) / 0.4),
    };
  }

  /** The look of the day at `phase` (0..1). */
  function lookAt(phase) {
    const p = wrap(phase);
    let i = KEYFRAMES.length - 1;
    while (KEYFRAMES[i].at > p) i--;
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[(i + 1) % KEYFRAMES.length];
    const span = wrap(b.at - a.at) || 1;
    const u = smooth((p - a.at) / span);

    const look = { phase: p, name: u < 0.5 ? a.name : b.name };
    Object.keys(a).forEach((key) => {
      if (key !== 'at' && key !== 'name') look[key] = mix(a[key], b[key], u);
    });
    const sun = arc(p, SUN);
    const moon = arc(p, MOON);
    look.sun = sun === null ? null : sunAt(sun);
    look.moon = moon === null ? null : moonAt(moon, look.dark);
    // Opposite the sun: where it set (evening) or where it will rise (morning).
    look.beltX = 1 - (look.sun ? look.sun.x : p < 0.3 ? 0.76 : 0.36);
    return look;
  }

  class AmbientCycle {
    /**
     * @param {object} config `Portfolio.config.ambient`.
     * @param {{speed?: number, at?: number}} [options] Overrides to try things out
     *   (`?speed=40`: the day runs 40x faster; `?at=night`: where each visit starts).
     */
    constructor(config, options = {}) {
      this.cycleMs = (config.cycleMinutes * 60000) / (options.speed || 1);
      this.resumeMs = config.resumeMinutes * 60000;
      this.startPhase = options.at ?? 0;
      this.origin = null;
      this.stoppedAt = -Infinity;
    }

    /** Starts the day at golden hour, or resumes it after a short wake. */
    start(now) {
      if (this.origin === null || now - this.stoppedAt > this.resumeMs) {
        this.origin = now - this.startPhase * this.cycleMs;
      }
    }

    stop(now) {
      this.stoppedAt = now;
    }

    phase(now) {
      return wrap((now - this.origin) / this.cycleMs);
    }

    look(now) {
      return lookAt(this.phase(now));
    }

    /**
     * Phase of a keyframe name ("night") or a number ("0.3"); undefined otherwise.
     * @param {string | null} value
     */
    static phaseOf(value) {
      if (!value) return undefined;
      const key = KEYFRAMES.find((k) => k.name === value);
      if (key) return key.at;
      const n = Number(value);
      return Number.isFinite(n) ? wrap(n) : undefined;
    }

    static get names() {
      return KEYFRAMES.map((k) => k.name);
    }
  }

  AmbientCycle.css = css;
  AmbientCycle.mix = mix;

  Portfolio.AmbientCycle = AmbientCycle;
})((window.Portfolio = window.Portfolio || {}));
