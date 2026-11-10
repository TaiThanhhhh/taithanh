/**
 * @file Ambient surprises in the sky itself (registered with ambient-events.js):
 * a meteor shower and single shooting stars, a satellite pass, a comet, a total
 * lunar eclipse, a 22° halo around the moon, a halo with sun dogs around the
 * sun, and sun rays through the haze.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, envelope, smooth, clamp01 } = fx;
  const FRAME_MS = Portfolio.motion.FRAME_MS;

  /* ---------- Meteors ---------- */

  /**
   * @param {number} at Start time (ms into the event).
   * @param {number} side Which way the radiant lies (all meteors of a shower share it).
   */
  function makeMeteor(stage, at, side) {
    const { W, H } = stage;
    const scale = H / 1080;
    const bolide = Math.random() < 0.12; // now and then a bright, slow, greenish fireball
    const angle = rand(0.45, 0.8);
    const speed = rand(13, 20) * scale * (bolide ? 0.7 : 1);
    return {
      at,
      x: rand(0.1, 0.9) * W,
      y: rand(0.02, 0.4) * H,
      vx: Math.cos(angle) * speed * -side,
      vy: Math.sin(angle) * speed,
      life: bolide ? rand(75, 95) : rand(30, 55),
      len: speed * (bolide ? 18 : 11),
      width: (bolide ? 3 : 1.7) * Math.max(1, scale),
      color: bolide ? '200, 255, 215' : '230, 240, 255',
    };
  }

  function drawMeteor(ctx, m, t, head) {
    const age = (t - m.at) / FRAME_MS; // in 60fps frames
    if (age < 0 || age > m.life) return;
    const hx = m.x + m.vx * age;
    const hy = m.y + m.vy * age;
    const v = Math.hypot(m.vx, m.vy);
    const tail = m.len * Math.min(1, age / 10);
    const tx = hx - (m.vx / v) * tail;
    const ty = hy - (m.vy / v) * tail;
    const a = Math.sin((Math.PI * age) / m.life) ** 0.7;
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, `rgba(${m.color}, ${a})`);
    g.addColorStop(1, `rgba(${m.color}, 0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = m.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.globalAlpha = a * 0.8;
    const r = m.width * 4;
    ctx.drawImage(head, hx - r, hy - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  fx.register({
    name: 'meteors',
    group: 'sky',
    label: 'Mưa sao băng',
    // The real showers (Leonids, Geminids, Perseids...) around their peak nights.
    boost: (cal) => (cal.has('meteorshower') ? 8 : 0.35),
    caption: (cal) => {
      const shower = cal.occasions.find((o) => o.id === 'meteorshower');
      return shower ? { title: shower.name, place: 'Đêm cực đại' } : null;
    },
    when: (look) => look.dark > 0.85,
    create(stage) {
      const DURATION = 26000;
      const head = fx.glowSprite([235, 242, 255], 24);
      const side = Math.random() < 0.5 ? 1 : -1;
      const meteors = [];
      for (let at = rand(300, 1500); at < DURATION - 3000; at += rand(700, 3000)) {
        meteors.push(makeMeteor(stage, at, side));
      }
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          meteors.forEach((m) => drawMeteor(ctx, m, t, head));
        },
      };
    },
  });

  fx.register({
    name: 'shootingstar',
    group: 'sky',
    label: 'Sao băng',
    tier: 'detail',
    boost: (cal) => (cal.has('meteorshower') ? 2.5 : 1),
    when: (look) => look.dark > 0.7,
    create(stage) {
      const head = fx.glowSprite([235, 242, 255], 24);
      const m = makeMeteor(stage, 0, Math.random() < 0.5 ? 1 : -1);
      const DURATION = m.life * FRAME_MS + 100;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          drawMeteor(ctx, m, t, head);
        },
      };
    },
  });

  /* ---------- A satellite pass, or a Starlink train ---------- */

  fx.register({
    name: 'satellite',
    group: 'sky',
    label: 'Vệ tinh bay qua',
    tier: 'detail',
    when: (look) => look.dark > 0.75,
    create(stage) {
      const { W, H } = stage;
      const train = Math.random() < 0.4;
      const CROSS = train ? 46000 : 40000;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y0 = rand(0.08, 0.35) * H;
      const drop = rand(-0.12, 0.12) * H;
      const count = train ? Math.round(rand(14, 22)) : 1;
      const gap = rand(11, 15) / (W * 1.1); // spacing along the path
      const fadeAt = train ? 2 : rand(0.6, 0.85); // the ISS goes dark mid-sky as it enters Earth's shadow
      const dot = fx.glowSprite([235, 240, 255], 16);
      const DURATION = CROSS * (1 + count * gap); // until the last one of the train is gone
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          for (let i = 0; i < count; i++) {
            const p = t / CROSS - i * gap;
            if (p < 0 || p > 1) continue;
            const x = dir > 0 ? (p * 1.1 - 0.05) * W : (1.05 - p * 1.1) * W;
            const y = y0 + drop * p;
            const a =
              (train ? 0.7 : 1) *
              smooth(p / 0.12) *
              (1 - smooth((p - fadeAt) / 0.06)) *
              (1 - smooth((p - 0.9) / 0.1));
            if (a <= 0.01) continue;
            ctx.globalAlpha = a;
            ctx.drawImage(dot, x - 4, y - 4, 8, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
          }
        },
      };
    },
  });

  /* ---------- A comet ---------- */

  /** Coma and tails, painted once pointing left: a curved yellowish dust tail and a straight blue ion tail. */
  function cometSprite(length) {
    const h = length * 0.36;
    return fx.sprite(length, h, (ctx, w) => {
      const y = h / 2;
      const head = w * 0.97;
      ctx.globalCompositeOperation = 'lighter';
      // Dust tail: wide, curving away, warm white.
      const dust = ctx.createLinearGradient(head, 0, 0, 0);
      dust.addColorStop(0, 'rgba(255, 240, 210, 0.5)');
      dust.addColorStop(0.5, 'rgba(255, 232, 200, 0.14)');
      dust.addColorStop(1, 'rgba(255, 232, 200, 0)');
      ctx.fillStyle = dust;
      ctx.filter = `blur(${Math.max(1, h * 0.03)}px)`;
      ctx.beginPath();
      ctx.moveTo(head, y);
      ctx.quadraticCurveTo(w * 0.5, y - h * 0.05, w * 0.05, y - h * 0.42);
      ctx.lineTo(w * 0.02, y - h * 0.08);
      ctx.quadraticCurveTo(w * 0.5, y + h * 0.06, head, y + 1);
      ctx.fill();
      // Ion tail: narrow, straight, blue.
      const ion = ctx.createLinearGradient(head, 0, 0, 0);
      ion.addColorStop(0, 'rgba(150, 200, 255, 0.45)');
      ion.addColorStop(1, 'rgba(150, 200, 255, 0)');
      ctx.fillStyle = ion;
      ctx.beginPath();
      ctx.moveTo(head, y - 1);
      ctx.lineTo(0, y - h * 0.03);
      ctx.lineTo(0, y + h * 0.05);
      ctx.lineTo(head, y + 1);
      ctx.fill();
      ctx.filter = 'none';
      // Coma: a bright core in a greenish glow.
      const coma = ctx.createRadialGradient(head, y, 0, head, y, h * 0.12);
      coma.addColorStop(0, 'rgba(240, 255, 245, 1)');
      coma.addColorStop(0.15, 'rgba(200, 255, 220, 0.7)');
      coma.addColorStop(1, 'rgba(160, 255, 200, 0)');
      ctx.fillStyle = coma;
      ctx.fillRect(head - h * 0.12, y - h * 0.12, h * 0.24, h * 0.24);
    });
  }

  fx.register({
    name: 'comet',
    group: 'sky',
    label: 'Sao chổi',
    rarity: 'rare',
    when: (look) => look.dark > 0.8,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 90000;
      const length = H * 0.56;
      const sprite = cometSprite(length);
      const x = rand(0.25, 0.75) * W;
      const y = rand(0.14, 0.32) * H;
      // The tail points away from the sun, which is below the horizon: upwards, leaning.
      const angle = -Math.PI / 2 + rand(0.35, 0.8) * (Math.random() < 0.5 ? 1 : -1);
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          ctx.globalAlpha = envelope(t, DURATION, 10000, 12000);
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(x + (t / DURATION) * H * 0.012, y); // drifting, barely
          ctx.rotate(angle + Math.PI); // the sprite's tail points left; turn it to `angle`
          ctx.drawImage(sprite, -sprite.width * 0.97, -sprite.height / 2);
        },
      };
    },
  });

  /* ---------- Total lunar eclipse ("blood moon") ---------- */

  fx.register({
    name: 'eclipse',
    group: 'sky',
    label: 'Nguyệt thực toàn phần',
    rarity: 'rare',
    // Only at full moon, as in the sky.
    when: (look, stage) => !!look.moon && look.moon.alpha > 0.7 && look.moon.y < 0.8 && stage.moonDisc().full,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 100000;
      let t = 0;
      let depth = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        end() {
          stage.setMoonFilter('');
        },
        back(ctx) {
          const moon = stage.look.moon;
          if (!moon) return;
          const { r } = stage.moonDisc();
          const mx = moon.x * W;
          const my = moon.y * H;
          // The Earth's umbra (2.6 moon radii) slides across the moon; totality in the middle.
          const R = r * 2.6;
          const reach = (R + r) * 1.05;
          const ox = -reach + (2 * reach * t) / DURATION;
          const oy = r * 0.35 * (t / DURATION - 0.5);
          depth = clamp01(1 - (Math.abs(ox) - (R - r)) / (2 * r));
          // The halo dims, the disc turns copper (sunlight bent through the Earth's atmosphere).
          stage.setMoonFilter(`brightness(${(1 - 0.55 * depth).toFixed(3)})`);
          ctx.beginPath();
          ctx.arc(mx, my, r + 0.5, 0, TAU);
          ctx.clip();
          const g = ctx.createRadialGradient(mx + ox, my + oy, 0, mx + ox, my + oy, R);
          g.addColorStop(0, 'rgba(96, 26, 14, 0.94)');
          g.addColorStop(0.7, 'rgba(150, 56, 26, 0.88)');
          g.addColorStop(0.96, 'rgba(70, 30, 26, 0.8)');
          g.addColorStop(1, 'rgba(40, 30, 40, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(mx - r - 1, my - r - 1, r * 2 + 2, r * 2 + 2);
        },
      };
    },
  });

  /* ---------- 22° halos: around the moon, and around the sun with sun dogs ---------- */

  /** A faint ring, reddish on the inside (ice crystals in thin cirrus bend red the least). */
  function drawHalo(ctx, x, y, R, a, scale) {
    ctx.globalCompositeOperation = 'lighter';
    [
      [0.975, '255, 160, 140', 0.11],
      [1, '235, 238, 255', 0.13],
      [1.03, '200, 215, 255', 0.06],
    ].forEach(([k, rgb, alpha]) => {
      ctx.strokeStyle = `rgba(${rgb}, ${alpha * a})`;
      ctx.lineWidth = 7 * scale;
      ctx.beginPath();
      ctx.arc(x, y, R * k, 0, TAU);
      ctx.stroke();
    });
  }

  fx.register({
    name: 'moonhalo',
    group: 'sky',
    label: 'Quầng trăng',
    rarity: 'uncommon',
    when: (look) => !!look.moon && look.moon.alpha > 0.6 && look.moon.y < 0.72,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 70000;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const moon = stage.look.moon;
          if (moon)
            drawHalo(ctx, moon.x * W, moon.y * H, H * 0.17, envelope(t, DURATION, 8000, 10000), H / 1080);
        },
      };
    },
  });

  fx.register({
    name: 'sundogs',
    group: 'sky',
    label: 'Quầng mặt trời và mặt trời giả',
    rarity: 'rare',
    when: (look) => !!look.sun && look.sun.altitude > 0.25 && look.sun.altitude < 0.8 && look.dark < 0.2,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 65000;
      const R = H * 0.2;
      // A sun dog: red towards the sun, white then bluish away from it.
      const dog = fx.sprite(48, 96, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(255, 130, 100, 0.85)');
        g.addColorStop(0.4, 'rgba(255, 236, 200, 0.9)');
        g.addColorStop(1, 'rgba(170, 200, 255, 0)');
        ctx.fillStyle = g;
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        ctx.ellipse(w * 0.4, h / 2, w * 0.3, h * 0.38, 0, 0, TAU);
        ctx.fill();
      });
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const sun = stage.look.sun;
          if (!sun) return;
          const a = envelope(t, DURATION, 8000, 10000);
          const sx = sun.x * W;
          const sy = sun.y * H;
          drawHalo(ctx, sx, sy, R, a * 1.6, scale);
          // Upper tangent arc, touching the top of the halo.
          ctx.strokeStyle = `rgba(255, 245, 225, ${0.1 * a})`;
          ctx.lineWidth = 6 * scale;
          ctx.beginPath();
          ctx.arc(sx, sy - R + R * 0.7, R * 0.7, Math.PI * 1.3, Math.PI * 1.7);
          ctx.stroke();
          // Sun dogs, just outside the halo at the sun's height.
          const w = 26 * scale;
          const h = 52 * scale;
          ctx.globalAlpha = a * 0.95;
          [1, -1].forEach((side) => {
            ctx.save();
            ctx.translate(sx + side * R * 1.04, sy);
            ctx.scale(side, 1);
            ctx.drawImage(dog, -w * 0.4, -h / 2, w, h);
            ctx.restore();
          });
        },
      };
    },
  });

  /* ---------- Sun rays through the haze ---------- */

  fx.register({
    name: 'sunrays',
    group: 'sky',
    label: 'Tia nắng xuyên mây',
    weight: 1.1,
    when: (look) => !!look.sun && look.sun.altitude > 0.08 && look.sun.altitude < 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 50000;
      const L = Math.hypot(W, H);
      const rays = Array.from({ length: Math.round(rand(10, 15)) }, () => ({
        angle: rand(0, TAU),
        width: rand(0.012, 0.05),
        alpha: rand(0.4, 1),
        speed: rand(0.0002, 0.0005),
        phase: rand(0, TAU),
      }));
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const sun = stage.look.sun;
          if (!sun) return;
          const sx = sun.x * W;
          const sy = sun.y * H;
          const env = envelope(t, DURATION, 6000, 8000);
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, L * 0.8);
          g.addColorStop(0, 'rgba(255, 226, 170, 0.22)');
          g.addColorStop(0.35, 'rgba(255, 214, 160, 0.08)');
          g.addColorStop(1, 'rgba(255, 214, 160, 0)');
          ctx.fillStyle = g;
          ctx.globalCompositeOperation = 'lighter';
          rays.forEach((r) => {
            const a = r.angle + Math.sin(t * 0.00005 + r.phase) * 0.03; // turning very slowly
            ctx.globalAlpha = env * r.alpha * (0.6 + 0.4 * Math.sin(t * r.speed + r.phase));
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(a - r.width) * L, sy + Math.sin(a - r.width) * L);
            ctx.lineTo(sx + Math.cos(a + r.width) * L, sy + Math.sin(a + r.width) * L);
            ctx.closePath();
            ctx.fill();
          });
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
