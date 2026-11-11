/**
 * @file Life on the Saigon river (registered with ambient-events.js), in front of the
 * skyline: rafts of water hyacinth (lục bình) drifting downstream, sand barges pushed by
 * their tugs, the river bus, the hydrofoil to Vũng Tàu, fish jumping; and the shows of
 * the city's River Festival (Lễ hội Sông nước): the parade of lit boats, a waterfall of
 * fireworks from a barge, flyboard and jet skis by day.
 *
 * Everything floats on the band of water at the bottom of the screen: `fx.onWater(stage, d)`
 * gives the waterline and the scale at depth d (0 at the far bank .. 1 at the viewer).
 * The current runs to the left. Reflections are drawn by each event (broken streaks
 * under the lights), since the river's mirror only reflects the sky.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, envelope, clamp01 } = fx;
  const FRAME_MS = Portfolio.motion.FRAME_MS;

  const hasRiver = (stage) => !!stage.river && stage.river.h > 20;
  /** Colour of a thing on the water at this hour: its day colour, darkened towards night. */
  const shade = (rgb, look, keep = 0.12) =>
    rgb.map((v) => Math.round(v * (1 - (1 - keep) * look.dark))).join(', ');

  /**
   * A boat's wake: foam left at the stern that spreads in a V (the arms open towards and
   * away from the viewer as they age), plus the churned water right behind.
   */
  function wake(life = 6000) {
    const points = [];
    return {
      add(x, y, s, t, strength = 1) {
        const last = points[points.length - 1];
        if (!last || t - last.t > 45) points.push({ x, y, s, t, strength });
      },
      draw(ctx, t, look, alpha = 1) {
        while (points.length && t - points[0].t > life) points.shift();
        const rgb = look.dark > 0.5 ? '170, 185, 210' : '240, 244, 248';
        const a0 = (look.dark > 0.5 ? 0.25 : 0.55) * alpha;
        ctx.fillStyle = `rgb(${rgb})`;
        points.forEach((p) => {
          const age = (t - p.t) / life;
          const a = a0 * (1 - age) ** 1.6 * p.strength;
          if (a < 0.01) return;
          const spread = age * 9 * p.s;
          const len = (5 + age * 10) * p.s;
          ctx.globalAlpha = a;
          ctx.fillRect(p.x - len / 2, p.y - spread * 0.5, len, Math.max(1, p.s * 0.8));
          ctx.fillRect(p.x - len / 2, p.y + spread, len, Math.max(1, p.s * 0.8));
          if (age < 0.25) {
            ctx.globalAlpha = a * (1 - age * 4);
            ctx.fillRect(p.x - len, p.y - 0.5 * p.s, len * 2, 1.6 * p.s); // churned water
          }
        });
        ctx.globalAlpha = 1;
      },
    };
  }

  /** A broken streak of light on the water under a light at (x, y) above the waterline wl. */
  function streak(ctx, x, y, wl, s, color, alpha, t, phase) {
    const len = Math.max(3, (wl - y) * 0.6 + 4 * s);
    for (let i = 0; i < 3; i++) {
      const wob = Math.sin(t * 0.005 + phase + i * 1.7) * 1.4 * s;
      ctx.globalAlpha = alpha * (1 - i * 0.3);
      ctx.fillStyle = color;
      ctx.fillRect(x + wob - 0.8 * s, wl + 1 + (len / 3) * i, 1.6 * s, (len / 3) * 0.7);
    }
  }

  /* ---------- Water hyacinth (lục bình) drifting downstream ---------- */

  function hyacinthSprite(look) {
    const leaf = shade([62, 112, 48], look);
    const light = shade([104, 156, 70], look);
    const flower = shade([176, 132, 222], look, 0.25);
    const w = 90;
    const h = 40;
    return fx.sprite(w, h, (ctx) => {
      for (let i = 0; i < 22; i++) {
        const x = w * (0.15 + Math.random() * 0.7);
        const y = h * (0.45 + Math.random() * 0.4);
        ctx.fillStyle = `rgb(${Math.random() < 0.4 ? light : leaf})`;
        ctx.beginPath();
        ctx.ellipse(x, y, rand(4, 9), rand(3, 6), rand(-0.6, 0.6), 0, TAU);
        ctx.fill();
      }
      if (look.dark < 0.6 && Math.random() < 0.7) {
        // A spike of pale violet flowers.
        for (let i = 0; i < Math.round(rand(1, 3)); i++) {
          const x = w * rand(0.3, 0.7);
          ctx.fillStyle = `rgb(${flower})`;
          for (let j = 0; j < 4; j++) ctx.fillRect(x + rand(-2, 2), h * 0.12 + j * 3.5, 3, 3);
        }
      }
    });
  }

  fx.register({
    name: 'hyacinth',
    label: 'Lục bình trôi trên sông',
    place: 'Sông Sài Gòn',
    group: 'river',
    tier: 'detail',
    when: (look, stage) => hasRiver(stage),
    create(stage) {
      const { W } = stage;
      const DURATION = 46000;
      const rafts = Array.from({ length: Math.round(rand(5, 9)) }, () => {
        const d = rand(0.12, 0.85);
        return {
          x: rand(0.1, 1.05) * stage.W,
          d,
          sprite: hyacinthSprite(stage.look),
          size: rand(0.6, 1.3),
          vx: -rand(0.14, 0.26) * (0.6 + d) * (W / 1920),
          phase: rand(0, TAU),
        };
      });
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          rafts.forEach((r) => {
            r.x += r.vx * k;
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 4000, 5000);
          rafts.forEach((r) => {
            const { y, s } = fx.onWater(stage, r.d);
            const w = 70 * s * r.size;
            const h = (w * r.sprite.height) / r.sprite.width;
            const bob = Math.sin(t * 0.0016 + r.phase) * 0.8 * s;
            ctx.save();
            ctx.translate(r.x, y + bob);
            ctx.rotate(Math.sin(t * 0.0006 + r.phase) * 0.03);
            ctx.globalAlpha = a;
            ctx.drawImage(r.sprite, -w / 2, -h * 0.75, w, h);
            // Its dark reflection, squashed and broken.
            ctx.globalAlpha = a * 0.25;
            ctx.scale(1, -0.45);
            ctx.drawImage(r.sprite, -w / 2, -h * 0.75, w, h);
            ctx.restore();
          });
        },
      };
    },
  });

  /* ---------- A sand barge pushed by its tug ---------- */

  fx.register({
    name: 'barge',
    label: 'Sà lan chở cát xuôi dòng',
    place: 'Sông Sài Gòn',
    group: 'river',
    tier: 'detail',
    when: (look, stage) => hasRiver(stage),
    create(stage) {
      const { W } = stage;
      const look = stage.look;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const d = rand(0.18, 0.45);
      const { y: wl, s } = fx.onWater(stage, d);
      const len = 190 * s;
      const tug = 46 * s;
      const total = len + tug;
      const speed = (W / rand(2700, 3400)) * dir;
      const night = look.dark > 0.5;
      const hull = `rgb(${shade([58, 52, 46], look, 0.1)})`;
      const sand = `rgb(${shade([176, 140, 92], look, 0.1)})`;
      const cabin = `rgb(${shade([214, 210, 196], look, 0.1)})`;
      const w = wake(7000);
      let x = dir > 0 ? -total : W + total; // the bow of the barge
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          x += speed * k;
          w.add(x - dir * total, wl, s, t, 0.8);
          return dir > 0 ? x - total < W + 20 : x + total > -20;
        },
        front(ctx) {
          w.draw(ctx, t, look);
          ctx.save();
          ctx.translate(x, wl);
          ctx.scale(dir, 1); // drawn heading right; flipped heading left
          // The barge: low, laden to the waterline, a long mound of sand.
          ctx.fillStyle = hull;
          ctx.fillRect(-len, -4 * s, len, 5 * s);
          ctx.beginPath();
          ctx.moveTo(0, -4 * s);
          ctx.lineTo(4 * s, -1 * s);
          ctx.lineTo(0, 1 * s);
          ctx.fill();
          ctx.fillStyle = sand;
          ctx.beginPath();
          ctx.moveTo(-len + 6 * s, -4 * s);
          ctx.quadraticCurveTo(-len * 0.5, -17 * s, -8 * s, -4 * s);
          ctx.fill();
          // The tug pushing from behind: hull, wheelhouse, mast.
          ctx.fillStyle = hull;
          ctx.fillRect(-total, -6 * s, tug, 7 * s);
          ctx.fillStyle = cabin;
          ctx.fillRect(-total + tug * 0.25, -16 * s, tug * 0.5, 10 * s);
          ctx.fillStyle = night ? 'rgba(255, 210, 140, 0.9)' : `rgb(${shade([60, 80, 100], look)})`;
          ctx.fillRect(-total + tug * 0.32, -14 * s, tug * 0.36, 3 * s);
          ctx.fillStyle = hull;
          ctx.fillRect(-total + tug * 0.48, -27 * s, 1.4 * s, 11 * s);
          ctx.restore();
          if (night) {
            // Navigation lights: white masthead, the sidelight we see, and their streaks.
            ctx.globalCompositeOperation = 'lighter';
            const mx = x - dir * (total - tug * 0.48);
            const lights = [
              [mx, wl - 27 * s, 'rgb(255, 250, 235)'],
              [x - dir * (total - tug * 0.8), wl - 8 * s, dir > 0 ? 'rgb(80, 255, 140)' : 'rgb(255, 70, 70)'],
            ];
            lights.forEach(([lx, ly, c], i) => {
              ctx.globalAlpha = 1;
              ctx.fillStyle = c;
              ctx.fillRect(lx - 1.2 * s, ly - 1.2 * s, 2.4 * s, 2.4 * s);
              streak(ctx, lx, ly, wl, s, c, 0.35, t, i);
            });
            ctx.globalAlpha = 1;
          }
        },
      };
    },
  });

  /* ---------- The river bus, and the hydrofoil to Vũng Tàu ---------- */

  /**
   * A passenger boat crossing: white hull with a coloured band, a row of windows (lit at
   * night), a bow wave and a wake; `foil` lifts the hull and throws a plume of spray.
   */
  function passengerBoat(stage, o) {
    const { W } = stage;
    const look = stage.look;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const d = rand(o.depth[0], o.depth[1]);
    const { y: wl, s } = fx.onWater(stage, d);
    const len = o.length * s;
    const speed = (W / (o.crossSeconds * 60)) * dir;
    const night = look.dark > 0.5;
    const white = `rgb(${shade([236, 238, 240], look, 0.16)})`;
    const band = `rgb(${shade(o.band, look, 0.14)})`;
    const glass = night ? 'rgba(255, 220, 160, 0.92)' : `rgb(${shade([40, 60, 84], look)})`;
    const w = wake(o.foil ? 5000 : 6500);
    const spray = [];
    let x = dir > 0 ? -len : W + len;
    let t = 0;
    return {
      update(k, elapsed) {
        t = elapsed;
        x += speed * k;
        w.add(x - dir * len, wl, s, t, o.foil ? 1.3 : 1);
        if (o.foil) {
          // A rooster tail of spray behind the stern.
          for (let i = 0; i < 3 * k; i++) {
            spray.push({
              x: x - dir * len,
              y: wl - 2 * s,
              vx: -dir * rand(0.5, 2.2) * s,
              vy: -rand(0.6, 2) * s,
              life: 1,
            });
          }
          spray.forEach((p) => {
            p.vy += 0.08 * s * k;
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.life -= 0.03 * k;
          });
          fx.compact(spray, (p) => p.life > 0 && p.y < wl + 2 * s);
        }
        return dir > 0 ? x - len < W + 30 : x + len > -30;
      },
      front(ctx) {
        w.draw(ctx, t, look);
        const lift = o.foil ? 4 * s : 0;
        ctx.save();
        ctx.translate(x, wl - lift);
        ctx.scale(dir, 1);
        if (o.foil) {
          // The foils and struts under the hull.
          ctx.fillStyle = `rgb(${shade([60, 64, 70], look)})`;
          ctx.fillRect(-len * 0.8, 0, 1.5 * s, lift);
          ctx.fillRect(-len * 0.2, 0, 1.5 * s, lift);
        }
        // Hull: a raked bow, a band of colour.
        ctx.fillStyle = white;
        ctx.beginPath();
        ctx.moveTo(-len, -7 * s);
        ctx.lineTo(-len * 0.12, -7 * s);
        ctx.lineTo(0, -4 * s);
        ctx.lineTo(-len * 0.06, 0);
        ctx.lineTo(-len, 0);
        ctx.fill();
        ctx.fillStyle = band;
        ctx.fillRect(-len, -3.2 * s, len * 0.94, 1.6 * s);
        // Cabin with a row of windows.
        ctx.fillStyle = white;
        ctx.beginPath();
        ctx.moveTo(-len * 0.9, -7 * s);
        ctx.lineTo(-len * 0.9, -14 * s);
        ctx.lineTo(-len * 0.32, -14 * s);
        ctx.lineTo(-len * 0.2, -7 * s);
        ctx.fill();
        ctx.fillStyle = glass;
        for (let i = 0; i < 9; i++)
          ctx.fillRect(-len * 0.86 + i * len * 0.065, -12.5 * s, len * 0.045, 3.2 * s);
        ctx.restore();
        if (o.foil) {
          ctx.fillStyle = look.dark > 0.5 ? 'rgb(190, 200, 220)' : 'rgb(250, 252, 255)';
          spray.forEach((p) => {
            ctx.globalAlpha = p.life * 0.6;
            ctx.fillRect(p.x, p.y, 1.4 * s, 1.4 * s);
          });
          ctx.globalAlpha = 1;
        }
        if (night) {
          // The lit windows' reflection, broken.
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 9; i += 2) {
            const lx = x - dir * (len * 0.86 - i * len * 0.065);
            streak(ctx, lx, wl - 12 * s, wl, s, 'rgb(255, 200, 130)', 0.25, t, i);
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      },
    };
  }

  fx.register({
    name: 'waterbus',
    label: 'Buýt đường sông',
    place: 'Bến Bạch Đằng → Linh Đông',
    group: 'river',
    tier: 'detail',
    when: (look, stage) => hasRiver(stage) && look.dark < 0.85,
    create: (stage) =>
      passengerBoat(stage, { length: 95, crossSeconds: 26, band: [30, 120, 190], depth: [0.3, 0.6] }),
  });

  fx.register({
    name: 'hydrofoil',
    label: 'Tàu cao tốc đi Vũng Tàu',
    place: 'Bến Bạch Đằng',
    group: 'river',
    tier: 'detail',
    rarity: 'uncommon',
    when: (look, stage) => hasRiver(stage) && look.dark < 0.4,
    create: (stage) =>
      passengerBoat(stage, {
        length: 120,
        crossSeconds: 11,
        band: [30, 150, 90],
        depth: [0.4, 0.7],
        foil: true,
      }),
  });

  /* ---------- Fish jumping ---------- */

  fx.register({
    name: 'fishjump',
    label: 'Cá quẫy mặt sông',
    group: 'river',
    tier: 'detail',
    when: (look, stage) => hasRiver(stage),
    create(stage) {
      const { W } = stage;
      const DURATION = 15000;
      const look = stage.look;
      const body = look.dark > 0.5 ? 'rgb(30, 34, 44)' : 'rgb(150, 156, 160)';
      const jumps = Array.from({ length: Math.round(rand(4, 8)) }, () => {
        const d = rand(0.2, 0.9);
        return {
          at: rand(0, DURATION - 3000),
          x: rand(0.08, 0.95) * W,
          d,
          dir: Math.random() < 0.5 ? 1 : -1,
          size: rand(0.7, 1.2),
        };
      });
      const drops = [];
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          jumps.forEach((j) => {
            const u = (t - j.at) / 700;
            if (!j.splashed && u > 1) {
              j.splashed = true;
              const { y, s } = fx.onWater(stage, j.d);
              for (let i = 0; i < 10; i++)
                drops.push({
                  x: j.x + j.dir * 18 * s,
                  y,
                  vx: rand(-1, 1) * s,
                  vy: -rand(0.8, 2) * s,
                  s,
                  life: 1,
                });
            }
          });
          drops.forEach((p) => {
            p.vy += 0.12 * p.s * k;
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.life -= 0.035 * k;
          });
          fx.compact(drops, (p) => p.life > 0);
          return t < DURATION;
        },
        front(ctx) {
          const ring = look.dark > 0.5 ? '160, 175, 200' : '236, 240, 244';
          jumps.forEach((j) => {
            const { y, s } = fx.onWater(stage, j.d);
            const u = (t - j.at) / 700;
            if (u < 0) return;
            if (u <= 1) {
              // An arc out of the water and back, the body turning with it.
              const fx0 = j.x + j.dir * u * 18 * s;
              const fy = y - Math.sin(Math.PI * u) * 14 * s * j.size;
              ctx.save();
              ctx.translate(fx0, fy);
              ctx.rotate(j.dir * (u - 0.5) * 2);
              ctx.fillStyle = body;
              ctx.beginPath();
              ctx.ellipse(0, 0, 4 * s * j.size, 1.4 * s * j.size, 0, 0, TAU);
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(-j.dir * 3.5 * s, 0);
              ctx.lineTo(-j.dir * 6 * s, -1.6 * s);
              ctx.lineTo(-j.dir * 6 * s, 1.6 * s);
              ctx.fill();
              ctx.restore();
            }
            // Rings where it left the water and where it came back in.
            [0, 18].forEach((dx, i) => {
              const v = (t - j.at - i * 700) / 2400;
              if (v < 0 || v > 1) return;
              ctx.strokeStyle = `rgba(${ring}, ${0.5 * (1 - v)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.ellipse(j.x + j.dir * dx * s, y, (2 + v * 16) * s, (0.6 + v * 4) * s, 0, 0, TAU);
              ctx.stroke();
            });
          });
          ctx.fillStyle = `rgb(${ring})`;
          drops.forEach((p) => {
            ctx.globalAlpha = p.life * 0.8;
            ctx.fillRect(p.x, p.y, 1.2 * p.s, 1.2 * p.s);
          });
          ctx.globalAlpha = 1;
        },
      };
    },
  });

  /* ---------- River Festival: the parade of lit boats ---------- */

  /** Decorations the boats carry, drawn on 320x160 and sampled into light bulbs. */
  const DECOR = {
    carp(ctx, w, h) {
      // Cá chép: a leaping carp, body arched, tail spread.
      ctx.beginPath();
      ctx.ellipse(w * 0.46, h * 0.52, w * 0.2, h * 0.2, -0.35, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.62);
      ctx.lineTo(w * 0.1, h * 0.38);
      ctx.lineTo(w * 0.14, h * 0.86);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w * 0.48, h * 0.32);
      ctx.lineTo(w * 0.56, h * 0.08);
      ctx.lineTo(w * 0.62, h * 0.36);
      ctx.fill();
    },
    lantern(ctx, w, h) {
      // Đèn lồng: a round lantern, caps and a tassel.
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.5, w * 0.17, h * 0.3, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.08);
      ctx.fillRect(w * 0.42, h * 0.8, w * 0.16, h * 0.08);
      ctx.fillRect(w * 0.49, h * 0.88, w * 0.02, h * 0.12);
    },
    lotus(ctx, w, h) {
      [-0.9, -0.45, 0, 0.45, 0.9].forEach((a) => {
        ctx.save();
        ctx.translate(w / 2, h * 0.9);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.38, w * 0.07, h * 0.36, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    },
  };

  const PARADE = [
    { figure: 'lotus', colors: ['255, 120, 170', '255, 220, 235'] },
    { figure: 'star', colors: ['255, 60, 50', '255, 214, 80'] },
    { figure: 'carp', colors: ['255, 150, 50', '255, 230, 140'] },
    { figure: 'lantern', colors: ['255, 70, 60', '255, 200, 90'] },
    { figure: 'heart', colors: ['255, 90, 140', '255, 200, 220'] },
    { figure: 'mai', colors: ['255, 210, 60', '255, 140, 40'] },
    { figure: 'SÔNG NƯỚC', colors: ['120, 220, 255', '200, 160, 255'] },
  ];

  fx.register({
    name: 'boatparade',
    label: 'Diễu hành thuyền hoa trên sông',
    place: 'Lễ hội Sông nước TP.HCM',
    group: 'river',
    spectacle: true,
    weight: 1.1,
    when: (look, stage) => hasRiver(stage) && look.dark > 0.6,
    create(stage) {
      const { W } = stage;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = (W / (34 * 60)) * dir;
      const gap = W * 0.2;
      const boats = fx.shuffle(PARADE).map((spec, i) => {
        const d = 0.5 + (i % 2) * 0.14;
        const { y, s } = fx.onWater(stage, d);
        const draw = DECOR[spec.figure] || fx.figures[spec.figure] || fx.figures.text(spec.figure);
        const wide = !DECOR[spec.figure] && !fx.figures[spec.figure];
        const size = (wide ? 40 : 64) * s;
        return {
          x: dir > 0 ? -i * gap - 60 : W + i * gap + 60,
          wl: y,
          s,
          spec,
          size,
          bulbs: fx.figurePoints(draw, wide ? 90 : 64).map((p) => ({ ...p, phase: rand(0, TAU) })),
          w: wake(5000),
        };
      });
      const travel = W + boats.length * gap + 240;
      const DURATION = (travel / Math.abs(speed)) * FRAME_MS;
      const look = stage.look;
      const glow = fx.glowSprite([255, 230, 200], 16);
      let t = 0;
      return {
        bloom: 0.5,
        update(k, elapsed) {
          t = elapsed;
          boats.forEach((b) => {
            b.x += speed * k;
            b.w.add(b.x - dir * 40 * b.s, b.wl, b.s, t, 0.6);
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 3000);
          boats.forEach((b) => {
            if (b.x < -180 || b.x > W + 180) return;
            const { s, wl } = b;
            b.w.draw(ctx, t, look, a);
            // The hull, dark, its rail outlined with bulbs.
            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgba(10, 12, 18, 0.92)';
            ctx.beginPath();
            ctx.moveTo(b.x - 48 * s, wl - 7 * s);
            ctx.lineTo(b.x + 48 * s, wl - 7 * s);
            ctx.lineTo(b.x + 40 * s, wl);
            ctx.lineTo(b.x - 42 * s, wl);
            ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i <= 12; i++) {
              const bx = b.x - 46 * s + i * 7.7 * s;
              const on = 0.5 + 0.5 * Math.sin(t * 0.006 - i * 0.8);
              ctx.globalAlpha = a * (0.4 + 0.6 * on);
              ctx.fillStyle = `rgb(${b.spec.colors[1]})`;
              ctx.fillRect(bx - 0.9 * s, wl - 7.8 * s, 1.8 * s, 1.8 * s);
            }
            // The decoration in bulbs, colours chasing across it; each bulb's streak on the water.
            const top = wl - 9 * s - b.size;
            b.bulbs.forEach((p) => {
              const x = b.x + p.x * b.size;
              const y = top + (p.y + 0.5) * b.size + Math.sin(t * 0.0018 + b.x * 0.01) * 0.6 * s;
              const chase = 0.5 + 0.5 * Math.sin(t * 0.005 - p.u * 7 + p.phase * 0.2);
              const c = chase > 0.5 ? b.spec.colors[0] : b.spec.colors[1];
              ctx.globalAlpha = a * (0.55 + 0.45 * chase);
              const r = 3.2 * s;
              ctx.drawImage(glow, x - r, y - r, r * 2, r * 2);
              ctx.fillStyle = `rgb(${c})`;
              ctx.fillRect(x - 0.8 * s, y - 0.8 * s, 1.6 * s, 1.6 * s);
              if (p.phase < 1.2) streak(ctx, x, y, wl, s, `rgb(${c})`, 0.22 * a, t, p.phase);
            });
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
          });
        },
      };
    },
  });

  /* ---------- River Festival: a waterfall of fireworks from a barge ---------- */

  fx.register({
    name: 'boatfireworks',
    label: 'Thác pháo hoa trên sông',
    place: 'Lễ hội Sông nước TP.HCM',
    group: 'river',
    spectacle: true,
    rarity: 'uncommon',
    when: (look, stage) => hasRiver(stage) && look.dark > 0.65,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 52000;
      const d = 0.3;
      const { y: wl, s } = fx.onWater(stage, d);
      const cx = rand(0.42, 0.66) * W;
      const span = W * 0.17;
      const barH = 96 * s;
      const nozzles = Array.from({ length: 7 }, (_, i) => cx - span / 2 + (span * i) / 6);
      const palette = ['#ffd27a', '#fff3d6', '#ff7eb6', '#8fe3ff', '#b6ff7a'];
      const sparks = [];
      const MAX = 2600;
      let gerbColor = 0;
      let lastFlash = 0;
      let t = 0;
      const emit = (x, y, vx, vy, color, life) => {
        if (sparks.length < MAX) sparks.push({ x, y, vx, vy, color, life: 1, decay: 1 / life });
      };
      return {
        trails: 0.2,
        bloom: 0.6,
        update(k, elapsed) {
          t = elapsed;
          const fall = t > 8000 && t < DURATION - 9000; // the waterfall
          const finale = t > DURATION - 17000 && t < DURATION - 8000;
          if (fall) {
            for (let i = 0; i < 26 * k; i++) {
              emit(
                cx + rand(-span / 2, span / 2),
                wl - barH,
                rand(-0.08, 0.08) * s,
                rand(0, 0.3) * s,
                Math.random() < 0.8 ? '#ffe2a0' : '#ffffff',
                rand(70, 95),
              );
            }
          }
          // Gerbs: fountains of sparks from the deck, lit one by one, then pulsing together.
          if (Math.floor(t / 6000) !== gerbColor) gerbColor = Math.floor(t / 6000);
          const color = palette[gerbColor % palette.length];
          nozzles.forEach((nx, i) => {
            const on = t > 1000 + i * 900 && t < DURATION - 6000;
            if (!on) return;
            const pulse = finale ? 1 : 0.5 + 0.5 * Math.sin(t * 0.003 - i * 0.9);
            for (let j = 0; j < (finale ? 6 : 3) * pulse * k; j++) {
              const ang = -Math.PI / 2 + rand(-0.12, 0.12) + (finale ? (i - 3) * 0.08 : 0);
              const v = rand(2.6, 4) * s * (finale ? 1.4 : 1);
              emit(nx, wl - 5 * s, Math.cos(ang) * v, Math.sin(ang) * v, color, rand(40, 60));
            }
          });
          sparks.forEach((p) => {
            p.vy += 0.05 * s * k;
            p.vx *= 0.99;
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.life -= p.decay * k;
            if (p.y > wl) p.life = 0; // into the river
          });
          fx.compact(sparks, (p) => p.life > 0);
          // The glow throws warm light up on the haze.
          if ((fall || finale) && t - lastFlash > 350 && stage.flash) {
            lastFlash = t;
            stage.flash(cx, wl - barH, 0.18, [255, 210, 150], 0.22, 500);
          }
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 3000);
          // The barge and its rig, dark against the light.
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(8, 10, 14, 0.95)';
          ctx.fillRect(cx - span * 0.6, wl - 6 * s, span * 1.2, 7 * s);
          ctx.fillRect(cx - span / 2 - 2 * s, wl - barH - 2 * s, 2 * s, barH);
          ctx.fillRect(cx + span / 2, wl - barH - 2 * s, 2 * s, barH);
          ctx.fillRect(cx - span / 2, wl - barH - 2 * s, span, 2 * s);
          ctx.globalCompositeOperation = 'lighter';
          let color = '';
          sparks.forEach((p) => {
            if (p.color !== color) {
              ctx.fillStyle = p.color;
              color = p.color;
            }
            const al = a * p.life ** 1.2;
            ctx.globalAlpha = al;
            ctx.fillRect(p.x - 0.9 * s, p.y - 0.9 * s, 1.8 * s, 1.8 * s);
            // Mirrored in the water below the waterline.
            const ry = wl + (wl - p.y) * 0.55;
            if (ry < H) {
              ctx.globalAlpha = al * 0.3;
              ctx.fillRect(p.x - 0.9 * s + Math.sin(t * 0.006 + p.y) * 1.5 * s, ry, 1.8 * s, 2.6 * s);
            }
          });
          ctx.globalAlpha = 1;
        },
      };
    },
  });

  /* ---------- River Festival: flyboard and jet skis, by day ---------- */

  fx.register({
    name: 'flyboard',
    label: 'Biểu diễn flyboard & mô tô nước',
    place: 'Lễ hội Sông nước · Bến Bạch Đằng',
    group: 'river',
    rarity: 'uncommon',
    when: (look, stage) => hasRiver(stage) && look.dark < 0.35,
    create(stage) {
      const { W } = stage;
      const DURATION = 56000;
      const look = stage.look;
      const fx0 = rand(0.45, 0.7) * W;
      const fd = 0.42;
      const { y: wl, s } = fx.onWater(stage, fd);
      const spray = [];
      const MAX = 1400;
      const dark = 'rgb(30, 34, 44)';
      const white = 'rgb(246, 250, 255)';
      // Two jet skis carving S-curves across the river.
      const skis = [0, 1].map((i) => ({
        phase: i * Math.PI,
        w: wake(4500),
        x: 0,
        d: 0,
        vx: 0,
        color: i ? '#ff4d4d' : '#ffd23f',
      }));
      // The rider's program: rise, hover, flip, dive, come back up...
      const program = [
        [0, 'rest'],
        [3000, 'rise'],
        [7000, 'hover'],
        [11000, 'flip'],
        [12600, 'hover'],
        [17000, 'spin'],
        [19500, 'hover'],
        [23000, 'dive'],
        [25500, 'rest'],
        [28000, 'rise'],
        [32000, 'flip'],
        [33600, 'flip'],
        [35200, 'hover'],
        [42000, 'dive'],
        [44500, 'rest'],
      ];
      let alt = 0;
      let rot = 0;
      let turn = 1; // a 360° spin, seen side-on: the rider narrows, flips, widens again
      let splashed = -1;
      let t = 0;
      const stepOf = (time) => {
        let i = 0;
        while (i < program.length - 1 && program[i + 1][0] <= time) i++;
        const next = program[i + 1] ? program[i + 1][0] : DURATION;
        return {
          name: program[i][1],
          start: program[i][0],
          local: time - program[i][0],
          len: next - program[i][0],
        };
      };
      return {
        update(k, elapsed) {
          t = elapsed;
          const step = stepOf(t);
          const u = step.local / step.len;
          const high = 95 * s;
          let target = alt;
          rot = 0;
          turn = 1;
          if (step.name === 'rest') target = 0;
          else if (step.name === 'rise') target = high * fx.easeInOut(u);
          else if (step.name === 'hover') target = high + Math.sin(t * 0.002) * 6 * s;
          else if (step.name === 'flip') {
            target = high + Math.sin(Math.PI * u) * 30 * s;
            rot = TAU * fx.easeInOut(u);
          } else if (step.name === 'spin') {
            target = high * (0.85 + 0.15 * Math.cos(TAU * u));
            turn = Math.cos(TAU * fx.easeInOut(u));
          } else if (step.name === 'dive') target = high * (1 - fx.easeInOut(u)) - (u > 0.8 ? 6 * s : 0);
          alt += (target - alt) * Math.min(1, 0.2 * k);
          // The jet: water blasting down from the board to the river, spraying out at the surface.
          if (alt > 4 * s) {
            for (let i = 0; i < 9 * k && spray.length < MAX; i++) {
              spray.push({
                x: fx0 + rand(-1.2, 1.2) * s,
                y: wl - alt + rand(0, alt),
                vx: rand(-0.4, 0.4) * s,
                vy: rand(1, 3) * s,
                life: 1,
                d: rand(0.02, 0.04),
              });
            }
            for (let i = 0; i < 6 * k && spray.length < MAX; i++) {
              const ang = rand(Math.PI * 1.05, Math.PI * 1.95);
              const v = rand(1, 3) * s * clamp01(1.4 - alt / high);
              spray.push({
                x: fx0,
                y: wl,
                vx: Math.cos(ang) * v * 1.6,
                vy: Math.sin(ang) * v,
                life: 1,
                d: rand(0.025, 0.05),
              });
            }
          }
          if (step.name === 'dive' && u > 0.85 && splashed !== step.start) {
            splashed = step.start;
            for (let i = 0; i < 40; i++)
              spray.push({
                x: fx0,
                y: wl,
                vx: rand(-3, 3) * s,
                vy: -rand(1, 4) * s,
                life: 1,
                d: rand(0.02, 0.035),
              });
          }
          spray.forEach((p) => {
            p.vy += 0.12 * s * k;
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.life -= p.d * k;
          });
          fx.compact(spray, (p) => p.life > 0 && p.y < wl + 3 * s);
          skis.forEach((sk, i) => {
            const ph = t * 0.00022 + sk.phase;
            const nx = W * (0.5 + 0.48 * Math.sin(ph));
            sk.vx = nx - sk.x;
            sk.x = nx;
            sk.d = 0.35 + 0.28 * Math.sin(ph * 2.3 + i);
            const { y, s: ss } = fx.onWater(stage, sk.d);
            sk.w.add(sk.x - Math.sign(sk.vx) * 6 * ss, y, ss, t, 1.4);
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 3000);
          ctx.globalAlpha = a;
          skis.forEach((sk) => {
            sk.w.draw(ctx, t, look, a);
            const { y, s: ss } = fx.onWater(stage, sk.d);
            const dir = sk.vx >= 0 ? 1 : -1;
            ctx.save();
            ctx.translate(sk.x, y);
            ctx.scale(dir, 1);
            ctx.globalAlpha = a;
            ctx.fillStyle = sk.color;
            ctx.beginPath();
            ctx.moveTo(-9 * ss, 0);
            ctx.lineTo(7 * ss, 0);
            ctx.lineTo(10 * ss, -3 * ss);
            ctx.lineTo(-8 * ss, -3.5 * ss);
            ctx.fill();
            ctx.fillStyle = dark; // the rider, leaning into the turn
            ctx.fillRect(-3 * ss, -9 * ss, 2.2 * ss, 6 * ss);
            ctx.beginPath();
            ctx.arc(-1.8 * ss, -10.5 * ss, 1.5 * ss, 0, TAU);
            ctx.fill();
            ctx.restore();
            // A plume of spray off the stern.
            ctx.fillStyle = white;
            for (let i = 0; i < 6; i++) {
              ctx.globalAlpha = a * 0.5 * (1 - i / 6);
              ctx.fillRect(
                sk.x - dir * (10 + i * 3) * ss,
                y - (2 + Math.sin(t * 0.03 + i) * 1.5 + i * 0.6) * ss,
                2 * ss,
                2 * ss,
              );
            }
          });
          // The jet and the spray.
          if (alt > 4 * s) {
            const g = ctx.createLinearGradient(0, wl - alt, 0, wl);
            g.addColorStop(0, 'rgba(250, 252, 255, 0.85)');
            g.addColorStop(1, 'rgba(250, 252, 255, 0.35)');
            ctx.globalAlpha = a;
            ctx.fillStyle = g;
            ctx.fillRect(fx0 - 1.6 * s, wl - alt, 3.2 * s, alt);
          }
          ctx.fillStyle = white;
          spray.forEach((p) => {
            ctx.globalAlpha = a * p.life * 0.7;
            ctx.fillRect(p.x, p.y, 1.5 * s, 1.5 * s);
          });
          // The rider on the board.
          if (alt > 1) {
            ctx.save();
            ctx.globalAlpha = a;
            ctx.translate(fx0, wl - alt);
            ctx.rotate(rot);
            ctx.scale(turn * 1.5, 1.5); // a little larger than life, to read at this distance
            ctx.fillStyle = dark;
            ctx.fillRect(-5 * s, -1 * s, 10 * s, 2 * s); // board
            ctx.fillRect(-1.2 * s, -11 * s, 2.4 * s, 10 * s); // body
            ctx.beginPath();
            ctx.arc(0, -13 * s, 2 * s, 0, TAU);
            ctx.fill();
            ctx.fillRect(-5 * s, -9 * s, 10 * s, 1.2 * s); // arms out for balance
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
