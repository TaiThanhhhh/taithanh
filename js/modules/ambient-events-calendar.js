/**
 * @file Calendar & Cultural Special Events for Ambient Saigon.
 *
 * Distinct event experiences tied to Vietnamese cultural occasions and real-world milestones:
 *  - Tết Nguyên Đán (Lunar New Year): Hoa mai blossoms, floating water lanterns, Landmark 81 spring show.
 *  - Đêm Giao Thừa (New Year Countdown): Midnight countdown, grand river fireworks, golden willow cascades.
 *  - Quốc Khánh 2/9 (Vietnam National Day): Landmark 81 illuminated in national flag colors (red & gold).
 *  - Tết Trung Thu (Mid-Autumn Festival): Giant golden harvest moon halo, floating carp lanterns.
 *  - Cuối Tuần (Weekend Sunset): Relaxed Saigon riverfront kite festival over Thủ Thiêm.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, envelope } = fx;

  /* ---------- Tết Nguyên Đán (Lunar New Year) ---------- */

  fx.register({
    name: 'tet',
    label: 'Tết Sài Gòn: Hoa mai vàng & Đèn hoa đăng',
    weight: 2.0,
    when: (_look) => {
      const state = Portfolio.ambientCalendar?.getState();
      return state?.activeHoliday?.id === 'tet';
    },
    create(stage) {
      const { H } = stage;
      const DURATION = 38000;
      let t = 0;

      // 1. Drifting yellow Mai blossoms (hoa mai)
      const maiSprite = fx.sprite(28, 28, (ctx) => {
        const cx = 14;
        const cy = 14;
        const petals = 5;
        ctx.fillStyle = '#fbbf24';
        for (let i = 0; i < petals; i++) {
          const angle = (i * TAU) / petals;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(angle) * 6, cy + Math.sin(angle) * 6, 5.5, 3.5, angle, 0, TAU);
          ctx.fill();
        }
        // Golden orange core
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, TAU);
        ctx.fillStyle = '#ea580c';
        ctx.fill();
      });

      const maiFallers = fx.fallers(stage, {
        count: 55,
        releaseMs: 25000,
        duration: DURATION,
        size: [14, 26],
        fall: [0.8, 1.8],
        spin: [0.015, 0.04],
        mode: 'tumble',
        sprite: () => maiSprite,
      });

      // 2. Floating red and gold lanterns
      const lanternSprite = fx.sprite(22, 28, (ctx) => {
        const grad = ctx.createLinearGradient(0, 0, 0, 28);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.3, '#f59e0b');
        grad.addColorStop(1, '#dc2626');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(11, 14, 8, 12, 0, 0, TAU);
        ctx.fill();
        // Golden tassel
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(11, 26);
        ctx.lineTo(11, 28);
        ctx.stroke();
      });

      const lanternRisers = fx.risers(stage, {
        count: 36,
        releaseMs: 28000,
        duration: DURATION,
        spread: 0.65,
        size: [14, 24],
        rise: [0.6, 1.4],
        flicker: 0.2,
        sprite: () => lanternSprite,
      });

      return {
        update(k, elapsed) {
          t = elapsed;
          const fAlive = maiFallers.update(k, elapsed);
          const rAlive = lanternRisers.update(k, elapsed);
          return fAlive || rAlive;
        },
        back(ctx) {
          lanternRisers.back(ctx);
        },
        front(ctx) {
          maiFallers.front(ctx);

          // Landmark 81 festive spring illumination
          const L = stage.landmark;
          if (L) {
            const a = envelope(t, DURATION, 2000, 2000);
            if (a > 0) {
              ctx.save();
              stage.traceLandmark(ctx);
              ctx.clip();
              const top = H - L.h;
              const left = L.x - L.w / 2;
              for (let y = top; y < H; y += 3) {
                const v = (H - y) / L.h;
                const wave = Math.sin(v * 8 - t * 0.003);
                ctx.globalAlpha = 0.85 * a;
                ctx.fillStyle = wave > 0 ? '#fbbf24' : '#ef4444';
                ctx.fillRect(left, y, L.w, 2);
              }
              ctx.restore();
            }
          }
        },
      };
    },
  });

  /* ---------- Quốc Khánh 2/9 (Vietnam National Day) ---------- */

  fx.register({
    name: 'nationalday',
    label: 'Quốc Khánh 2/9: Cờ Đỏ Sao Vàng rực sáng',
    weight: 2.0,
    when: (look) => {
      const state = Portfolio.ambientCalendar?.getState();
      return state?.activeHoliday?.id === 'nationalday' && look.dark > 0.4;
    },
    create(stage) {
      const { H } = stage;
      const L = stage.landmark;
      const top = H - L.h;
      const left = L.x - L.w / 2;
      const DURATION = 36000;
      let t = 0;

      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;

          ctx.save();
          stage.traceLandmark(ctx);
          ctx.clip();

          // Crimson red tower body with golden star pulse in the middle
          for (let y = top; y < H; y += 3) {
            const v = (H - y) / L.h;
            // Golden star zone in the upper-mid section of Landmark 81
            const isStarBand = v > 0.52 && v < 0.72;
            const starPulse = 0.85 + 0.15 * Math.sin(t * 0.0035);

            ctx.globalAlpha = 0.9 * a;
            ctx.fillStyle = isStarBand ? '#facc15' : '#dc2626';
            if (isStarBand) ctx.globalAlpha *= starPulse;
            ctx.fillRect(left, y, L.w, 2);
          }
          ctx.restore();

          // Spire beacon beam pointing skyward
          ctx.save();
          ctx.globalAlpha = 0.45 * a * (0.8 + 0.2 * Math.sin(t * 0.005));
          const beamGrad = ctx.createLinearGradient(L.x, top, L.x, top - H * 0.4);
          beamGrad.addColorStop(0, 'rgba(250, 204, 21, 0.8)');
          beamGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(L.x - 2, top);
          ctx.lineTo(L.x + 2, top);
          ctx.lineTo(L.x + 14, top - H * 0.4);
          ctx.lineTo(L.x - 14, top - H * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        },
      };
    },
  });

  /* ---------- Tết Trung Thu (Mid-Autumn Harvest Moon) ---------- */

  fx.register({
    name: 'midautumn',
    label: 'Tết Trung Thu: Đêm Rằm & Đèn Lồng Cá Chép',
    weight: 2.0,
    when: (look) => {
      const state = Portfolio.ambientCalendar?.getState();
      return state?.activeHoliday?.id === 'midautumn' && look.dark > 0.6;
    },
    create(stage) {
      const { W, H } = stage;
      const DURATION = 36000;
      let t = 0;

      // Carp lantern sprite
      const carpSprite = fx.sprite(32, 22, (ctx) => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(14, 11, 12, 7, 0, 0, TAU);
        ctx.fill();
        // Tail fin
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(2, 11);
        ctx.lineTo(-4, 4);
        ctx.lineTo(-2, 11);
        ctx.lineTo(-4, 18);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(22, 9, 2.5, 0, TAU);
        ctx.fill();
      });

      const risers = fx.risers(stage, {
        count: 24,
        releaseMs: 24000,
        duration: DURATION,
        spread: 0.55,
        size: [22, 34],
        rise: [0.5, 1.2],
        flicker: 0.15,
        sprite: () => carpSprite,
      });

      return {
        update(k, elapsed) {
          t = elapsed;
          return risers.update(k, elapsed);
        },
        back(ctx) {
          // Lunar corona / golden harvest moon glow
          const a = envelope(t, DURATION, 3000, 3000);
          if (a > 0 && stage.look?.moon) {
            const moon = stage.look.moon;
            const mx = moon.x * W;
            const my = moon.y * H;
            const r = H * 0.22;
            const grad = ctx.createRadialGradient(mx, my, 0, mx, my, r);
            grad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
            grad.addColorStop(0.4, 'rgba(251, 191, 36, 0.08)');
            grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = grad;
            ctx.fillRect(mx - r, my - r, r * 2, r * 2);
            ctx.restore();
          }

          risers.back(ctx);
        },
      };
    },
  });

  /* ---------- Đêm Giao Thừa (New Year Countdown & Grand Finale) ---------- */

  fx.register({
    name: 'newyear',
    label: 'Đón Năm Mới: Đêm Giao Thừa Sài Gòn',
    weight: 2.5,
    when: (look) => {
      const state = Portfolio.ambientCalendar?.getState();
      return state?.activeHoliday?.id === 'newyear' && look.dark > 0.65;
    },
    create(stage) {
      const { W, H } = stage;
      const DURATION = 42000;
      let t = 0;
      const sparks = [];

      return {
        update(k, elapsed) {
          t = elapsed;
          // Spawn celebratory golden champagne sparks near Landmark 81
          if (t < DURATION - 4000 && Math.random() < 0.6) {
            const ox = (stage.landmark?.x || 0.73) * W + rand(-40, 40);
            const oy = H - (stage.landmark?.h || 0.5) * H;
            sparks.push({
              x: ox,
              y: oy,
              vx: rand(-2.5, 2.5),
              vy: rand(-4.5, -1.5),
              life: 1,
              decay: rand(0.015, 0.03),
              color: Math.random() < 0.7 ? '#fbbf24' : '#ffffff',
            });
          }

          // Step sparks
          for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx * k;
            s.y += s.vy * k;
            s.vy += 0.08 * k; // gravity
            s.life -= s.decay * k;
            if (s.life <= 0) sparks.splice(i, 1);
          }

          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 2000, 3000);
          if (a <= 0) return;

          ctx.save();
          ctx.globalAlpha = a;
          sparks.forEach((s) => {
            ctx.fillStyle = s.color;
            ctx.globalAlpha = a * s.life;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 1.8, 0, TAU);
            ctx.fill();
          });
          ctx.restore();
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
