/**
 * @file Ambient surprises over the city at night (registered with ambient-events.js):
 * fireworks (and, rarely, a grand show), sky lanterns, a drone show, Landmark 81's
 * LED show, a laser show and searchlights.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, pick, envelope, smooth, clamp01 } = fx;

  /* ---------- Fireworks over the river ---------- */

  const GRAVITY = 0.045; // px per 60fps frame, squared

  /**
   * Shell recipes, after the classic aerial shells: peony (round burst of plain stars),
   * chrysanthemum (the stars leave a trail of sparks), willow (long-burning gold stars
   * hanging and drooping), palm (a few thick comet arms on a rising trunk), ring,
   * crossette (each star splits into four) and glitter (twinkling stars).
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
  };

  /**
   * A fireworks show: shells launched from behind the skyline, a finale barrage, and
   * the flock flinching at every bang.
   * @param {object} stage
   * @param {{until: number, gap: number[], pair: number, finale: number, spread: number, kinds: string[]}} o
   */
  function fireworksShow(stage, o) {
    const { W, H } = stage;
    const scale = H / 1080;
    const colors = [...stage.colors, '#ffd27a', '#ffffff', '#ff7eb6', '#8fe3ff', '#b6ff7a'];
    const flare = fx.glowSprite([255, 236, 210], 64);
    const centre = rand(0.3, 0.62) * W; // the show stands over one stretch of the river
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

    const launch = () => {
      const apex = rand(0.14, 0.42) * H;
      rockets.push({
        kind: pick(o.kinds),
        x: centre + rand(-o.spread, o.spread) * W,
        y: stage.rooftop,
        vx: rand(-0.35, 0.35),
        vy: -Math.sqrt(2 * GRAVITY * (stage.rooftop - apex)),
      });
    };

    const MAX_EMBERS = 2500; // keeps the grand finale light on any machine
    const ember = (x, y, vx, vy, color) => {
      if (embers.length >= MAX_EMBERS) return;
      embers.push({
        x,
        y,
        vx: vx * 0.2 + rand(-0.2, 0.2),
        vy: vy * 0.2 + rand(-0.1, 0.2),
        life: 1,
        decay: 1 / rand(18, 34),
        color,
      });
    };

    const burst = (rocket) => {
      const shell = SHELLS[rocket.kind];
      const count = Math.round(rand(shell.count[0], shell.count[1]));
      const speed = rand(shell.speed[0], shell.speed[1]) * scale;
      const color = shell.color || pick(colors);
      // Two-tone shells: the stars change colour halfway through.
      const color2 = !shell.color && Math.random() < 0.35 ? pick(colors) : null;
      const tilt = rand(0, TAU);
      for (let i = 0; i < count; i++) {
        let vx;
        let vy;
        if (shell.ring) {
          // A flat ring seen at an angle: an ellipse.
          const a = (i / count) * TAU;
          const ex = Math.cos(a) * speed;
          const ey = Math.sin(a) * speed * 0.45;
          vx = ex * Math.cos(tilt) - ey * Math.sin(tilt);
          vy = ex * Math.sin(tilt) + ey * Math.cos(tilt);
        } else if (shell.trunk) {
          // Palm: a few arms, evenly spread.
          const a = (i / count) * TAU + rand(-0.15, 0.15);
          vx = Math.cos(a) * speed;
          vy = Math.sin(a) * speed;
        } else {
          // A sphere of stars seen from the side: denser towards the rim.
          const a = rand(0, TAU);
          const z = rand(-1, 1);
          const r = Math.sqrt(1 - z * z) * speed * rand(0.92, 1.04);
          vx = Math.cos(a) * r;
          vy = Math.sin(a) * r;
        }
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
          size: shell.size * Math.max(1, scale),
          split: !!shell.split,
        });
      }
      flashes.push({ x: rocket.x, y: rocket.y });
      if (stage.startle) stage.startle(rocket.x, rocket.y, H * 0.28);
    };

    return {
      trails: 0.12,
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
          if (Math.random() < (trunk ? 1 : 0.5) * k) ember(r.x, r.y, 0, 1, trunk ? '#ffd27a' : '#ffdcb0');
          if (r.vy > -0.6) {
            burst(r);
            r.done = true;
          }
        });
        fx.compact(rockets, (r) => !r.done);
        const born = [];
        sparks.forEach((p) => {
          const drag = p.shell.drag ** k;
          p.vx *= drag;
          p.vy = p.vy * drag + GRAVITY * p.shell.fall * k;
          p.x += p.vx * k;
          p.y += p.vy * k;
          p.life -= p.decay * k;
          if (p.shell.sparkle && Math.random() < p.shell.sparkle * k) ember(p.x, p.y, p.vx, p.vy, '#ffe2a8');
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
        ctx.globalCompositeOperation = 'lighter';
        let color = '';
        sparks.forEach((p) => {
          const c = p.color2 && p.life < 0.5 ? p.color2 : p.color;
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
          if (e.color !== color) {
            ctx.fillStyle = e.color;
            color = e.color;
          }
          ctx.globalAlpha = e.life * 0.8;
          ctx.fillRect(e.x - 0.7, e.y - 0.7, 1.4, 1.4);
        });
        // The flash of a burst is drawn once: the trails' fade turns it into a short glow.
        const r = H * 0.13;
        ctx.globalAlpha = 0.45;
        flashes.forEach((f) => ctx.drawImage(flare, f.x - r, f.y - r, r * 2, r * 2));
        flashes.length = 0;
      },
    };
  }

  fx.register({
    name: 'fireworks',
    label: 'Pháo hoa trên sông Sài Gòn',
    weight: 1.3,
    when: (look) => look.dark > 0.6,
    create: (stage) =>
      fireworksShow(stage, {
        until: 21000,
        gap: [700, 1700],
        pair: 0.35,
        finale: 9,
        spread: 0.2,
        kinds: [
          'peony',
          'peony',
          'chrysanthemum',
          'chrysanthemum',
          'ring',
          'willow',
          'palm',
          'crossette',
          'glitter',
        ],
      }),
  });

  fx.register({
    name: 'grandshow',
    label: 'Đêm pháo hoa lớn',
    rarity: 'rare',
    when: (look) => look.dark > 0.7,
    create: (stage) =>
      fireworksShow(stage, {
        until: 40000,
        gap: [350, 900],
        pair: 0.55,
        finale: 28,
        spread: 0.3,
        kinds: [
          'chrysanthemum',
          'chrysanthemum',
          'willow',
          'willow',
          'palm',
          'crossette',
          'ring',
          'peony',
          'glitter',
        ],
      }),
  });

  /* ---------- Sky lanterns ---------- */

  const lanternSprite = () =>
    fx.sprite(48, 48, (ctx) => {
      const halo = ctx.createRadialGradient(24, 26, 0, 24, 26, 24);
      halo.addColorStop(0, 'rgba(255, 190, 110, 0.7)');
      halo.addColorStop(0.35, 'rgba(255, 150, 70, 0.3)');
      halo.addColorStop(1, 'rgba(255, 140, 60, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 48, 48);
      // Paper body lit from inside, wider at the top, with the flame at the bottom.
      const body = ctx.createLinearGradient(0, 18, 0, 31);
      body.addColorStop(0, 'rgb(255, 214, 150)');
      body.addColorStop(1, 'rgb(255, 150, 70)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(19, 18);
      ctx.lineTo(29, 18);
      ctx.lineTo(27.5, 31);
      ctx.lineTo(20.5, 31);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 220, 0.95)';
      ctx.fillRect(22.5, 28.5, 3, 2);
    });

  fx.register({
    name: 'lanterns',
    label: 'Thả đèn trời',
    when: (look) => look.dark > 0.5,
    create(stage) {
      const sprite = lanternSprite();
      return fx.risers(stage, {
        count: Math.round(rand(14, 22)),
        releaseMs: 26000,
        duration: 75000,
        spread: 0.1,
        size: [40, 64],
        rise: [0.32, 0.55],
        sprite: () => sprite,
        flicker: 0.18,
      });
    },
  });

  /* ---------- Drone show ---------- */

  const DRONES = 160;
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

  const SHAPES = {
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

  /** Colour of the drone that takes point `i` of a shape (x: -0.5..0.5 across the shape). */
  const SCHEMES = {
    heart: () => [255, 92, 138],
    star: () => [255, 214, 120],
    cursor: (i, colors) => (i % 6 ? [236, 242, 255] : fx.hex(colors[Math.floor(i / 6) % colors.length])),
    text: (_i, _colors, x) => fx.mix([120, 224, 255], [196, 140, 255], x + 0.5),
  };

  /**
   * Draws a shape off-screen and spreads `n` points evenly over it (farthest-point
   * sampling, like the even spacing of a real drone show).
   * @returns {{points: number[][], width: number}} Points centred on 0, shape height 1.
   */
  function shapePoints(draw, n) {
    const w = 320;
    const h = 160;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
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
    if (!xs.length) {
      const ring = Array.from({ length: n }, (_, i) => [
        Math.cos((i / n) * TAU) * 0.5,
        Math.sin((i / n) * TAU) * 0.5,
      ]);
      return { points: ring, width: 1 };
    }
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
    return {
      points: picked.map((_, i) => [(px[i] - (minX + maxX) / 2) * unit, (py[i] - (minY + maxY) / 2) * unit]),
      width: (maxX - minX) * unit,
    };
  }

  fx.register({
    name: 'drones',
    label: 'Drone show',
    when: (look) => look.dark > 0.7,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const forms = [pick(['heart', 'star']), 'cursor', pick(['XIN CHÀO', 'SÀI GÒN', '</>'])].map((name) => ({
        scheme: SCHEMES[name] ? name : 'text',
        ...shapePoints(SHAPES[name] || SHAPES.text(name), DRONES),
      }));
      const cx = rand(0.3, 0.5) * W;
      const cy = H * 0.3;
      const LAUNCH = 6000;
      const HOLD = 9000;
      const MORPH = 3200;
      const LAND = 6500;
      const DURATION = LAUNCH + forms.length * HOLD + LAND;
      const glow = fx.glowSprite([255, 255, 255], 24);
      const cols = 20;
      const rows = DRONES / cols;
      // They take off from a stretch of rooftops and gather in a grid before the first figure.
      const drones = Array.from({ length: DRONES }, (_, i) => {
        const home = { x: cx + (i / DRONES - 0.5) * W * 0.3, y: stage.rooftop };
        return {
          x: home.x,
          y: home.y,
          home,
          grid: {
            x: cx + ((i % cols) - (cols - 1) / 2) * 16 * scale,
            y: cy + (Math.floor(i / cols) - (rows - 1) / 2) * 16 * scale,
          },
          from: home,
          to: home,
          color: [255, 255, 255],
          fromColor: [255, 255, 255],
          toColor: [255, 255, 255],
          delay: 0,
          phase: rand(0, TAU),
        };
      });

      /** Sends each drone to a point of the figure: sorted left to right, so paths rarely cross. */
      const assign = (form) => {
        const size = Math.min(H * 0.25, (W * 0.8) / form.width);
        const order = drones.map((_, i) => i).sort((a, b) => drones[a].x - drones[b].x);
        const slots = form.points.map((_, i) => i).sort((a, b) => form.points[a][0] - form.points[b][0]);
        order.forEach((di, rank) => {
          const [x, y] = form.points[slots[rank]];
          drones[di].to = { x: cx + x * size, y: cy + y * size };
          drones[di].toColor = SCHEMES[form.scheme](slots[rank], stage.colors, x / form.width);
        });
      };

      let segment = -1;
      let segmentStart = 0;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          const seg = t < LAUNCH ? 0 : Math.min(forms.length + 1, 1 + Math.floor((t - LAUNCH) / HOLD));
          if (seg !== segment) {
            segment = seg;
            segmentStart = seg === 0 ? 0 : LAUNCH + (seg - 1) * HOLD;
            drones.forEach((d) => {
              d.from = { x: d.x, y: d.y };
              d.fromColor = d.color;
              d.delay = rand(0, seg === 0 ? 900 : 600);
            });
            if (seg === 0) drones.forEach((d) => Object.assign(d, { to: d.grid, toColor: [236, 240, 255] }));
            else if (seg <= forms.length) assign(forms[seg - 1]);
            else drones.forEach((d) => Object.assign(d, { to: d.home, toColor: [255, 255, 255] }));
          }
          const span = segment === 0 ? LAUNCH - 900 : segment > forms.length ? LAND - 1500 : MORPH;
          drones.forEach((d) => {
            const u = smooth((t - segmentStart - d.delay) / span);
            d.x = d.from.x + (d.to.x - d.from.x) * u;
            d.y = d.from.y + (d.to.y - d.from.y) * u;
            d.color = fx.mix(d.fromColor, d.toColor, u);
          });
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 1500, 1800);
          const r = 9 * scale;
          const dot = 2.8 * Math.max(1, scale);
          ctx.globalCompositeOperation = 'lighter';
          drones.forEach((d) => {
            const y = d.y + Math.sin(t * 0.002 + d.phase) * 1.2 * scale; // hovering
            ctx.globalAlpha = a * 0.4;
            ctx.drawImage(glow, d.x - r, y - r, r * 2, r * 2);
            ctx.globalAlpha = a;
            ctx.fillStyle = `rgb(${d.color[0] | 0}, ${d.color[1] | 0}, ${d.color[2] | 0})`;
            ctx.fillRect(d.x - dot / 2, y - dot / 2, dot, dot);
          });
        },
      };
    },
  });

  /* ---------- Landmark 81 LED show ---------- */

  fx.register({
    name: 'landmark',
    label: 'Landmark 81 trình diễn ánh sáng',
    when: (look) => look.dark > 0.55,
    create(stage) {
      const { H } = stage;
      const L = stage.landmark;
      const top = H - L.h;
      const left = L.x - L.w / 2;
      const SEGMENT = 10000;
      const programs = fx.shuffle(['rainbow', 'pulse', 'scan', 'sparkle', 'rise']).slice(0, 4);
      const DURATION = programs.length * SEGMENT;
      const colors = stage.colors;
      let t = 0;

      /** Colour and brightness of the LED row at height v (0 base .. 1 top). */
      const row = (program, v, local) => {
        switch (program) {
          case 'rainbow':
            return [`hsl(${(v * 300 - local * 0.08 + 720) % 360}, 90%, 62%)`, 1];
          case 'pulse':
            return [
              colors[Math.floor(local / 1500) % colors.length],
              0.45 + 0.55 * (0.5 + 0.5 * Math.sin(local * 0.004)),
            ];
          case 'scan': {
            const centre = 0.5 - 0.5 * Math.cos(local * 0.0011);
            return ['rgb(170, 235, 255)', 0.12 + Math.exp(-(((v - centre) / 0.08) ** 2))];
          }
          case 'sparkle':
            return ['rgb(255, 214, 140)', Math.random() < 0.22 ? 1 : 0.12];
          default: {
            // 'rise': the tower fills up with light from the ground, again and again.
            const level = (local % 3500) / 3500;
            if (v > level) return ['rgb(40, 90, 200)', 0.15];
            return [v > level - 0.04 ? 'rgb(235, 250, 255)' : `hsl(${190 + v * 60}, 85%, 58%)`, 1];
          }
        }
      };

      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const seg = Math.min(programs.length - 1, Math.floor(t / SEGMENT));
          const local = t - seg * SEGMENT;
          // Fades in and out as a whole, with a short blackout between two programs.
          const cutIn = seg > 0 ? clamp01(local / 300) : 1;
          const cutOut = seg < programs.length - 1 ? clamp01((SEGMENT - local) / 300) : 1;
          const a = envelope(t, DURATION, 2500, 2500) * cutIn * cutOut;
          if (a <= 0) return;
          ctx.save();
          stage.traceLandmark(ctx);
          ctx.clip();
          for (let y = top; y < H; y += 3) {
            const [color, level] = row(programs[seg], (H - y) / L.h, local);
            ctx.globalAlpha = 0.8 * a * Math.min(1, level);
            ctx.fillStyle = color;
            ctx.fillRect(left, y, L.w, 2); // LED strips, with a dark gap between floors
          }
          ctx.restore();
        },
      };
    },
  });

  /* ---------- Laser show from Landmark 81's crown ---------- */

  fx.register({
    name: 'lasers',
    label: 'Laser show',
    when: (look) => look.dark > 0.6,
    create(stage) {
      const { H } = stage;
      const L = stage.landmark;
      const ox = L.x;
      const oy = H - L.h * 0.9;
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
})((window.Portfolio = window.Portfolio || {}));
