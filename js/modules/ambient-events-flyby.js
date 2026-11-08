/**
 * @file Ambient fly-bys (registered with ambient-events.js). Small details between the
 * big events: a plane and its contrail, birds in a V, a plane on approach to Tan Son
 * Nhat with its landing lights, a helicopter, bats at dusk, swallows, a paper plane.
 * And one big event: a small plane towing a banner.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, pick, envelope, smooth } = fx;
  const FRAME_MS = Portfolio.motion.FRAME_MS;
  const { css } = Portfolio.AmbientCycle;

  const lerp = (a, b, u) => a + (b - a) * u;

  /* ---------- A plane and its contrail ---------- */

  fx.register({
    name: 'contrail',
    label: 'Vệt khói máy bay',
    tier: 'detail',
    when: (look) => look.dark < 0.4,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const CROSS = rand(34000, 44000);
      const LIFE = 24000; // how long the trail stays before it has spread out into nothing
      const DURATION = CROSS + LIFE;
      const y0 = rand(0.08, 0.3) * H;
      const climb = rand(-0.1, 0.1) * H;
      const at = (p) => ({ x: dir > 0 ? (p * 1.08 - 0.04) * W : (1.04 - p * 1.08) * W, y: y0 + climb * p });
      const heading = Math.atan2(climb, dir * 1.08 * W);
      const trail = [];
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          const last = trail[trail.length - 1];
          if (t < CROSS && (!last || t - last.t > 150)) trail.push({ ...at(t / CROSS), t });
          while (trail.length && t - trail[0].t > LIFE) trail.shift();
          return t < DURATION;
        },
        back(ctx) {
          // White, tinted by the light of the hour (pink at golden hour).
          const tint = fx
            .mix([255, 255, 255], stage.look.cloudBase.slice(0, 3), 0.4)
            .map(Math.round)
            .join(', ');
          for (let i = 1; i < trail.length; i++) {
            const age = (t - trail[i].t) / LIFE;
            ctx.strokeStyle = `rgba(${tint}, ${0.75 * (1 - age) ** 1.5})`;
            ctx.lineWidth = (2 + age * 9) * scale; // spreads as it ages
            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
          }
          if (t >= CROSS) return;
          const p = at(t / CROSS);
          ctx.translate(p.x, p.y);
          ctx.rotate(heading);
          ctx.scale(scale * 1.4, scale * 1.4);
          ctx.fillStyle = 'rgba(70, 76, 92, 0.9)';
          ctx.fillRect(-5, -0.7, 10, 1.4); // fuselage
          ctx.beginPath(); // swept wings
          ctx.moveTo(1, 0);
          ctx.lineTo(-2.5, -4.5);
          ctx.lineTo(-1, 0);
          ctx.lineTo(-2.5, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(-5, -2, 1.2, 4); // tail
        },
      };
    },
  });

  /* ---------- Migrating birds in a V ---------- */

  fx.register({
    name: 'birds',
    label: 'Đàn chim bay chữ V',
    tier: 'detail',
    when: (look) => look.dark < 0.6,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const count = 2 * Math.round(rand(4, 7)) + 1;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = rand(1.1, 1.5) * scale; // px per 60fps frame
      const y0 = rand(0.1, 0.36) * H;
      const spacing = 20 * scale;
      const travel = W + 120 * scale + count * spacing;
      const DURATION = (travel / speed) * FRAME_MS;
      const wing = 8 * scale;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const lead = (t / FRAME_MS) * speed - 60 * scale;
          const x = dir > 0 ? lead : W - lead;
          ctx.strokeStyle = css([...stage.look.birds, 0.85]);
          ctx.lineWidth = 1.8 * scale;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            const rank = Math.ceil(i / 2);
            const side = i % 2 ? 1 : -1;
            const bx = x - dir * rank * spacing;
            const by = y0 + rank * spacing * 0.62 * side + Math.sin(t * 0.0013 + i) * 2 * scale;
            const flap = Math.sin(t * 0.011 + i * 0.9);
            const tip = by - flap * 3 * scale - 1;
            const bend = by - 2 * scale - flap * 2 * scale;
            ctx.moveTo(bx - wing, tip);
            ctx.quadraticCurveTo(bx - wing * 0.4, bend, bx, by);
            ctx.quadraticCurveTo(bx + wing * 0.4, bend, bx + wing, tip);
          }
          ctx.stroke();
        },
      };
    },
  });

  /* ---------- A plane on approach to Tan Son Nhat ---------- */

  fx.register({
    name: 'landing',
    label: 'Máy bay hạ cánh Tân Sơn Nhất',
    tier: 'detail',
    when: (look) => look.dark > 0.45,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = rand(32000, 42000);
      const fromLeft = Math.random() < 0.5;
      const start = { x: (fromLeft ? -0.05 : 1.05) * W, y: rand(0.06, 0.16) * H };
      const end = { x: (fromLeft ? rand(0.45, 0.8) : rand(0.2, 0.55)) * W, y: H * 0.97 }; // lands behind the city
      const landing = fx.glowSprite([255, 248, 230], 64);
      const red = fx.glowSprite([255, 60, 60], 16);
      const green = fx.glowSprite([80, 255, 140], 16);
      const white = fx.glowSprite([255, 255, 255], 16);
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const p = (t / DURATION) ** 1.15;
          const x = lerp(start.x, end.x, p);
          const y = lerp(start.y, end.y, p);
          const near = 0.6 + 1.4 * p; // it grows as it comes closer
          const a = smooth(t / 3000);
          ctx.globalCompositeOperation = 'lighter';
          // The landing lights: the bright "star" you notice first, long before the plane.
          const r = 30 * near * scale;
          ctx.globalAlpha = 0.95 * a;
          ctx.drawImage(landing, x - r, y - r, r * 2, r * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
          // Wingtip lights (red on the plane's left, so on our right as it comes towards us).
          const span = 9 * near * scale;
          const s = 6 * scale;
          ctx.globalAlpha = 0.85 * a;
          ctx.drawImage(red, x + span - s / 2, y - s / 2, s, s);
          ctx.drawImage(green, x - span - s / 2, y - s / 2, s, s);
          // White strobes: a double flash every 1.2 s.
          const ph = t % 1200;
          if (ph < 60 || (ph > 140 && ph < 200)) {
            ctx.drawImage(white, x + span - s, y - s, s * 2, s * 2);
            ctx.drawImage(white, x - span - s, y - s, s * 2, s * 2);
          }
          // Red beacon under the belly.
          if (t % 1000 < 120) ctx.drawImage(red, x - s / 2, y + 2 * near * scale - s / 2, s, s);
        },
      };
    },
  });

  /* ---------- A helicopter ---------- */

  fx.register({
    name: 'helicopter',
    label: 'Trực thăng',
    tier: 'detail',
    when: () => true,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = rand(34000, 42000);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y0 = rand(0.2, 0.42) * H;
      const night = stage.look.dark > 0.5;
      const searchlight = night && Math.random() < 0.6;
      const red = fx.glowSprite([255, 60, 60], 16);
      const white = fx.glowSprite([255, 255, 255], 16);
      let beam = null;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const p = t / DURATION;
          const x = (dir > 0 ? lerp(-0.05, 1.05, p) : lerp(1.05, -0.05, p)) * W;
          const y = y0 + Math.sin(t * 0.002) * 3 * scale;
          if (searchlight) {
            if (!beam) {
              beam = ctx.createLinearGradient(0, 0, 0, H);
              beam.addColorStop(0, 'rgba(235, 240, 255, 0.16)');
              beam.addColorStop(1, 'rgba(235, 240, 255, 0)');
            }
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(x, y + 4 * scale);
            ctx.rotate(Math.sin(t * 0.0007) * 0.35);
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(-1.5, 0);
            ctx.lineTo(1.5, 0);
            ctx.lineTo(H * 0.07, H);
            ctx.lineTo(-H * 0.07, H);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          // Silhouette: cabin, tail boom, skids and a blurred rotor.
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(dir * scale * 1.3, scale * 1.3);
          ctx.fillStyle = night ? 'rgba(14, 14, 22, 0.9)' : 'rgba(48, 54, 68, 0.9)';
          ctx.strokeStyle = ctx.fillStyle;
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 5, 0, 0, TAU);
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-6, -1);
          ctx.lineTo(-22, -2);
          ctx.lineTo(-24, -6);
          ctx.moveTo(-6, 6.5);
          ctx.lineTo(7, 6.5);
          ctx.moveTo(-3, 4.5);
          ctx.lineTo(-3, 6.5);
          ctx.moveTo(4, 4.5);
          ctx.lineTo(4, 6.5);
          ctx.stroke();
          ctx.globalAlpha = 0.5;
          const rotor = 16 * (0.6 + 0.4 * Math.abs(Math.sin(t * 0.09)));
          ctx.beginPath();
          ctx.moveTo(-rotor, -6.5);
          ctx.lineTo(rotor, -6.5);
          ctx.stroke();
          ctx.restore();
          // Anti-collision lights.
          ctx.globalCompositeOperation = 'lighter';
          const s = 7 * scale;
          if (t % 1000 < 120) ctx.drawImage(red, x - s / 2, y - 8 * scale - s / 2, s, s);
          if (night && t % 1500 > 700 && t % 1500 < 760)
            ctx.drawImage(white, x - dir * 26 * scale - s, y - s, s * 2, s * 2);
        },
      };
    },
  });

  /* ---------- Bats out at dusk ---------- */

  fx.register({
    name: 'bats',
    label: 'Dơi bay lúc chạng vạng',
    tier: 'detail',
    when: (look) => look.dark > 0.4 && look.dark < 0.95,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 22000;
      const home = rand(0.2, 0.8) * W; // they pour out of one old building
      const bats = Array.from({ length: Math.round(rand(6, 10)) }, () => ({
        x: home + rand(-30, 30) * scale,
        y: H * rand(0.78, 0.86),
        vx: rand(-2, 2) * scale,
        vy: -rand(0.5, 1.5) * scale,
        size: rand(0.8, 1.3) * scale,
        phase: rand(0, TAU),
        turnAt: rand(200, 600),
        at: rand(0, 4000),
      }));
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          bats.forEach((b) => {
            if (t < b.at) return;
            // Jerky, darting flight: a new heading every fraction of a second.
            if (t > b.turnAt) {
              b.vx = rand(-2.6, 2.6) * scale;
              b.vy = (rand(-1.2, 0.6) - 0.25) * scale;
              b.turnAt = t + rand(150, 500);
            }
            b.x += b.vx * k;
            b.y += b.vy * k;
          });
          return t < DURATION;
        },
        back(ctx) {
          ctx.globalAlpha = envelope(t, DURATION, 1, 3000);
          ctx.fillStyle = 'rgba(14, 12, 20, 0.9)';
          bats.forEach((b) => {
            if (t < b.at) return;
            const flap = Math.sin(t * 0.045 + b.phase);
            const w = 7 * b.size;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.beginPath();
            [-1, 1].forEach((side) => {
              ctx.moveTo(0, 0);
              ctx.quadraticCurveTo(side * w * 0.5, -flap * w * 0.6 - 2, side * w, -flap * w * 0.4);
              ctx.quadraticCurveTo(side * w * 0.6, 1, side * w * 0.3, 1.5);
              ctx.lineTo(0, 1);
            });
            ctx.fill();
            ctx.restore();
          });
        },
      };
    },
  });

  /* ---------- Swallows swooping ---------- */

  fx.register({
    name: 'swallows',
    label: 'Chim én lượn',
    tier: 'detail',
    when: (look) => look.dark < 0.6,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 16000;
      const birds = Array.from({ length: Math.round(rand(3, 6)) }, () => {
        const dir = Math.random() < 0.5 ? 1 : -1;
        return {
          at: rand(0, 6000),
          dir,
          x0: (dir > 0 ? -0.05 : 1.05) * W,
          y0: rand(0.25, 0.6) * H,
          speed: rand(7, 11) * scale,
          amp: rand(0.04, 0.12) * H,
          freq: rand(0.0015, 0.003),
          phase: rand(0, TAU),
        };
      });
      const at = (b, age) => ({
        x: b.x0 + (b.dir * b.speed * age) / FRAME_MS,
        y: b.y0 + b.amp * Math.sin(age * b.freq + b.phase) + b.amp * 0.4 * Math.sin(age * b.freq * 2.3),
      });
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          ctx.fillStyle = css([...stage.look.birds, 0.9]);
          birds.forEach((b) => {
            const age = t - b.at;
            if (age < 0) return;
            const p = at(b, age);
            const q = at(b, age + 30);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x));
            ctx.scale(scale * 2, scale * 2);
            const beat = 0.6 + 0.4 * Math.sin(age * 0.03); // mostly gliding
            ctx.beginPath();
            ctx.ellipse(0, 0, 5, 1.6, 0, 0, TAU); // body
            [-1, 1].forEach((side) => {
              // Swept, crescent wings.
              ctx.moveTo(1, 0);
              ctx.quadraticCurveTo(-1, side * 4 * beat, -5, side * 8 * beat);
              ctx.quadraticCurveTo(-2, side * 3 * beat, -1.5, 0);
              // Forked tail.
              ctx.moveTo(-4, 0);
              ctx.lineTo(-10, side * 2.4);
              ctx.lineTo(-6, 0);
            });
            ctx.fill();
            ctx.restore();
          });
        },
      };
    },
  });

  /* ---------- A paper plane ---------- */

  fx.register({
    name: 'paperplane',
    label: 'Máy bay giấy',
    tier: 'detail',
    when: (look) => look.dark < 0.75,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = rand(12000, 16000);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y0 = rand(0.3, 0.6) * H;
      const drop = rand(0.05, 0.15) * H;
      const loop = Math.random() < 0.6; // sometimes a loop-the-loop on the way
      const R = rand(0.05, 0.08) * H;
      const shade = fx.mix([255, 255, 255], [120, 130, 160], stage.look.dark);
      const light = css(shade);
      const dark = css(fx.mix(shade, [150, 156, 170], 0.3));
      const at = (u) => {
        const along = (u < 0.4 ? u : u < 0.55 ? 0.4 : u - 0.15) / 0.85; // holds still in x while it loops
        const p = {
          x: (dir > 0 ? lerp(-0.08, 1.08, along) : lerp(1.08, -0.08, along)) * W,
          y: y0 + drop * along + Math.sin(along * TAU * 1.5) * 0.015 * H, // gentle porpoising
        };
        if (loop && u > 0.4 && u < 0.55) {
          const th = ((u - 0.4) / 0.15) * TAU;
          p.x += dir * R * Math.sin(th);
          p.y -= R * (1 - Math.cos(th));
        }
        return p;
      };
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const u = t / DURATION;
          const p = at(u);
          const q = at(u + 0.002);
          ctx.globalAlpha = stage.look.dark > 0.5 ? 0.7 : 1;
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x));
          ctx.scale(2.2 * scale, 2.2 * scale);
          ctx.fillStyle = light;
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-8, -5);
          ctx.lineTo(-5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = dark;
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-8, 4);
          ctx.lineTo(-5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(110, 116, 130, 0.6)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-6, 1.5);
          ctx.stroke();
        },
      };
    },
  });

  /* ---------- A plane towing a banner ---------- */

  fx.register({
    name: 'banner',
    label: 'Máy bay kéo băng rôn',
    when: (look) => look.dark < 0.35,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const messages = Portfolio.config.ambient.bannerMessages || ['XIN CHÀO SÀI GÒN'];
      const text = pick(messages);
      const ink = stage.colors[0];
      const font = '700 30px poppins, "Segoe UI", sans-serif';
      const probe = document.createElement('canvas').getContext('2d');
      probe.font = font;
      const sprite = fx.sprite(probe.measureText(text).width + 48, 44, (ctx, w, h) => {
        ctx.fillStyle = 'rgb(255, 252, 242)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, w, 3);
        ctx.fillRect(0, h - 3, w, 3);
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2 + 1);
      });
      const bh = 26 * scale;
      const bw = (sprite.width / sprite.height) * bh;
      const rope = 46 * scale;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = rand(0.14, 0.3) * H;
      const DURATION = 50000;
      const travel = W + bw + rope + 160 * scale;
      const SLICES = Math.ceil(bw / (5 * scale));
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const run = (t / DURATION) * travel - 60 * scale;
          const px = dir > 0 ? run : W - run;
          const py = y + Math.sin(t * 0.0012) * 4 * scale;
          // Rope, then the banner rippling more and more towards its free end.
          const start = px - dir * (rope + 14 * scale);
          ctx.strokeStyle = 'rgba(60, 60, 70, 0.6)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(px - dir * 14 * scale, py);
          ctx.lineTo(start, py);
          ctx.stroke();
          const left = dir > 0 ? start - bw : start;
          const sw = sprite.width / SLICES;
          for (let i = 0; i < SLICES; i++) {
            const fromPlane = dir > 0 ? SLICES - 1 - i : i;
            const ripple = Math.sin(t * 0.008 - fromPlane * 0.35) * 3 * scale * (fromPlane / SLICES + 0.15);
            ctx.drawImage(
              sprite,
              i * sw,
              0,
              sw + 0.5,
              sprite.height,
              left + (i * bw) / SLICES,
              py - bh / 2 + ripple,
              bw / SLICES + 0.5,
              bh,
            );
          }
          // A small propeller plane.
          ctx.translate(px, py);
          ctx.scale(dir * scale * 1.4, scale * 1.4);
          ctx.fillStyle = 'rgba(56, 62, 78, 0.95)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 2.2, 0, 0, TAU);
          ctx.fill();
          ctx.fillRect(-3, -1, 4, 7); // wing, seen slightly from below
          ctx.fillRect(-10, -5, 2, 5); // tail fin
          ctx.globalAlpha = 0.5;
          ctx.fillRect(10, -3 * Math.abs(Math.sin(t * 0.1)), 1, 6 * Math.abs(Math.sin(t * 0.1))); // propeller
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
