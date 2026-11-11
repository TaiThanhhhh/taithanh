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
    group: 'day',
    label: 'Khinh khí cầu',
    rarity: 'rare',
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
    group: 'day',
    label: 'Khinh khí cầu thắp lửa',
    rarity: 'rare',
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
    group: 'day',
    label: 'Thả diều trên sân thượng',
    // Most in the windy dry season, on weekend afternoons (16–18h at Thủ Thiêm and Ba Son).
    boost: (cal, look) =>
      (cal.windy ? 1.8 : 0.8) *
      (cal.isWeekend ? 1.6 : 1) *
      (['afternoon', 'golden'].includes(look.name) ? 1.5 : 0.7),
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
    group: 'day',
    label: 'Thả bóng bay',
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
    group: 'day',
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
    group: 'day',
    label: 'Mùa dầu bay',
    // Dầu seeds spin down in April, sao seeds in May (Tao Đàn, Lê Duẩn, Trương Định...).
    caption: (cal) =>
      cal.seeds === 'sao'
        ? { title: 'Mùa sao bay', place: 'Tháng 5 · Sài Gòn' }
        : { title: 'Mùa dầu bay', place: 'Tháng 4 · Công viên Tao Đàn' },
    weight: 1.6,
    // Their months (April, May); any other day now and then.
    boost: (cal) => (cal.seeds ? 1 : 0.25),
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
    group: 'day',
    label: 'Hoa mai bay trong gió',
    place: 'Tết ở Sài Gòn',
    occasion: 'tet',
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
})((window.Portfolio = window.Portfolio || {}));
