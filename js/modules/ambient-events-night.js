/**
 * @file Ambient surprises over the city at night (registered with ambient-events.js):
 * fireworks over the river (high shells from behind the city, low ones from barges on
 * the water, as Saigon fires them for 30/4, 2/9 and Giao thừa), a drone show, Landmark
 * 81's LED façade, a laser show, searchlights and the dinner cruises on the river.
 *
 * Shared engines, also used by the occasions (ambient-events-calendar.js):
 * `fx.fireworksShow`, `fx.droneShow` and `fx.landmarkShow`.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, pick, envelope, smooth, clamp01 } = fx;

  /* ---------- Fireworks over the river ---------- */

  const GRAVITY = 0.045; // px per 60fps frame, squared

  /**
   * Shell recipes, after the classic aerial shells: peony (round burst of plain stars),
   * chrysanthemum (the stars leave a trail of sparks), willow and kamuro (long-burning
   * gold stars drooping like branches), palm (a few thick comet arms on a rising trunk),
   * ring, saturn (a ring around a round core), heart, crossette (each star splits into
   * four) and glitter (twinkling stars).
   * count: stars; speed: px/frame at 1080p; life: frames; sparkle: chance per frame
   * of a spark falling off a star.
   */
  const SHELLS = {
    peony: { count: [90, 140], speed: [3.2, 4.6], life: [70, 110], drag: 0.972, fall: 0.4, size: 2.6 },
    chrysanthemum: {
      count: [90, 130],
      speed: [3.2, 4.4],
      life: [80, 120],
      drag: 0.972,
      fall: 0.4,
      size: 2.2,
      sparkle: 0.3,
    },
    willow: {
      count: [100, 130],
      speed: [2.2, 3],
      life: [260, 340],
      drag: 0.968,
      fall: 0.6,
      size: 2,
      sparkle: 0.16,
      color: '#ffc864',
    },
    kamuro: {
      count: [150, 180],
      speed: [2.4, 3.1],
      life: [300, 380],
      drag: 0.966,
      fall: 0.62,
      size: 1.7,
      sparkle: 0.32,
      color: '#ffd27a',
    },
    palm: {
      count: [7, 10],
      speed: [4.2, 5.2],
      life: [110, 140],
      drag: 0.975,
      fall: 0.5,
      size: 4,
      sparkle: 0.9,
      color: '#ffd27a',
      trunk: true,
    },
    ring: {
      count: [64, 80],
      speed: [3.2, 4.2],
      life: [70, 100],
      drag: 0.972,
      fall: 0.35,
      size: 2.6,
      ring: true,
    },
    saturn: {
      count: [90, 110],
      speed: [3.4, 4.2],
      life: [80, 105],
      drag: 0.972,
      fall: 0.35,
      size: 2.4,
      saturn: true,
    },
    heart: {
      count: [72, 88],
      speed: [3, 3.5],
      life: [75, 95],
      drag: 0.972,
      fall: 0.22,
      size: 2.6,
      heart: true,
      color: '#ff5c8a',
    },
    crossette: {
      count: [16, 24],
      speed: [3.4, 4.4],
      life: [40, 55],
      drag: 0.975,
      fall: 0.35,
      size: 2.6,
      split: true,
    },
    glitter: {
      count: [90, 130],
      speed: [3, 4.2],
      life: [80, 110],
      drag: 0.972,
      fall: 0.4,
      size: 2.2,
      strobe: true,
      color: '#f2f5ff',
    },
    /** A comet fired from a barge: one bright star with a sparkling tail, no burst. */
    comet: { count: [1, 1], speed: [0, 0], life: [70, 95], drag: 0.985, fall: 0.6, size: 2.8, sparkle: 1 },
  };

  const PALETTES = {
    city: ['#ffd27a', '#ffffff', '#ff7eb6', '#8fe3ff', '#b6ff7a', '#c070ff', '#ff6a3d'],
    /** National days: red and gold, the colours of the flag, with white. */
    flag: ['#ff3b30', '#ff3b30', '#ffd34d', '#ffd34d', '#fff6dc'],
    /** Tết: red, gold, peach-pink and white. */
    tet: ['#ff3b30', '#ffd34d', '#ffb3c7', '#fff6dc', '#ff8a3d'],
  };

  /**
   * A fireworks show: shells launched from behind the skyline, low shells and comet
   * fans fired from barges on the river (in front of the city), a finale barrage,
   * the sky lit by every burst and the flock flinching at every bang.
   * @param {object} stage
   * @param {object} o
   * @param {number} o.until Launches stop after this (ms); then the finale.
   * @param {number[]} o.gap Gap between launches (ms).
   * @param {number} o.pair Chance of a second shell right after.
   * @param {number} o.finale Shells in the finale.
   * @param {number} o.spread Horizontal spread of the launch site (share of the width).
   * @param {string[]} o.kinds Shell kinds to pick from.
   * @param {string[]} [o.palette] Colours (default: the site's palettes and classic ones).
   * @param {number} [o.barge] Share of launches fired low from barges on the river.
   */
  function fireworksShow(stage, o) {
    const { W, H } = stage;
    const scale = H / 1080;
    const colors = o.palette || [...stage.colors, ...PALETTES.city];
    const flare = fx.glowSprite([255, 236, 210], 64);
    const centre = rand(0.3, 0.62) * W; // the show stands over one stretch of the river
    const water = stage.river ? stage.river.top + stage.river.h * 0.25 : stage.rooftop;
    const launches = [];
    for (let at = 400; at < o.until; at += rand(o.gap[0], o.gap[1])) {
      launches.push(at);
      if (Math.random() < o.pair) launches.push(at + rand(120, 380));
    }
    for (let i = 0; i < o.finale; i++) launches.push(o.until + 1200 + i * rand(110, 240)); // finale
    const rockets = [];
    const sparks = [];
    const embers = []; // sparks falling off stars and rockets: short-lived glitter
    const flashes = [];
    let launched = 0;

    const fan = () => {
      // A cake on a barge fires a sweeping fan of comets, low over the water.
      const x = centre + rand(-o.spread, o.spread) * W;
      const n = Math.round(rand(5, 9));
      const color = pick(colors);
      const sweep = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + sweep * (-0.55 + (1.1 * i) / (n - 1));
        const speed = rand(6.2, 7.4) * scale;
        sparks.push({
          x,
          y: water,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 1,
          decay: 1 / rand(SHELLS.comet.life[0], SHELLS.comet.life[1]),
          color,
          color2: null,
          shell: SHELLS.comet,
          size: SHELLS.comet.size * Math.max(1, scale),
          split: false,
          front: true,
          wait: i * 4, // fired one after another (frames)
        });
      }
    };

    const launch = () => {
      if (o.barge && Math.random() < o.barge) {
        if (Math.random() < 0.45) {
          fan();
          return;
        }
        // A low shell from a barge: bursts in front of the city.
        const apex = rand(0.5, 0.66) * H;
        rockets.push({
          kind: pick(['peony', 'chrysanthemum', 'glitter', 'ring']),
          x: centre + rand(-o.spread, o.spread) * W,
          y: water,
          vx: rand(-0.2, 0.2),
          vy: -Math.sqrt(2 * GRAVITY * (water - apex)),
          front: true,
          small: 0.6,
        });
        return;
      }
      const apex = rand(0.14, 0.42) * H;
      rockets.push({
        kind: pick(o.kinds),
        x: centre + rand(-o.spread, o.spread) * W,
        y: stage.rooftop,
        vx: rand(-0.35, 0.35),
        vy: -Math.sqrt(2 * GRAVITY * (stage.rooftop - apex)),
        front: false,
        small: 1,
      });
    };

    const MAX_EMBERS = 2500; // keeps the grand finale light on any machine
    const ember = (x, y, vx, vy, color, front) => {
      if (embers.length >= MAX_EMBERS) return;
      embers.push({
        x,
        y,
        vx: vx * 0.2 + rand(-0.2, 0.2),
        vy: vy * 0.2 + rand(-0.1, 0.2),
        life: 1,
        decay: 1 / rand(18, 34),
        color,
        front,
      });
    };

    /** Initial velocity of star i of n for a shell (a sphere, a ring, a heart...). */
    const velocity = (shell, i, count, speed, tilt) => {
      if (shell.ring || (shell.saturn && i % 2 === 0)) {
        // A flat ring seen at an angle: an ellipse.
        const a = (i / count) * TAU;
        const ex = Math.cos(a) * speed;
        const ey = Math.sin(a) * speed * 0.45;
        return [ex * Math.cos(tilt) - ey * Math.sin(tilt), ex * Math.sin(tilt) + ey * Math.cos(tilt)];
      }
      if (shell.heart) {
        const a = (i / count) * TAU;
        const hx = 16 * Math.sin(a) ** 3;
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        const r = (tilt - Math.PI) * 0.06; // hearts stay nearly upright
        const x = (hx * Math.cos(r) - hy * Math.sin(r)) / 17;
        const y = (hx * Math.sin(r) + hy * Math.cos(r)) / 17;
        return [x * speed, y * speed];
      }
      if (shell.trunk) {
        // Palm: a few arms, evenly spread.
        const a = (i / count) * TAU + rand(-0.15, 0.15);
        return [Math.cos(a) * speed, Math.sin(a) * speed];
      }
      // A sphere of stars seen from the side: denser towards the rim (saturn: a smaller core).
      const a = rand(0, TAU);
      const z = rand(-1, 1);
      const r = Math.sqrt(1 - z * z) * speed * rand(0.92, 1.04) * (shell.saturn ? 0.5 : 1);
      return [Math.cos(a) * r, Math.sin(a) * r];
    };

    const burst = (rocket) => {
      const shell = SHELLS[rocket.kind];
      const count = Math.round(rand(shell.count[0], shell.count[1]) * rocket.small);
      const speed = rand(shell.speed[0], shell.speed[1]) * scale * (rocket.small < 1 ? 0.75 : 1);
      const color = shell.color || pick(colors);
      // Two-tone shells: the stars change colour halfway through.
      const color2 = !shell.color && Math.random() < 0.35 ? pick(colors) : null;
      const tilt = rand(0, TAU);
      for (let i = 0; i < count; i++) {
        const [vx, vy] = velocity(shell, i, count, speed, tilt);
        sparks.push({
          x: rocket.x,
          y: rocket.y,
          vx,
          vy,
          life: 1,
          decay: 1 / rand(shell.life[0], shell.life[1]),
          color,
          color2,
          shell,
          size: shell.size * Math.max(1, scale) * (rocket.small < 1 ? 0.8 : 1),
          split: !!shell.split,
          front: rocket.front,
          wait: 0,
        });
      }
      flashes.push({ x: rocket.x, y: rocket.y, front: rocket.front, r: rocket.small });
      // The burst lights up the haze and the clouds around it, in its colour.
      const rgb = color.startsWith('#') ? fx.hex(color) : [255, 230, 200];
      if (stage.flash) stage.flash(rocket.x, rocket.y, 0.55 * rocket.small, rgb, 0.34 * rocket.small, 260);
      if (stage.startle) stage.startle(rocket.x, rocket.y, H * 0.28);
    };

    const drawLayer = (ctx, front) => {
      ctx.globalCompositeOperation = 'lighter';
      let color = '';
      sparks.forEach((p) => {
        if (p.front !== front || p.wait > 0) return;
        // A star burns white-hot for an instant before showing its colour.
        const c = p.life > 0.93 ? '#fff6e8' : p.color2 && p.life < 0.5 ? p.color2 : p.color;
        if (c !== color) {
          ctx.fillStyle = c;
          color = c;
        }
        const a = p.life ** 1.2;
        ctx.globalAlpha = p.shell.strobe && Math.random() < 0.45 ? a * 0.12 : a;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      color = '';
      embers.forEach((e) => {
        if (e.front !== front) return;
        if (e.color !== color) {
          ctx.fillStyle = e.color;
          color = e.color;
        }
        ctx.globalAlpha = e.life * 0.8;
        ctx.fillRect(e.x - 0.7, e.y - 0.7, 1.4, 1.4);
      });
      // The flash of a burst is drawn once: the trails' fade turns it into a short glow.
      flashes.forEach((f) => {
        if (f.front !== front) return;
        // The core flash only: the glow in the haze is on the light layer (stage.flash).
        const r = H * 0.04 * f.r;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(flare, f.x - r, f.y - r, r * 2, r * 2);
      });
      ctx.globalAlpha = 1;
    };

    return {
      trails: 0.085,
      bloom: 0.6,
      mirror: true,
      update(k, t) {
        while (launched < launches.length && t >= launches[launched]) {
          launch();
          launched++;
        }
        rockets.forEach((r) => {
          r.vy += GRAVITY * k;
          r.x += r.vx * k;
          r.y += r.vy * k;
          const trunk = SHELLS[r.kind].trunk; // a palm rises on a thick, sparkling trunk
          if (Math.random() < (trunk ? 1 : 0.5) * k)
            ember(r.x, r.y, 0, 1, trunk ? '#ffd27a' : '#ffdcb0', r.front);
          if (r.vy > -0.6) {
            burst(r);
            r.done = true;
          }
        });
        fx.compact(rockets, (r) => !r.done);
        const born = [];
        sparks.forEach((p) => {
          if (p.wait > 0) {
            p.wait -= k;
            return;
          }
          const drag = p.shell.drag ** k;
          p.vx *= drag;
          p.vy = p.vy * drag + GRAVITY * p.shell.fall * k;
          p.x += p.vx * k;
          p.y += p.vy * k;
          p.life -= p.decay * k;
          if (p.shell.sparkle && Math.random() < p.shell.sparkle * k)
            ember(p.x, p.y, p.vx, p.vy, '#ffe2a8', p.front);
          if (p.split && p.life < 0.45) {
            // Crossette: the star breaks into four, flying off in a cross.
            const a = Math.atan2(p.vy, p.vx) + Math.PI / 4;
            const s = 1.8 * scale;
            for (let i = 0; i < 4; i++) {
              const b = a + (i * Math.PI) / 2;
              born.push({
                ...p,
                vx: Math.cos(b) * s,
                vy: Math.sin(b) * s,
                life: 1,
                decay: 1 / 45,
                split: false,
              });
            }
            p.life = 0;
          }
        });
        fx.compact(sparks, (p) => p.life > 0);
        sparks.push(...born);
        embers.forEach((e) => {
          e.vy += GRAVITY * 0.3 * k;
          e.x += e.vx * k;
          e.y += e.vy * k;
          e.life -= e.decay * k;
        });
        fx.compact(embers, (e) => e.life > 0);
        return launched < launches.length || rockets.length + sparks.length + embers.length > 0;
      },
      back(ctx) {
        drawLayer(ctx, false);
      },
      front(ctx) {
        drawLayer(ctx, true);
        flashes.length = 0;
      },
    };
  }

  fx.fireworksShow = fireworksShow;
  fx.palettes = PALETTES;

  const SHOW_KINDS = [
    'peony',
    'peony',
    'chrysanthemum',
    'chrysanthemum',
    'ring',
    'willow',
    'palm',
    'crossette',
    'glitter',
    'saturn',
  ];

  fx.register({
    name: 'fireworks',
    label: 'Pháo hoa trên sông Sài Gòn',
    place: 'Sông Sài Gòn',
    group: 'night',
    spectacle: true,
    weight: 1.1,
    when: (look) => look.dark > 0.6,
    create: (stage) =>
      fireworksShow(stage, {
        until: 21000,
        gap: [700, 1700],
        pair: 0.35,
        finale: 9,
        spread: 0.2,
        barge: 0.25,
        kinds: SHOW_KINDS,
      }),
  });

  fx.register({
    name: 'grandshow',
    label: 'Đêm pháo hoa lớn',
    place: 'Sông Sài Gòn',
    group: 'night',
    spectacle: true,
    rarity: 'rare',
    // Plays the city's own shows when no occasion has its own (see ambient-events-calendar.js).
    live: ['fireworks'],
    when: (look) => look.dark > 0.7,
    create(stage, extra = {}) {
      const remaining = extra.live ? extra.live.endsAt - Date.now() - 6000 : 40000;
      return fireworksShow(stage, {
        until: Math.max(15000, Math.min(90000, remaining)),
        gap: [350, 900],
        pair: 0.55,
        finale: 28,
        spread: 0.3,
        barge: 0.3,
        kinds: [...SHOW_KINDS, 'kamuro', 'willow', 'chrysanthemum'],
      });
    },
  });

  fx.register({
    name: 'fireworks_kamuro',
    label: 'Pháo hoa liễu vàng',
    place: 'Sông Sài Gòn',
    group: 'night',
    spectacle: true,
    rarity: 'uncommon',
    when: (look) => look.dark > 0.65,
    create: (stage) =>
      fireworksShow(stage, {
        until: 18000,
        gap: [1400, 2400],
        pair: 0.5,
        finale: 6,
        spread: 0.18,
        kinds: ['kamuro', 'kamuro', 'willow', 'glitter'],
        palette: ['#ffd27a', '#fff2cc'],
      }),
  });

  /* ---------- Drone show ---------- */

  /** The site's pointer arrow (same as swarm mode). */
  const ARROW = [
    [0, 0],
    [0, 15.2],
    [4.1, 11.3],
    [6.8, 17.5],
    [9.4, 16.4],
    [6.7, 10.3],
    [12.2, 10.3],
  ];

  /** Flat figures, drawn on a 320x160 canvas and sampled into drone positions. */
  const FIGURES = {
    heart(ctx, w, h) {
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * TAU;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        ctx.lineTo(w / 2 + x * 4.4, h / 2 - y * 4.4 - 6);
      }
      ctx.fill();
    },
    star(ctx, w, h) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 30 : 72;
        const a = (i / 10) * TAU - Math.PI / 2;
        ctx.lineTo(w / 2 + Math.cos(a) * r, h / 2 + 6 + Math.sin(a) * r);
      }
      ctx.fill();
    },
    cursor(ctx, w, h) {
      const s = 8.2;
      ctx.beginPath();
      ARROW.forEach(([x, y]) => ctx.lineTo(w / 2 + (x - 6.1) * s, h / 2 + (y - 8.75) * s));
      ctx.fill();
    },
    /** A mai blossom (the yellow apricot flower of a southern Tết): five round petals. */
    mai(ctx, w, h) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(w / 2 + Math.cos(a) * 36, h / 2 + Math.sin(a) * 36, 30, 24, a, 0, TAU);
        ctx.fill();
      }
    },
    /** Ba Son bridge: one pylon, a fan of stay cables, the deck. */
    bridge(ctx, w, h) {
      const px = w * 0.42;
      const top = h * 0.08;
      const deck = h * 0.72;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, deck + 18);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      for (let i = 1; i <= 7; i++) {
        ctx.beginPath();
        ctx.moveTo(px, top + i * 7);
        ctx.lineTo(px - i * 19, deck);
        ctx.moveTo(px, top + i * 7);
        ctx.lineTo(px + i * 21, deck);
        ctx.stroke();
      }
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * 0.02, deck);
      ctx.lineTo(w * 0.98, deck);
      ctx.stroke();
    },
    text: (label) => (ctx, w, h) => {
      let size = 96;
      ctx.font = `700 ${size}px poppins, "Segoe UI", sans-serif`;
      const width = ctx.measureText(label).width;
      if (width > w * 0.94) size *= (w * 0.94) / width;
      ctx.font = `700 ${size}px poppins, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2);
    },
  };

  function ring(n) {
    return Array.from({ length: n }, (_, i) => ({
      x: Math.cos((i / n) * TAU) * 0.5,
      y: Math.sin((i / n) * TAU) * 0.5,
      z: 0,
      u: i / n,
    }));
  }

  /**
   * Draws a figure off-screen and spreads `n` points evenly over it (farthest-point
   * sampling, like the even spacing of a real drone show).
   * @returns {{x: number, y: number, z: number, u: number}[]} Centred on 0, height 1; u: 0..1 across.
   */
  function figurePoints(draw, n) {
    const w = 320;
    const h = 160;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    draw(ctx, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const xs = [];
    const ys = [];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (data[(y * w + x) * 4 + 3] > 140) {
          xs.push(x);
          ys.push(y);
        }
      }
    }
    if (!xs.length) return ring(n);
    const best = new Float32Array(xs.length).fill(Infinity);
    const picked = [];
    let cur = Math.floor(xs.length / 2);
    for (let i = 0; i < n; i++) {
      picked.push(cur);
      let far = cur;
      let farD = -1;
      for (let j = 0; j < xs.length; j++) {
        const d = (xs[j] - xs[cur]) ** 2 + (ys[j] - ys[cur]) ** 2;
        if (d < best[j]) best[j] = d;
        if (best[j] > farD) {
          farD = best[j];
          far = j;
        }
      }
      cur = far;
    }
    const px = picked.map((j) => xs[j]);
    const py = picked.map((j) => ys[j]);
    const minX = Math.min(...px);
    const maxX = Math.max(...px);
    const minY = Math.min(...py);
    const maxY = Math.max(...py);
    const unit = 1 / (maxY - minY || 1);
    return picked.map((_, i) => ({
      x: (px[i] - (minX + maxX) / 2) * unit,
      y: (py[i] - (minY + maxY) / 2) * unit,
      z: 0,
      u: (px[i] - minX) / (maxX - minX || 1),
    }));
  }

  /** A lotus (the national flower) in 3D: three rings of petals around a golden heart. */
  function lotusPoints(n) {
    const pts = [];
    const rings = [
      { petals: 8, len: 0.62, open: 1.05, lift: 0.1, share: 0.46, turn: 0 },
      { petals: 8, len: 0.55, open: 0.62, lift: 0.18, share: 0.36, turn: TAU / 16 },
      { petals: 5, len: 0.4, open: 0.25, lift: 0.26, share: 0.18, turn: 0 },
    ];
    rings.forEach((r) => {
      const per = Math.max(6, Math.floor(((n - 14) * r.share) / r.petals)); // ~14 left for the heart
      for (let p = 0; p < r.petals; p++) {
        const phi = (p / r.petals) * TAU + r.turn;
        for (let i = 0; i < per; i++) {
          const s = i / (per - 1); // along the outline: up one edge to the tip, down the other
          const along = s < 0.5 ? s * 2 : (1 - s) * 2;
          const side = (s < 0.5 ? -1 : 1) * Math.sin(Math.PI * along) * 0.18 * r.len;
          const radial = along * r.len * Math.sin(r.open);
          const up = along * r.len * Math.cos(r.open) + r.lift * along;
          pts.push({
            x: Math.cos(phi) * radial - Math.sin(phi) * side,
            z: Math.sin(phi) * radial + Math.cos(phi) * side,
            y: 0.15 - up,
            u: along, // 0 at the base (deep pink) .. 1 at the tip (pale)
          });
        }
      }
    });
    while (pts.length < n) {
      const a = rand(0, TAU);
      const r = Math.sqrt(Math.random()) * 0.1;
      pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.13, u: -1 }); // golden seed head
    }
    return pts.slice(0, n);
  }

  /** The national flag, 3:2, as a grid of drones: red, with the gold star. */
  function flagPoints(n) {
    const cols = Math.round(Math.sqrt(n * 1.5));
    const rows = Math.floor(n / cols);
    const star = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.3 * 0.382 : 0.3; // outer radius: a fifth of the flag's length
      const a = (i / 10) * TAU - Math.PI / 2;
      star.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const inStar = (x, y) => {
      let inside = false;
      for (let i = 0, j = star.length - 1; i < star.length; j = i++) {
        const [xi, yi] = star[i];
        const [xj, yj] = star[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };
    const pts = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) - 0.5) * 1.5;
        const y = r / (rows - 1) - 0.5;
        pts.push({ x, y, z: 0, u: c / (cols - 1), star: inStar(x, y) });
      }
    }
    while (pts.length < n) pts.push({ ...pts[pts.length % (cols * rows)] });
    return pts;
  }

  /** Can Chi name of a lunar year (2026: Bính Ngọ, 2027: Đinh Mùi). */
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  fx.canChi = (year) => `${CAN[(year + 6) % 10]} ${CHI[(year + 8) % 12]}`;

  /**
   * A formation from its spec:
   * - { figure: 'heart' | 'star' | 'cursor' | 'bridge' | <text> }: flat, sampled from a drawing;
   * - { lotus: true }: 3D, turning slowly; { flag: true }: the flag, waving.
   */
  function formation(spec, n) {
    if (spec.lotus) return { points: lotusPoints(n), turn: 0.00022, ...spec };
    if (spec.flag) return { points: flagPoints(n), wave: true, ...spec };
    const draw = FIGURES[spec.figure] || FIGURES.text(spec.figure);
    return { points: figurePoints(draw, n), ...spec };
  }

  /** Colour of the drone on point p (i: its index, t: time) for each colourway. */
  const COLORWAYS = {
    white: () => [236, 242, 255],
    gold: () => [255, 214, 120],
    pink: () => [255, 92, 138],
    cursor: (p, i, t, colors) =>
      i % 6 ? [236, 242, 255] : fx.hex(colors[Math.floor(i / 6) % colors.length]),
    /** A gradient sweeping across the figure, cyan to violet. */
    sweep: (p, i, t) => fx.mix([120, 224, 255], [196, 140, 255], 0.5 + 0.5 * Math.sin(p.u * 3 - t * 0.0012)),
    flag: (p) => (p.star ? [255, 214, 60] : [235, 40, 40]),
    /** Mai: golden petals, an orange heart. */
    mai: (p) => (Math.hypot(p.x, p.y) < 0.14 ? [255, 140, 40] : [255, 206, 60]),
    lotus: (p) => (p.u < 0 ? [255, 200, 80] : fx.mix([236, 72, 140], [255, 230, 240], p.u ** 1.4)),
    tet: (p, i) => (i % 5 ? [255, 70, 60] : [255, 214, 90]),
  };

  /**
   * A drone show: the drones take off from the far bank, gather in a grid, then fly from
   * figure to figure. Each figure builds out from its centre (the drones nearest the
   * middle move first), every drone taking the nearest free place, easing in and out
   * along a slight arc; colours change in a sweep. 3D figures turn slowly in perspective.
   * @param {object} stage
   * @param {{figure?: string, lotus?: boolean, flag?: boolean, colors?: string}[]} specs
   * @param {{count?: number, hold?: number}} [o]
   */
  function droneShow(stage, specs, o = {}) {
    const { W, H } = stage;
    const scale = H / 1080;
    const N = o.count || 220;
    const forms = specs.map((spec) => formation(spec, N));
    const cx = rand(0.32, 0.5) * W;
    const cy = H * 0.3;
    const size = H * 0.26;
    const LAUNCH = 6500;
    const HOLD = o.hold || 9500;
    const MORPH = 3400;
    const LAND = 7000;
    const DURATION = LAUNCH + forms.length * HOLD + LAND;
    const glow = fx.glowSprite([255, 255, 255], 24);
    const cols = 20;
    const rows = Math.ceil(N / cols);
    const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

    const drones = Array.from({ length: N }, (_, i) => {
      const home = { x: cx + (i / N - 0.5) * W * 0.32, y: stage.rooftop };
      return {
        x: home.x,
        y: home.y,
        home,
        grid: {
          x: cx + ((i % cols) - (cols - 1) / 2) * 15 * scale,
          y: cy + (Math.floor(i / cols) - (rows - 1) / 2) * 15 * scale,
        },
        from: home,
        slot: 0,
        color: [255, 255, 255],
        fromColor: [255, 255, 255],
        delay: 0,
        lift: 0,
        phase: rand(0, TAU),
        depth: 1,
      };
    });

    /** Where point p of a form is on screen at time t (3D figures turn, the flag waves). */
    const project = (form, p, t) => {
      let { x, y, z } = p;
      if (form.wave) {
        const w = x + 0.75;
        y += Math.sin(w * 3.2 - t * 0.0026) * 0.035 * w;
        z = Math.sin(w * 2.6 - t * 0.0026) * 0.12 * w;
      }
      if (form.turn) {
        const a = t * form.turn;
        const rx = x * Math.cos(a) + z * Math.sin(a);
        z = -x * Math.sin(a) + z * Math.cos(a);
        x = rx;
      }
      const persp = 2.4 / (2.4 + z); // closer: bigger and brighter
      return { x: cx + x * size * persp, y: cy + y * size * persp, depth: persp };
    };

    /** Each drone takes the nearest free place, those nearest the centre choosing first. */
    const assign = (form, t) => {
      const targets = form.points.map((p) => project(form, p, t));
      const taken = new Uint8Array(targets.length);
      const order = drones
        .map((d, i) => [i, (d.x - cx) ** 2 + (d.y - cy) ** 2])
        .sort((a, b) => a[1] - b[1])
        .map(([i]) => i);
      order.forEach((di) => {
        const d = drones[di];
        let best = 0;
        let bestD = Infinity;
        for (let j = 0; j < targets.length; j++) {
          if (taken[j]) continue;
          const dist = (targets[j].x - d.x) ** 2 + (targets[j].y - d.y) ** 2;
          if (dist < bestD) {
            bestD = dist;
            best = j;
          }
        }
        taken[best] = 1;
        d.slot = best;
        const tgt = targets[best];
        // Build out from the centre: the middle of the figure lights up first.
        d.delay = Math.min(900, (Math.hypot(tgt.x - cx, tgt.y - cy) / size) * 700);
        d.lift = rand(-0.06, 0.06) * size; // a slight arc, so paths do not look ruled
      });
    };

    let segment = -1;
    let segmentStart = 0;
    let t = 0;
    return {
      bloom: 0.55,
      update(_k, elapsed) {
        t = elapsed;
        const seg = t < LAUNCH ? 0 : Math.min(forms.length + 1, 1 + Math.floor((t - LAUNCH) / HOLD));
        if (seg !== segment) {
          segment = seg;
          segmentStart = seg === 0 ? 0 : LAUNCH + (seg - 1) * HOLD;
          drones.forEach((d) => {
            d.from = { x: d.x, y: d.y };
            d.fromColor = d.color;
            d.delay = rand(0, 800);
            d.lift = 0;
          });
          if (seg >= 1 && seg <= forms.length) assign(forms[seg - 1], t + MORPH);
        }
        const form = segment >= 1 && segment <= forms.length ? forms[segment - 1] : null;
        const span = segment === 0 ? LAUNCH - 900 : segment > forms.length ? LAND - 1500 : MORPH;
        drones.forEach((d, i) => {
          const u = easeInOut(clamp01((t - segmentStart - d.delay) / span));
          let to;
          let toColor;
          d.depth = 1;
          if (segment === 0) {
            to = d.grid;
            toColor = [236, 240, 255];
          } else if (!form) {
            to = d.home;
            toColor = [255, 255, 255];
          } else {
            const p = form.points[d.slot];
            to = project(form, p, t);
            d.depth = 1 + (to.depth - 1) * u;
            toColor = COLORWAYS[form.colors || 'white'](p, i, t, stage.colors);
          }
          const arc = Math.sin(Math.PI * u) * d.lift;
          d.x = d.from.x + (to.x - d.from.x) * u + arc;
          d.y = d.from.y + (to.y - d.from.y) * u - Math.abs(arc) * 0.5;
          // Colours change in a sweep across the figure, a little after the move starts.
          const cu = smooth((t - segmentStart - d.delay - 300 - (d.x / W) * 600) / 900);
          d.color = fx.mix(d.fromColor, toColor, cu);
        });
        return t < DURATION;
      },
      back(ctx) {
        const a = envelope(t, DURATION, 1500, 1800);
        const r = 9 * scale;
        ctx.globalCompositeOperation = 'lighter';
        drones.forEach((d) => {
          const y = d.y + Math.sin(t * 0.002 + d.phase) * 1.2 * scale; // hovering
          const k = d.depth; // nearer drones read bigger and brighter
          const dot = 2.6 * Math.max(1, scale) * k;
          ctx.globalAlpha = a * 0.38 * Math.min(1.3, k);
          ctx.drawImage(glow, d.x - r * k, y - r * k, r * 2 * k, r * 2 * k);
          ctx.globalAlpha = a * Math.min(1, 0.55 + 0.45 * k);
          ctx.fillStyle = `rgb(${d.color[0] | 0}, ${d.color[1] | 0}, ${d.color[2] | 0})`;
          ctx.fillRect(d.x - dot / 2, y - dot / 2, dot, dot);
        });
      },
    };
  }

  fx.droneShow = droneShow;

  fx.register({
    name: 'drones',
    label: 'Drone show trên sông Sài Gòn',
    place: 'Bến Bạch Đằng · Thủ Thiêm',
    group: 'night',
    spectacle: true,
    when: (look) => look.dark > 0.7,
    create: (stage) =>
      droneShow(stage, [
        pick([
          { figure: 'heart', colors: 'pink' },
          { lotus: true, colors: 'lotus' },
        ]),
        { figure: 'bridge', colors: 'sweep' },
        { figure: 'cursor', colors: 'cursor' },
        { figure: pick(['XIN CHÀO', 'SÀI GÒN', '</>']), colors: 'sweep' },
      ]),
  });

  /* ---------- Landmark 81's LED façade ---------- */

  /**
   * Row programs of the façade: (v, local, colors) → [colour, level] for the LED row at
   * height v (0 base .. 1 top), `local` ms into the program.
   */
  const PROGRAMS = {
    rainbow: (v, local) => [`hsl(${(v * 300 - local * 0.08 + 720) % 360}, 90%, 62%)`, 1],
    pulse: (v, local, colors) => [
      colors[Math.floor(local / 1500) % colors.length],
      0.45 + 0.55 * (0.5 + 0.5 * Math.sin(local * 0.004)),
    ],
    scan: (v, local) => {
      const centre = 0.5 - 0.5 * Math.cos(local * 0.0011);
      return ['rgb(170, 235, 255)', 0.12 + Math.exp(-(((v - centre) / 0.08) ** 2))];
    },
    sparkle: () => ['rgb(255, 214, 140)', Math.random() < 0.22 ? 1 : 0.12],
    rise: (v, local) => {
      // The tower fills up with light from the ground, again and again.
      const level = (local % 3500) / 3500;
      if (v > level) return ['rgb(40, 90, 200)', 0.15];
      return [v > level - 0.04 ? 'rgb(235, 250, 255)' : `hsl(${190 + v * 60}, 85%, 58%)`, 1];
    },
    /** Tết: red and gold bands climbing the tower. */
    tet: (v, local) => [Math.sin(v * 14 - local * 0.004) > 0 ? '#ffcf4a' : '#e8241f', 0.95],
    /** Programmer's Day: green code running down the façade, a bright head on each column. */
    code: (v, local) => {
      const head = 1 - ((local * 0.00035 + Math.sin(v * 91) * 0.5) % 1);
      const d = v - head;
      return d >= 0 && d < 0.18 ? [d < 0.015 ? '#d9ffe4' : '#22c55e', 1 - d / 0.18] : ['#052e16', 0.4];
    },
    /** Noel: warm white lights twinkling on a deep green tower, a gold star on the crown. */
    noel: (v) => (v > 0.94 ? ['#ffd96a', 1] : Math.random() < 0.12 ? ['#fff4dc', 1] : ['#0e6b3a', 0.55]),
  };

  /** Writes text across the tower, one line under the other, centred at height v (fits the width). */
  function towerText(ctx, stage, lines, v, color, alpha) {
    const L = stage.landmark;
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min(L.w * 0.8, (L.w * 0.92) / (0.62 * longest));
    ctx.font = `600 ${size}px raleway, poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    lines.forEach((line, i) => {
      const y = stage.ground - L.h * v + (i - (lines.length - 1) / 2) * size * 1.05;
      ctx.fillText(line, L.x, y);
    });
  }

  /**
   * Landmark 81 lights its façade: a run of programs, each with a short blackout
   * between. Programs drawing the whole tower: 'flag' (red with the gold star, for 30/4
   * and 2/9), 'countdown' (the last seconds to midnight), 'year' (the new year's name).
   * @param {object} stage
   * @param {string[]} programs
   * @param {{segment?: number, endsAt?: number, year?: string}} [o] `endsAt`: one program until then.
   */
  function landmarkShow(stage, programs, o = {}) {
    const L = stage.landmark;
    const top = L.top;
    const left = L.x - L.w / 2;
    const SEGMENT = o.segment || 10000;
    const DURATION = o.endsAt ? Math.max(3000, o.endsAt - Date.now()) : programs.length * SEGMENT;
    const colors = stage.colors;
    const glow = fx.glowSprite([255, 120, 90], 48);
    let t = 0;

    const rows = (ctx, fn, local, a) => {
      for (let y = top; y < stage.ground; y += 3) {
        const [color, level] = fn((stage.ground - y) / L.h, local, colors);
        ctx.globalAlpha = 0.8 * a * Math.min(1, level);
        ctx.fillStyle = color;
        ctx.fillRect(left, y, L.w, 2); // LED strips, with a dark gap between floors
      }
    };

    const whole = {
      flag(ctx, local, a) {
        rows(ctx, () => ['#e3201b', 0.95], local, a);
        // The gold star on the upper tower, gently breathing.
        const cy = stage.ground - L.h * 0.62;
        const r = L.w * 0.42;
        ctx.globalAlpha = a * (0.85 + 0.15 * Math.sin(local * 0.003));
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? r * 0.382 : r;
          const ang = (i / 10) * TAU - Math.PI / 2;
          ctx.lineTo(L.x + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
        }
        ctx.fill();
      },
      countdown(ctx, local, a) {
        const left10 = Math.ceil(((o.endsAt || Date.now() + 10000) - Date.now()) / 1000);
        rows(ctx, (v) => ['#14213d', 0.35 + 0.1 * Math.sin(v * 30 - local * 0.01)], local, a);
        if (left10 <= 10 && left10 > 0) {
          const pop = 1 - ((Date.now() % 1000) / 1000) ** 2; // each second lands, then fades
          towerText(ctx, stage, [String(left10)], 0.62, '#fff6dc', a * pop);
        } else {
          towerText(ctx, stage, (o.year || '').split(' '), 0.62, '#ffd23f', a * 0.9);
        }
      },
      year(ctx, local, a) {
        rows(ctx, PROGRAMS.tet, local, a * 0.55);
        towerText(ctx, stage, (o.year || '').split(' '), 0.62, '#fff6dc', a);
      },
    };

    return {
      mirror: true,
      bloom: 0.35,
      update(_k, elapsed) {
        t = elapsed;
        return t < DURATION;
      },
      front(ctx) {
        const seg = o.endsAt ? 0 : Math.min(programs.length - 1, Math.floor(t / SEGMENT));
        const local = o.endsAt ? t : t - seg * SEGMENT;
        // Fades in and out as a whole, with a short blackout between two programs.
        const cutIn = seg > 0 ? clamp01(local / 300) : 1;
        const cutOut = !o.endsAt && seg < programs.length - 1 ? clamp01((SEGMENT - local) / 300) : 1;
        const a = envelope(t, DURATION, 2500, o.endsAt ? 300 : 2500) * cutIn * cutOut;
        if (a <= 0) return;
        ctx.save();
        stage.traceLandmark(ctx);
        ctx.clip();
        const name = programs[seg];
        if (whole[name]) whole[name](ctx, local, a);
        else rows(ctx, PROGRAMS[name], local, a);
        ctx.restore();
        // The façade throws its light on the haze around the crown.
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.12 * a;
        const r = L.w * 2.2;
        ctx.drawImage(glow, L.x - r, top + L.h * 0.15 - r, r * 2, r * 2);
      },
    };
  }

  fx.landmarkShow = landmarkShow;

  fx.register({
    name: 'landmark',
    label: 'Landmark 81 trình diễn ánh sáng',
    place: 'Bình Thạnh',
    group: 'night',
    spectacle: true,
    when: (look) => look.dark > 0.55,
    create: (stage) =>
      landmarkShow(stage, fx.shuffle(['rainbow', 'pulse', 'scan', 'sparkle', 'rise']).slice(0, 4)),
  });

  /* ---------- Laser show from Landmark 81's crown ---------- */

  fx.register({
    name: 'lasers',
    label: 'Laser show',
    place: 'Landmark 81',
    group: 'night',
    spectacle: true,
    rarity: 'uncommon',
    when: (look) => look.dark > 0.6,
    create(stage) {
      const { H } = stage;
      const L = stage.landmark;
      const ox = L.x;
      const oy = L.top + L.h * 0.1;
      const len = H * 1.3;
      const COUNT = 8;
      const SEGMENT = 8000;
      const programs = fx.shuffle(['fan', 'scissor', 'strobe', 'tunnel']);
      const DURATION = programs.length * SEGMENT;
      const palette = fx.shuffle([
        [80, 255, 120],
        [90, 220, 255],
        [255, 80, 200],
        [180, 120, 255],
      ]);
      const glows = palette.map((c) => fx.glowSprite(c, 32));
      /** Angle of beam i from the vertical, for a program at local time u (ms). */
      const angle = (program, i, u) => {
        const s = (i / (COUNT - 1)) * 2 - 1; // -1..1 across the fan
        switch (program) {
          case 'fan':
            return s * 0.85 + Math.sin(u * 0.0012) * 0.45;
          case 'scissor':
            return (
              (i % 2 ? 1 : -1) * (0.1 + 0.9 * (0.5 + 0.5 * Math.sin(u * 0.0016))) * (0.5 + 0.5 * Math.abs(s))
            );
          case 'strobe':
            return s * 1.1 + Math.sin(Math.floor(u / 180) * 12.9898 + i) * 0.3;
          default:
            return Math.sin(u * 0.0009 + (i * TAU) / COUNT) * 1.1; // tunnel: beams rolling around
        }
      };
      let t = 0;
      return {
        mirror: true,
        bloom: 0.5,
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const seg = Math.min(programs.length - 1, Math.floor(t / SEGMENT));
          const u = t - seg * SEGMENT;
          const program = programs[seg];
          const rgb = palette[seg % palette.length].join(', ');
          let a = envelope(t, DURATION, 1500, 2000);
          if (program === 'strobe') a *= Math.floor(u / 90) % 2 ? 0.25 : 1;
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          for (let i = 0; i < COUNT; i++) {
            const ang = angle(program, i, u) - Math.PI / 2;
            const ex = ox + Math.cos(ang) * len;
            const ey = oy + Math.sin(ang) * len;
            // Visible in the haze, fading with distance.
            const g = ctx.createLinearGradient(ox, oy, ex, ey);
            g.addColorStop(0, `rgba(${rgb}, ${0.65 * a})`);
            g.addColorStop(0.6, `rgba(${rgb}, ${0.12 * a})`);
            g.addColorStop(1, `rgba(${rgb}, 0)`);
            ctx.strokeStyle = g;
            [6, 1.2].forEach((width, pass) => {
              ctx.globalAlpha = pass ? 1 : 0.18;
              ctx.lineWidth = width;
              ctx.beginPath();
              ctx.moveTo(ox, oy);
              ctx.lineTo(ex, ey);
              ctx.stroke();
            });
          }
          ctx.globalAlpha = a;
          const r = H * 0.03;
          ctx.drawImage(glows[seg % glows.length], ox - r, oy - r, r * 2, r * 2);
        },
      };
    },
  });

  /* ---------- Searchlights ---------- */

  fx.register({
    name: 'searchlights',
    label: 'Đèn pha quét trời',
    group: 'night',
    spectacle: true,
    weight: 0.7,
    when: (look) => look.dark > 0.6,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 36000;
      const count = pick([2, 3, 3, 4]);
      const origin = rand(0.25, 0.75) * W;
      const len = H * 1.15;
      const beams = Array.from({ length: count }, (_, i) => ({
        x: origin + (i - (count - 1) / 2) * rand(0.04, 0.08) * W,
        base: rand(-0.35, 0.35),
        amp: rand(0.25, 0.45),
        speed: rand(0.00025, 0.0005),
        phase: rand(0, TAU),
        spread: H * rand(0.04, 0.06),
      }));
      let gradient = null;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          if (!gradient) {
            // In beam space (each beam points up the -y axis), so one gradient serves all of them.
            gradient = ctx.createLinearGradient(0, 0, 0, -len);
            gradient.addColorStop(0, 'rgba(225, 232, 255, 0.24)');
            gradient.addColorStop(0.5, 'rgba(225, 232, 255, 0.07)');
            gradient.addColorStop(1, 'rgba(225, 232, 255, 0)');
          }
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = envelope(t, DURATION, 3000, 3000);
          ctx.fillStyle = gradient;
          beams.forEach((b) => {
            ctx.save();
            ctx.translate(b.x, stage.rooftop);
            ctx.rotate(b.base + Math.sin(t * b.speed + b.phase) * b.amp);
            ctx.beginPath();
            ctx.moveTo(-2, 0);
            ctx.lineTo(2, 0);
            ctx.lineTo(b.spread, -len);
            ctx.lineTo(-b.spread, -len);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          });
        },
      };
    },
  });

  /* ---------- Dinner cruises on the river ---------- */

  /**
   * Every night the restaurant boats leave Bến Bạch Đằng for a slow loop on the river,
   * strung with coloured lights that stretch into long reflections.
   */
  fx.register({
    name: 'cruise',
    label: 'Tàu nhà hàng trên sông Sài Gòn',
    place: 'Bến Bạch Đằng',
    group: 'night',
    tier: 'detail',
    when: (look, stage) => look.dark > 0.55 && !!stage.river,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = stage.river.top + stage.river.h * rand(0.2, 0.38);
      const len = rand(110, 160) * scale;
      const speed = rand(0.35, 0.55) * scale * dir;
      const bulbs = Array.from({ length: 26 }, (_, i) => ({
        u: i / 25,
        color: pick(['255, 90, 120', '120, 200, 255', '255, 214, 120', '180, 120, 255', '255, 255, 255']),
        phase: rand(0, TAU),
        streak: rand(10, 26) * scale,
      }));
      let x = dir > 0 ? -len : W + len;
      let t = 0;
      return {
        mirror: true,
        update(k, elapsed) {
          t = elapsed;
          x += speed * k;
          return dir > 0 ? x < W + len : x > -len;
        },
        front(ctx) {
          const hull = 10 * scale;
          // Two decks, dark against the water, cabin windows lit warm.
          ctx.fillStyle = 'rgba(8, 10, 16, 0.92)';
          ctx.fillRect(x - len / 2, y - hull, len, hull);
          ctx.fillRect(x - len * 0.36, y - hull * 1.9, len * 0.72, hull * 0.9);
          ctx.fillStyle = 'rgba(255, 210, 150, 0.85)';
          for (let i = 0; i < 14; i++) {
            ctx.fillRect(x - len * 0.42 + i * len * 0.06, y - hull * 0.7, len * 0.03, hull * 0.3);
          }
          // Strings of coloured bulbs along the railings, chasing; their broken streaks on the water.
          ctx.globalCompositeOperation = 'lighter';
          bulbs.forEach((b) => {
            const on = 0.55 + 0.45 * Math.sin(t * 0.004 + b.u * 12 + b.phase);
            const bx = x - len * 0.38 + b.u * len * 0.76;
            ctx.fillStyle = `rgba(${b.color}, ${on})`;
            ctx.fillRect(bx, y - hull * 2.05, 2 * scale, 2 * scale);
            ctx.fillStyle = `rgba(${b.color}, ${0.3 * on})`;
            const wobble = Math.sin(t * 0.006 + b.phase) * 1.5 * scale;
            ctx.fillRect(bx + wobble, y + 2 * scale, 1.5 * scale, b.streak);
          });
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
