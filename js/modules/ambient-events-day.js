/**
 * @file Ambient surprises carried by the air (registered with ambient-events.js): hot air
 * balloons (and their burners glowing at night), kites over the rooftops, a bunch of
 * party balloons, soap bubbles, the spinning seeds of Saigon's dầu trees and
 * apricot blossoms (hoa mai) on the wind.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, pick, envelope, smooth } = fx;

  /** Two-colour schemes for balloons and kites. */
  const SCHEMES = [
    ['#e63946', '#f1faee'],
    ['#ffb703', '#fb8500'],
    ['#2a9d8f', '#e9c46a'],
    ['#8338ec', '#ffbe0b'],
    ['#06d6a0', '#118ab2'],
    ['#ef476f', '#ffd166'],
    ['#1d3557', '#f1faee'],
  ];

  /* ---------- Hot air balloons ---------- */

  /**
   * @param {string[]} colors Two colours for the gores.
   * @param {number} width
   * @param {'day'|'dark'|'lit'} [light] dark: a night silhouette; lit: the envelope glowing
   *   from the burner (drawn over the dark one, its opacity follows the flame).
   */
  function hotAirBalloon(colors, width, light = 'day') {
    const r = width / 2;
    const mouthY = width * 1.12;
    const mouth = width * 0.14;
    return fx.sprite(width, width * 1.55, (ctx) => {
      const cx = r;
      const envelopePath = () => {
        ctx.beginPath();
        ctx.moveTo(cx - mouth, mouthY);
        ctx.quadraticCurveTo(cx - r * 1.04, r * 1.25, cx - r, r);
        ctx.arc(cx, r, r, Math.PI, 0);
        ctx.quadraticCurveTo(cx + r * 1.04, r * 1.25, cx + mouth, mouthY);
        ctx.closePath();
      };
      ctx.save();
      envelopePath();
      ctx.clip();
      const gores = 6;
      for (let i = 0; i < gores; i++) {
        ctx.fillStyle = colors[i % 2];
        ctx.fillRect((i / gores) * width, 0, width / gores + 1, mouthY);
      }
      if (light === 'day') {
        // Volume: lit from the upper left, shaded on the right.
        const shade = ctx.createRadialGradient(cx - r * 0.4, r * 0.6, r * 0.1, cx, r, r * 1.5);
        shade.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        shade.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        shade.addColorStop(1, 'rgba(0, 0, 30, 0.35)');
        ctx.fillStyle = shade;
      } else if (light === 'dark') {
        ctx.fillStyle = 'rgba(10, 10, 22, 0.8)';
      } else {
        // Lit from inside by the burner: bright at the mouth, fading towards the crown.
        const glow = ctx.createRadialGradient(cx, mouthY, 0, cx, mouthY, width * 1.1);
        glow.addColorStop(0, 'rgba(255, 190, 110, 0.55)');
        glow.addColorStop(0.6, 'rgba(255, 150, 70, 0.2)');
        glow.addColorStop(1, 'rgba(255, 120, 60, 0.05)');
        ctx.fillStyle = glow;
      }
      ctx.fillRect(0, 0, width, mouthY);
      ctx.restore();
      if (light === 'lit') return;
      // Ropes and basket.
      const basketY = mouthY + width * 0.2;
      ctx.strokeStyle = light === 'dark' ? 'rgba(20, 16, 24, 0.9)' : 'rgba(60, 40, 30, 0.8)';
      ctx.lineWidth = Math.max(0.6, width * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - mouth, mouthY);
      ctx.lineTo(cx - width * 0.08, basketY);
      ctx.moveTo(cx + mouth, mouthY);
      ctx.lineTo(cx + width * 0.08, basketY);
      ctx.stroke();
      ctx.fillStyle = light === 'dark' ? '#16121a' : '#6b4a2b';
      ctx.fillRect(cx - width * 0.09, basketY, width * 0.18, width * 0.13);
    });
  }

  /** A few balloons drifting on one wind. */
  function balloonFleet(stage, night) {
    const { W, H } = stage;
    const scale = H / 1080;
    const dir = Math.random() < 0.5 ? 1 : -1;
    return Array.from({ length: Math.round(rand(3, 5)) }, () => {
      const depth = rand(0.45, 1.15);
      const colors = pick(SCHEMES);
      const width = 66 * depth * scale;
      return {
        depth,
        width,
        sprite: hotAirBalloon(colors, width, night ? 'dark' : 'day'),
        lit: night ? hotAirBalloon(colors, width, 'lit') : null,
        x: (dir > 0 ? rand(-0.15, 0.6) : rand(0.4, 1.15)) * W,
        y: rand(0.16, 0.5) * H,
        vx: dir * rand(0.18, 0.3) * depth * scale,
        phase: rand(0, TAU),
        burn: 0,
        nextBurn: rand(500, 4000),
      };
    });
  }

  fx.register({
    name: 'balloons',
    label: 'Khinh khí cầu',
    when: (look) => look.dark < 0.3,
    create(stage) {
      const DURATION = 95000;
      const balloons = balloonFleet(stage, false);
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          balloons.forEach((b) => {
            b.x += b.vx * k;
          });
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 5000, 6000);
          balloons.forEach((b) => {
            const { width, height } = b.sprite;
            ctx.globalAlpha = a * (0.6 + 0.35 * (b.depth / 1.15)); // far ones fade into the haze
            ctx.drawImage(
              b.sprite,
              b.x - width / 2,
              b.y + Math.sin(t * 0.0006 + b.phase) * 5 * b.depth - height / 2,
            );
          });
        },
      };
    },
  });

  fx.register({
    name: 'balloonglow',
    label: 'Khinh khí cầu thắp lửa',
    rarity: 'uncommon',
    when: (look) => look.dark > 0.6,
    create(stage) {
      const DURATION = 80000;
      const balloons = balloonFleet(stage, true);
      const flame = fx.glowSprite([255, 200, 120], 32);
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          balloons.forEach((b) => {
            b.x += b.vx * k;
            // The pilot fires the burner in bursts of a second or two.
            if (t > b.nextBurn) {
              b.burnUntil = t + rand(800, 2200);
              b.nextBurn = b.burnUntil + rand(2500, 7000);
            }
            const target = t < b.burnUntil ? 1 : 0.18;
            b.burn += (target - b.burn) * (1 - 0.85 ** k);
          });
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 5000, 6000);
          balloons.forEach((b) => {
            const { width, height } = b.sprite;
            const x = b.x - width / 2;
            const y = b.y + Math.sin(t * 0.0006 + b.phase) * 5 * b.depth - height / 2;
            const flicker = b.burn * (0.9 + 0.1 * Math.sin(t * 0.05 + b.phase));
            ctx.globalAlpha = a * 0.9;
            ctx.drawImage(b.sprite, x, y);
            ctx.globalAlpha = a * flicker;
            ctx.drawImage(b.lit, x, y);
            const r = width * 0.22 * (0.6 + flicker);
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(flame, b.x - r, y + width * 1.12 - r * 0.8, r * 2, r * 2);
            ctx.globalCompositeOperation = 'source-over';
          });
        },
      };
    },
  });

  /* ---------- Kites over the rooftops ---------- */

  fx.register({
    name: 'kites',
    label: 'Thả diều trên sân thượng',
    when: (look) => look.dark < 0.3,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 80000;
      const RISE = 9000;
      const wind = Math.random() < 0.5 ? 1 : -1;
      const kites = Array.from({ length: Math.round(rand(3, 6)) }, () => {
        const ax = rand(0.08, 0.92) * W;
        return {
          ax,
          kx: ax + wind * rand(0.04, 0.14) * W,
          ky: rand(0.22, 0.5) * H,
          size: rand(1.2, 1.9) * scale,
          colors: pick(SCHEMES),
          phase: rand(0, TAU),
          launch: rand(0, 9000),
        };
      });
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          kites.forEach((kite) => {
            // Flown up from a rooftop, reeled back in at the end.
            const up =
              smooth((t - kite.launch) / RISE) * (1 - smooth((t - (DURATION - RISE)) / (RISE - 1000)));
            if (up <= 0) return;
            const sway = Math.sin(t * 0.0011 + kite.phase);
            const bob = Math.cos(t * 0.0017 + kite.phase * 1.3);
            const s = kite.size;
            const x = kite.ax + (kite.kx + sway * 14 * s - kite.ax) * up;
            const y = stage.rooftop + (kite.ky + bob * 8 * s - stage.rooftop) * up;
            // The string sags towards the rooftop it is flown from.
            ctx.strokeStyle = 'rgba(40, 44, 56, 0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(kite.ax, stage.rooftop);
            ctx.quadraticCurveTo(
              kite.ax + (x - kite.ax) * 0.6,
              stage.rooftop + (y - stage.rooftop) * 0.25,
              x,
              y,
            );
            ctx.stroke();

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(sway * 0.22 + wind * 0.15);
            const w = 11 * s;
            const h = 16 * s;
            const half = (color, sideX) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(0, -h * 0.6);
              ctx.lineTo(sideX, -h * 0.15);
              ctx.lineTo(0, h * 0.4);
              ctx.closePath();
              ctx.fill();
            };
            half(kite.colors[0], -w / 2);
            half(kite.colors[1], w / 2);
            // Tail with little bows, waving in the wind.
            ctx.strokeStyle = 'rgba(40, 44, 56, 0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, h * 0.4);
            ctx.fillStyle = kite.colors[0];
            for (let i = 1; i <= 8; i++) {
              const tx = Math.sin(t * 0.006 + i * 0.7 + kite.phase) * 3 * s * (i / 8);
              const ty = h * 0.4 + i * 5 * s;
              ctx.lineTo(tx, ty);
              if (i % 2 === 0) ctx.fillRect(tx - 1.5 * s, ty - 0.8 * s, 3 * s, 1.6 * s);
            }
            ctx.stroke();
            ctx.restore();
          });
        },
      };
    },
  });

  /* ---------- A bunch of party balloons let go ---------- */

  const partyBalloon = (color) =>
    fx.sprite(20, 56, (ctx) => {
      ctx.strokeStyle = 'rgba(80, 80, 90, 0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(10, 22);
      for (let y = 22; y <= 56; y += 4) ctx.lineTo(10 + Math.sin(y * 0.4) * 1.5, y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(10, 11, 8, 10, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath(); // knot
      ctx.moveTo(10, 20);
      ctx.lineTo(8, 23);
      ctx.lineTo(12, 23);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // shine
      ctx.beginPath();
      ctx.ellipse(7, 7, 2, 3.2, -0.5, 0, TAU);
      ctx.fill();
    });

  fx.register({
    name: 'party',
    label: 'Chùm bóng bay',
    weight: 0.6,
    when: (look) => look.dark < 0.35,
    create(stage) {
      const sprites = [...stage.colors, '#ffd166', '#ef476f', '#ffffff'].map(partyBalloon);
      return fx.risers(stage, {
        count: Math.round(rand(18, 28)),
        releaseMs: 2500, // let go all at once
        duration: 45000,
        spread: 0.02,
        size: [9, 15],
        rise: [0.7, 1.1],
        sprite: (i) => sprites[i % sprites.length],
      });
    },
  });

  /* ---------- Soap bubbles drifting past ---------- */

  /** A soap film: clear in the middle, iridescent towards the rim, with a window's reflection. */
  const bubbleSprite = (hue) =>
    fx.sprite(96, 96, (ctx, w) => {
      const c = w / 2;
      const r = c - 1;
      const disc = () => {
        ctx.beginPath();
        ctx.arc(c, c, r, 0, TAU);
        ctx.fill();
      };
      const film = ctx.createRadialGradient(c, c, r * 0.55, c, c, r);
      film.addColorStop(0, 'rgba(255, 255, 255, 0)');
      film.addColorStop(0.8, `hsla(${hue}, 90%, 75%, 0.12)`);
      film.addColorStop(0.94, `hsla(${hue + 60}, 90%, 70%, 0.32)`);
      film.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
      ctx.fillStyle = film;
      disc();
      if (ctx.createConicGradient) {
        // Swirling colours of the film.
        const swirl = ctx.createConicGradient(rand(0, TAU), c, c);
        for (let i = 0; i <= 6; i++) swirl.addColorStop(i / 6, `hsla(${hue + i * 60}, 95%, 65%, 0.16)`);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = swirl;
        ctx.fillRect(0, 0, w, w);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(c - r * 0.42, c - r * 0.42, r * 0.2, r * 0.11, -0.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(c + r * 0.45, c + r * 0.4, r * 0.08, r * 0.05, -0.8, 0, TAU);
      ctx.fill();
    });

  fx.register({
    name: 'bubbles',
    label: 'Bong bóng xà phòng',
    when: (look) => look.dark < 0.4,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 50000;
      const POP_MS = 220;
      const side = Math.random() < 0.5 ? -1 : 1; // someone blowing them just off one side of the screen
      const sprites = Array.from({ length: 6 }, (_, i) => bubbleSprite(i * 60 + rand(0, 40)));
      const bubbles = Array.from({ length: Math.round(rand(16, 26)) }, (_, i) => ({
        at: Math.floor(i / 4) * rand(3000, 6000) + rand(0, 600), // in puffs of a few
        x: side < 0 ? -0.04 * W : 1.04 * W,
        y: rand(0.55, 0.85) * H,
        vx: -side * rand(0.6, 1.6) * scale,
        vy: -rand(0.15, 0.5) * scale,
        r: rand(10, 34) * scale,
        sprite: pick(sprites),
        phase: rand(0, TAU),
        life: rand(9000, 18000), // then it pops
      }));
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          bubbles.forEach((b) => {
            if (t < b.at) return;
            b.vx *= 0.996 ** k;
            b.x += (b.vx + Math.sin(t * 0.0015 + b.phase) * 0.3 * scale) * k;
            b.y += (b.vy + Math.cos(t * 0.001 + b.phase) * 0.15 * scale) * k;
          });
          return t < DURATION;
        },
        front(ctx) {
          const fade = envelope(t, DURATION, 1, 4000);
          bubbles.forEach((b) => {
            const age = t - b.at;
            if (age < 0 || age > b.life + POP_MS) return;
            let a = fade * smooth(age / 300);
            let r = b.r;
            if (age > b.life) {
              const p = (age - b.life) / POP_MS; // pop: swells a little and vanishes
              a *= 1 - p;
              r *= 1 + p * 0.35;
            }
            const wobble = 1 + Math.sin(t * 0.004 + b.phase) * 0.04;
            ctx.globalAlpha = a;
            ctx.drawImage(b.sprite, b.x - r * wobble, b.y - r / wobble, r * 2 * wobble, (r * 2) / wobble);
          });
        },
      };
    },
  });

  /* ---------- Dầu seeds spinning down ---------- */

  /** A dầu (dipterocarp) seed: two long veined wings over a round nut, the "pinwheel" of Saigon's streets. */
  const seedSprite = (tint) =>
    fx.sprite(48, 96, (ctx, w, h) => {
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(w / 2, h * 0.82);
        ctx.rotate(side * 0.2);
        const g = ctx.createLinearGradient(0, 0, 0, -h * 0.78);
        g.addColorStop(0, `rgba(${tint}, 0.95)`);
        g.addColorStop(1, `rgba(${tint}, 0.7)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(side * w * 0.22, -h * 0.2, side * w * 0.2, -h * 0.62, side * w * 0.06, -h * 0.78);
        ctx.bezierCurveTo(-side * w * 0.02, -h * 0.6, -side * w * 0.02, -h * 0.25, 0, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90, 40, 30, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(side * w * 0.03, -h * 0.05);
        ctx.quadraticCurveTo(side * w * 0.12, -h * 0.4, side * w * 0.07, -h * 0.72);
        ctx.stroke();
        ctx.restore();
      });
      ctx.fillStyle = 'rgb(122, 74, 44)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.86, w * 0.13, h * 0.08, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 180, 0.35)';
      ctx.beginPath();
      ctx.ellipse(w * 0.46, h * 0.84, w * 0.04, h * 0.025, 0, 0, TAU);
      ctx.fill();
    });

  fx.register({
    name: 'seeds',
    label: 'Mùa hoa dầu bay',
    when: (look) => look.dark < 0.35,
    create(stage) {
      const sprites = ['196, 98, 84', '176, 112, 70', '214, 140, 104'].map(seedSprite);
      return fx.fallers(stage, {
        count: Math.round(rand(26, 38)),
        releaseMs: 30000,
        duration: 55000,
        size: [44, 72],
        fall: [0.9, 1.6],
        spin: [0.22, 0.34], // fast: the wings blur into a little propeller
        mode: 'twirl',
        sprite: (i) => sprites[i % sprites.length],
      });
    },
  });

  /* ---------- Apricot blossoms (hoa mai) on the wind ---------- */

  const maiFlower = fx.sprite(40, 40, (ctx, w) => {
    const c = w / 2;
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate((i / 5) * TAU);
      const g = ctx.createLinearGradient(0, 0, 0, -w * 0.42);
      g.addColorStop(0, 'rgb(255, 186, 30)');
      g.addColorStop(1, 'rgb(255, 222, 80)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -w * 0.22, w * 0.13, w * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgb(236, 128, 28)';
    ctx.beginPath();
    ctx.arc(c, c, w * 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgb(190, 84, 20)';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.fillRect(c + Math.cos(a) * w * 0.12 - 0.8, c + Math.sin(a) * w * 0.12 - 0.8, 1.6, 1.6);
    }
  });

  const maiPetal = fx.sprite(16, 24, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgb(255, 186, 30)');
    g.addColorStop(1, 'rgb(255, 224, 90)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.46, 0, 0, TAU);
    ctx.fill();
  });

  fx.register({
    name: 'blossoms',
    label: 'Hoa mai bay trong gió',
    rarity: 'uncommon',
    when: (look) => look.dark < 0.4,
    create(stage) {
      return fx.fallers(stage, {
        count: Math.round(rand(26, 40)),
        releaseMs: 28000,
        duration: 52000,
        size: [10, 22],
        fall: [0.6, 1.1],
        spin: [0.02, 0.06],
        mode: 'tumble',
        sprite: (i) => (i % 3 === 0 ? maiFlower : maiPetal),
      });
    },
  });

  /* ---------- Các Sự Kiện Bầu Trời Ban Ngày & Đời Sống Mở Rộng ---------- */

  // 8. Đội khinh khí cầu 3 chiếc bay theo đội hình (Balloon Fleet)
  fx.register({
    name: 'balloon_fleet',
    label: 'Đội Khinh Khí Cầu 3 Chiếc Bay Thủ Thiêm',
    weight: 1.6,
    when: (look) => look.dark < 0.45,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 34000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 2500, 2500);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.9;
          const u = t / DURATION;
          const bx = -80 + u * (W + 160);
          const colors = ['#ef4444', '#f59e0b', '#3b82f6'];
          for (let i = 0; i < 3; i++) {
            const x = bx - i * 65;
            const y = H * 0.32 + i * 25 + Math.sin(t * 0.002 + i) * 10;
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.ellipse(x, y, 16, 22, 0, 0, TAU);
            ctx.fill();
            // Basket
            ctx.fillStyle = '#78350f';
            ctx.fillRect(x - 3, y + 25, 6, 5);
          }
          ctx.restore();
        },
      };
    },
  });

  // 9. Cánh diều sáo truyền thống lượn sóng (Kite Flute)
  fx.register({
    name: 'kite_flute',
    label: 'Diều Sáo Truyền Thống Ngân Vang Chiều Sài Gòn',
    weight: 1.6,
    when: (look) => look.dark < 0.65,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 32000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.85;
          const kx = W * 0.38 + Math.sin(t * 0.0018) * 35;
          const ky = H * 0.38 + Math.cos(t * 0.0025) * 20;
          // Crescent moon kite body
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(kx, ky, 24, 0, Math.PI);
          ctx.fill();
          // Bamboo flute bars
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(kx - 26, ky);
          ctx.lineTo(kx + 26, ky);
          ctx.stroke();
          ctx.restore();
        },
      };
    },
  });

  // 10. Diều phát sáng LED lấp lánh ban đêm (LED Kites)
  fx.register({
    name: 'kite_led',
    label: 'Cánh Diều LED Rực Rỡ Đêm Công Viên Thủ Thiêm',
    weight: 1.7,
    when: (look) => look.dark > 0.6,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 32000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a;
          const kx = W * 0.65 + Math.sin(t * 0.002) * 25;
          const ky = H * 0.35 + Math.cos(t * 0.0028) * 22;
          // Glowing LED dots along kite frame
          for (let i = 0; i < 8; i++) {
            const angle = (i * TAU) / 8;
            const x = kx + Math.cos(angle) * 20;
            const y = ky + Math.sin(angle) * 14;
            ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ec4899';
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 11. Chùm bóng bay hình trái tim đỏ (Heart Balloons)
  fx.register({
    name: 'heart_balloons',
    label: 'Chùm Bóng Bay Trái Tim Đỏ Bay Lên Trời',
    weight: 1.5,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 28000;
      let t = 0;
      const offsets = [
        { dx: 0, dy: 0, size: 14, color: '#ef4444' },
        { dx: -12, dy: 8, size: 12, color: '#f43f5e' },
        { dx: 14, dy: 6, size: 13, color: '#dc2626' },
        { dx: -6, dy: 16, size: 11, color: '#fb7185' },
        { dx: 8, dy: 18, size: 11, color: '#e11d48' },
        { dx: -18, dy: 24, size: 10, color: '#f43f5e' },
        { dx: 16, dy: 25, size: 10, color: '#ef4444' },
      ];
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          const u = t / DURATION;
          const bx = W * 0.45 + Math.sin(u * 7) * 45;
          const by = H * 1.05 - u * (H * 0.95);
          ctx.save();
          ctx.globalAlpha = a * 0.9;

          // Gathering knot / ribbons
          const knotX = bx;
          const knotY = by + 35;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 0.9;

          offsets.forEach((b) => {
            const hx = bx + b.dx + Math.sin(t * 0.002 + b.dx) * 4;
            const hy = by + b.dy + Math.cos(t * 0.003 + b.dy) * 3;
            const s = b.size;

            // Tether string from balloon base to central knot
            ctx.beginPath();
            ctx.moveTo(hx, hy + s * 0.8);
            ctx.quadraticCurveTo((hx + knotX) / 2 + 2, (hy + knotY) / 2, knotX, knotY);
            ctx.stroke();

            // Sculpted Heart Shape
            ctx.save();
            ctx.translate(hx, hy);
            ctx.fillStyle = b.color;
            ctx.beginPath();
            const topH = s * 0.35;
            ctx.moveTo(0, topH);
            ctx.bezierCurveTo(0, -s * 0.2, -s * 0.6, -s * 0.2, -s * 0.6, topH);
            ctx.bezierCurveTo(-s * 0.6, s * 0.65, 0, s * 0.75, 0, s);
            ctx.bezierCurveTo(0, s * 0.75, s * 0.6, s * 0.65, s * 0.6, topH);
            ctx.bezierCurveTo(s * 0.6, -s * 0.2, 0, -s * 0.2, 0, topH);
            ctx.closePath();
            ctx.fill();

            // Specular reflection highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.beginPath();
            ctx.ellipse(-s * 0.22, topH * 0.5, s * 0.12, s * 0.07, -0.4, 0, TAU);
            ctx.fill();
            ctx.restore();
          });

          // Ribbons trailing from knot
          ctx.strokeStyle = '#fda4af';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(knotX, knotY);
          ctx.quadraticCurveTo(knotX - 8, knotY + 20, knotX + 4, knotY + 38);
          ctx.stroke();

          ctx.restore();
        },
      };
    },
  });

  // 12. Bong bóng khổng lồ biến dạng trong gió (Giant Bubble)
  fx.register({
    name: 'giant_bubble',
    label: 'Bong Bóng Khổng Lồ Biến Dạng Trong Gió',
    weight: 1.4,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 26000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 2000);
          if (a <= 0) return;
          const u = t / DURATION;
          const bx = W * 0.12 + u * (W * 0.76);
          const by = H * 0.52 + Math.sin(t * 0.0025) * 35;
          ctx.save();
          ctx.globalAlpha = a * 0.75;

          const rX = 36 + Math.sin(t * 0.007) * 7;
          const rY = 30 + Math.cos(t * 0.005) * 6;
          const rot = Math.sin(t * 0.002) * 0.3;

          ctx.translate(bx, by);
          ctx.rotate(rot);

          // Iridescent soap film gradient
          const bubbleGrad = ctx.createRadialGradient(-rX * 0.25, -rY * 0.25, rX * 0.1, 0, 0, rX * 1.05);
          bubbleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
          bubbleGrad.addColorStop(0.65, 'rgba(186, 230, 253, 0.1)');
          bubbleGrad.addColorStop(0.85, 'rgba(244, 114, 182, 0.22)');
          bubbleGrad.addColorStop(0.95, 'rgba(56, 189, 248, 0.35)');
          bubbleGrad.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
          ctx.fillStyle = bubbleGrad;

          ctx.beginPath();
          ctx.ellipse(0, 0, rX, rY, 0, 0, TAU);
          ctx.fill();

          // Thin outer rainbow rim
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, rX, rY, 0, 0, TAU);
          ctx.stroke();

          // Curved specular glare reflection
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(-rX * 0.1, -rY * 0.1, rX * 0.65, Math.PI * 1.15, Math.PI * 1.45);
          ctx.stroke();

          // Secondary lower glare dot
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(rX * 0.45, rY * 0.45, 2.5, 0, TAU);
          ctx.fill();

          ctx.restore();
        },
      };
    },
  });

  // 13. Cơn lốc nhỏ cuốn hoa dầu xoay tròn (Seed Whirlwind)
  fx.register({
    name: 'seed_whirlwind',
    label: 'Cơn Lốc Cuốn Hoa Dầu Xoay Tròn (Seed Whirlwind)',
    weight: 1.5,
    when: (look) => look.dark < 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 28000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.85;
          const cx = W * 0.58;
          const cy = H * 0.62;

          for (let i = 0; i < 22; i++) {
            const spin = (i * TAU) / 22 + t * 0.0055;
            const r = 24 + i * 3.8;
            const x = cx + Math.cos(spin) * r;
            const y = cy + Math.sin(spin) * (r * 0.38) - i * 3.2;
            const wingSpin = t * 0.015 + i * 1.7;

            // Saigon Dipterocarpus winged seed (Trái Chò Nâu / Hoa Dầu hai cánh xoay tròn)
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(wingSpin);

            // Two elongated propeller wings
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.ellipse(0, -7, 2, 6, 0.1, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(0, 7, 2, 6, -0.1, 0, TAU);
            ctx.fill();

            // Central round seed nut
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(0, 0, 2.4, 0, TAU);
            ctx.fill();

            ctx.restore();
          }
          ctx.restore();
        },
      };
    },
  });

  // 14. Cánh hoa đào hồng phai bay lượn (Peach Blossoms)
  fx.register({
    name: 'peach_blossoms',
    label: 'Cánh Hoa Đào Hồng Phai Bay Lượn Ngày Tết',
    weight: 1.4,
    when: (look) => look.dark < 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 32000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.75;
          ctx.fillStyle = '#fbcfe8'; // pale pink
          for (let i = 0; i < 28; i++) {
            const x = (W * 0.05 + i * 45 + Math.sin(t * 0.002 + i) * 20) % W;
            const y = (t * 0.03 + i * 25) % H;
            ctx.beginPath();
            ctx.ellipse(x, y, 4, 6, i * 0.5, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 15. Cánh hoa giấy rụng bay la đà (Bougainvillea)
  fx.register({
    name: 'bougainvillea',
    label: 'Cánh Hoa Giấy Rụng Bay La Đà Mái Hiên Sài Gòn',
    weight: 1.6,
    when: (look) => look.dark < 0.6,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 30000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.8;
          ctx.fillStyle = '#f43f5e'; // magenta pink
          for (let i = 0; i < 22; i++) {
            const x = (i * 65 + Math.sin(t * 0.003 + i) * 30) % W;
            const y = (t * 0.035 + i * 35) % H;
            ctx.beginPath();
            ctx.ellipse(x, y, 5, 7, 0.4, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 16. Lá vàng rơi xào xạc đường Trương Định (Autumn Leaves)
  fx.register({
    name: 'autumn_leaves',
    label: 'Lá Vàng Rơi Xào Xạc Đường Trương Định Sài Gòn',
    weight: 1.5,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 30000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.75;
          ctx.fillStyle = '#eab308'; // golden yellow leaf
          for (let i = 0; i < 20; i++) {
            const x = (i * 70 + Math.sin(t * 0.002 + i) * 35) % W;
            const y = (t * 0.04 + i * 30) % H;
            ctx.beginPath();
            ctx.ellipse(x, y, 6, 9, Math.sin(t * 0.004 + i), 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 17. Tàu buýt sông Sài Gòn lướt sóng (Saigon Waterbus)
  fx.register({
    name: 'water_taxi',
    label: 'Tàu Buýt Sông Sài Gòn (Saigon Waterbus) Rẽ Sóng',
    weight: 1.8,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 32000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          const u = t / DURATION;
          const bx = -70 + u * (W + 140);
          const by = H * 0.88 + Math.sin(t * 0.003) * 2;
          ctx.save();
          ctx.globalAlpha = a * 0.95;
          const isNight = stage.look.dark > 0.5;
          fx.drawWaterbus(ctx, bx, by, 1.35, 1, isNight, t);
          ctx.restore();
        },
      };
    },
  });

  // 18. Đàn đom đóm lập lòe bờ sông Thanh Đa (Fireflies)
  fx.register({
    name: 'fireflies',
    label: 'Đàn Đom Đóm Lập Lòe Bờ Sông Thanh Đa Sài Gòn',
    weight: 1.7,
    when: (look) => look.dark > 0.6,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 35000;
      let t = 0;
      const flies = Array.from({ length: 30 }, () => ({
        x: rand(0, W),
        y: rand(H * 0.6, H * 0.95),
        speed: rand(0.002, 0.005),
        phase: rand(0, TAU),
      }));
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          flies.forEach((f) => {
            const glow = (Math.sin(t * f.speed + f.phase) + 1) * 0.5;
            if (glow > 0.3) {
              ctx.globalAlpha = a * glow;
              ctx.fillStyle = '#bef264'; // yellow-green firefly
              ctx.beginPath();
              ctx.arc(f.x + Math.sin(t * 0.001 + f.phase) * 15, f.y, 2.5, 0, TAU);
              ctx.fill();
            }
          });
          ctx.restore();
        },
      };
    },
  });

  // 19. Đàn bồ câu tung cánh nhà thờ Đức Bà (Pigeons Park)
  fx.register({
    name: 'pigeons_park',
    label: 'Đàn Bồ Câu Tung Cánh Công Viên Nhà Thờ Đức Bà',
    weight: 1.6,
    when: (look) => look.dark < 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 26000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 1500, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.9;
          const u = t / DURATION;
          const cx = W * 0.35 + u * (W * 0.42);
          const cy = H * 0.62 - u * (H * 0.32);

          for (let i = 0; i < 14; i++) {
            const px = cx + Math.sin(i * 1.5 + t * 0.001) * 32;
            const py = cy + Math.cos(i * 1.2 + t * 0.001) * 22;
            const flap = Math.sin(t * 0.018 + i * 1.1);

            ctx.save();
            ctx.translate(px, py);

            // Flapping V-wings
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(-5.5, flap * 3.5);
            ctx.quadraticCurveTo(-2.5, -flap * 2, 0, 0);
            ctx.quadraticCurveTo(2.5, -flap * 2, 5.5, flap * 3.5);
            ctx.stroke();

            // Pigeon body silhouette
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.ellipse(0, 0, 3, 1.6, 0.25, 0, TAU);
            ctx.fill();

            ctx.restore();
          }
          ctx.restore();
        },
      };
    },
  });

  // 20. Phố lồng đèn Lương Nhữ Học bừng sáng (Street Lanterns)
  fx.register({
    name: 'street_lanterns',
    label: 'Phố Lồng Đèn Lương Nhữ Học Bừng Sáng Chợ Lớn',
    weight: 1.7,
    when: (look) => look.dark > 0.55,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 34000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.9;
          const ly = H * 0.82;
          for (let i = 0; i < 35; i++) {
            const x = (i * W) / 35;
            ctx.fillStyle = i % 3 === 0 ? '#ef4444' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(x, ly + Math.sin(i) * 5, 3.5, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 21. Chuông gió đung đưa ban công (Wind Chimes)
  fx.register({
    name: 'wind_chimes',
    label: 'Tiếng Chuông Gió Đung Đưa Ban Công Buổi Sáng',
    weight: 1.4,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 24000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 1500);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.75;
          const cx = W * 0.88;
          const cy = H * 0.2;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          const swing = Math.sin(t * 0.005) * 8;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + swing, cy + 30);
          ctx.stroke();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(cx + swing, cy + 32, 4, 0, TAU);
          ctx.fill();
          ctx.restore();
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
