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
    when: (_look) => true,
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
    when: (look) => look.dark > 0.35,
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
    when: (look) => look.dark > 0.45,
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
    when: (look) => look.dark > 0.5,
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

  /* ---------- Các Sự Kiện Văn Hóa & Lễ Hội Sài Gòn Mở Rộng ---------- */

  // 5. Đêm 30 Tết: Đếm ngược Giao Thừa & Pháo hoa
  fx.register({
    name: 'tet_countdown',
    label: 'Đêm 30 Tết: Đếm ngược Giao Thừa Sài Gòn',
    weight: 2.0,
    when: (look) => look.dark > 0.7,
    create(stage) {
      const { H } = stage;
      const L = stage.landmark;
      const DURATION = 35000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          if (t > 4000 && t < 12000 && Math.random() < 0.1) {
            Portfolio.ambientEnvironment?.notifyDisturbance(L ? L.x : 500, H * 0.4, 300, 1.5);
          }
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 2000);
          if (a <= 0 || !L) return;
          ctx.save();
          stage.traceLandmark(ctx);
          ctx.clip();
          const top = H - L.h;
          const left = L.x - L.w / 2;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(left, top, L.w, L.h);
          // Golden countdown pulse
          const pulse = (Math.sin(t * 0.008) + 1) * 0.5;
          ctx.fillStyle = `rgba(251, 191, 36, ${0.4 + 0.5 * pulse})`;
          ctx.fillRect(left, top + L.h * (1 - (t / DURATION) * 0.6), L.w, 8);
          ctx.restore();
        },
      };
    },
  });

  // 6. Múa Lân Sư Rồng phố Chợ Lớn
  fx.register({
    name: 'tet_lion_dance',
    label: 'Múa Lân Sư Rồng Phố Người Hoa Chợ Lớn',
    weight: 1.5,
    when: (look) => look.dark > 0.3,
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
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.95;

          // Celebration waving ribbons
          const ribbons = 7;
          for (let i = 0; i < ribbons; i++) {
            const rx = W * 0.15 + (i * W * 0.7) / ribbons + Math.sin(t * 0.002 + i) * 35;
            const ry = H * 0.72 + Math.cos(t * 0.003 + i) * 25;
            ctx.strokeStyle = i % 2 === 0 ? '#ef4444' : '#fbbf24';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(rx - 25, ry);
            ctx.quadraticCurveTo(rx, ry - 30, rx + 25, ry);
            ctx.stroke();
          }

          // Golden celebration confetti particles
          for (let c = 0; c < 16; c++) {
            const cx = (W * 0.2 + c * 48 + Math.sin(t * 0.003 + c) * 30) % W;
            const cy = (H * 0.65 + t * 0.02 + c * 20) % H;
            ctx.fillStyle = c % 2 === 0 ? '#fbbf24' : '#f87171';
            ctx.fillRect(cx, cy, 3.5, 3.5);
          }

          // Lead Lion (Đầu Lân Đại Sư Hoàng Kim) - performing dynamic leaps & bows
          const u = t / DURATION;
          const lion1X = W * 0.25 + u * (W * 0.5) + Math.sin(t * 0.003) * 30;
          const hop1 = Math.abs(Math.sin(t * 0.007)) * 26;
          const lion1Y = H * 0.82 - hop1;
          fx.drawLionDanceHead(ctx, lion1X, lion1Y, 1.45, t);

          // Escort Lion (Tiểu Lân Song Hỷ) - playful rhythmic following
          const lion2X = lion1X - 75 + Math.cos(t * 0.004) * 20;
          const hop2 = Math.abs(Math.sin(t * 0.007 + 0.8)) * 20;
          const lion2Y = H * 0.84 - hop2;
          fx.drawLionDanceHead(ctx, lion2X, lion2Y, 1.1, t + 500);

          ctx.restore();
        },
      };
    },
  });

  // 7. Phố Ông Đồ Nhà Văn Hóa Thanh Niên
  fx.register({
    name: 'tet_calligraphy',
    label: 'Phố Ông Đồ: Mực Tàu & Giấy Đỏ Ngày Xuân',
    weight: 1.5,
    when: (_look) => true,
    create(stage) {
      const DURATION = 30000;
      const scrolls = fx.risers(stage, {
        count: 24,
        releaseMs: 22000,
        duration: DURATION,
        size: [12, 22],
        rise: [0.4, 1.0],
        sprite: () =>
          fx.sprite(20, 28, (ctx) => {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(2, 2, 16, 24);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(6, 6, 8, 16);
          }),
      });
      return {
        update(k, elapsed) {
          return scrolls.update(k, elapsed);
        },
        back(ctx) {
          scrolls.back(ctx);
        },
      };
    },
  });

  // 8. Bến Bình Đông: Thuyền Hoa Tấp Nập
  fx.register({
    name: 'tet_flower_boat',
    label: 'Bến Bình Đông: Chợ Hoa Xuân Trên Bến Dưới Thuyền',
    weight: 1.8,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 36000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2500, 2500);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.95;

          const isNight = stage.look.dark > 0.45;
          const u = t / DURATION;

          // Lead Wooden Flower Boat (Ghe Hoa Miền Tây Bến Bình Đông)
          const b1x = -80 + u * (W + 160);
          const b1y = H * 0.88 + Math.sin(t * 0.003) * 3;
          fx.drawFlowerBoat(ctx, b1x, b1y, 1.25, 1, isNight, t);

          // Second Flower Boat sailing along in gentle distance
          const b2x = b1x - 120;
          const b2y = H * 0.86 + Math.sin(t * 0.003 + 1.2) * 2.5;
          if (b2x > -80 && b2x < W + 80) {
            fx.drawFlowerBoat(ctx, b2x, b2y, 0.92, 1, isNight, t + 300);
          }

          // Floating golden petals along the water surface
          for (let i = 0; i < 14; i++) {
            const px = ((W * 0.05 + (i * W) / 14 + t * 0.015) % (W + 40)) - 20;
            const py = H * 0.9 + Math.sin(t * 0.004 + i) * 3;
            fx.drawMaiBlossom(ctx, px, py, 3.5, i + t * 0.001);
          }

          ctx.restore();
        },
      };
    },
  });

  // 9. Diễu hành bay Trực thăng kéo cờ Tổ Quốc (2/9)
  fx.register({
    name: 'nationalday_parade',
    label: 'Quốc Khánh: Trực Thăng Kéo Cờ Đỏ Sao Vàng',
    tier: 'major',
    weight: 2.2,
    when: (look) => look.dark < 0.6,
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
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          const u = t / DURATION;
          const leadX = -120 + u * (W + 260);
          const leadY = H * 0.26 + Math.sin(u * 8) * 8;
          ctx.save();
          ctx.globalAlpha = a * 0.95;

          const isNight = stage.look.dark > 0.5;

          // Lead Mil/Utility Helicopter
          fx.drawHelicopter(ctx, leadX, leadY, 1.35, 1, isNight, t, {
            hasSearchlight: false,
            lightColor: '#22c55e',
          });

          // Tow cable suspending the flag from cargo belly
          const flagX = leadX - 64;
          const flagY = leadY + 18;
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(leadX - 4, leadY + 8);
          ctx.lineTo(flagX, flagY);
          ctx.moveTo(leadX - 4, leadY + 8);
          ctx.lineTo(flagX, flagY + 36);
          ctx.stroke();

          // Parametric Billowing National Flag (Cờ Đỏ Sao Vàng với gợn sóng lụa chân thực)
          fx.drawWavingFlag(ctx, flagX, flagY, 56, 36, t, 0.007);

          // Escort Wingman Helicopter in formation echelon
          const wingX = leadX - 95;
          const wingY = leadY - 32 + Math.sin(u * 8 + 0.5) * 5;
          fx.drawHelicopter(ctx, wingX, wingY, 0.95, 1, isNight, t + 150, {
            hasSearchlight: false,
            lightColor: '#22c55e',
          });

          ctx.restore();
        },
      };
    },
  });

  // 10. Đại tiệc pháo hoa tầm cao hầm Thủ Thiêm (2/9)
  fx.register({
    name: 'nationalday_fireworks',
    label: 'Quốc Khánh: Pháo Hoa Tầm Cao Hầm Thủ Thiêm',
    tier: 'major',
    weight: 2.5,
    when: (look) => look.dark > 0.65,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 38000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          if (t % 2500 < 60) {
            Portfolio.ambientEnvironment?.illumination.flash(0.7, [239, 68, 68], 0.88);
            Portfolio.ambientEnvironment?.notifyDisturbance(W * 0.5, H * 0.35, 280, 1.2);
          }
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 1500, 2500);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a;
          const cx = W * 0.52;
          const cy = H * 0.32;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(cx, cy, 40 * (1 + Math.sin(t * 0.005) * 0.2), 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(cx, cy, 18, 0, TAU);
          ctx.fill();
          ctx.restore();
        },
      };
    },
  });

  // 11. Đêm hội Trăng Rằm rước đèn ông sao
  fx.register({
    name: 'midautumn_mooncake',
    label: 'Trung Thu: Đêm Hội Trăng Rằm Rước Đèn Ông Sao',
    weight: 2.0,
    when: (look) => look.dark > 0.55,
    create(stage) {
      const DURATION = 32000;
      const stars = fx.risers(stage, {
        count: 28,
        releaseMs: 24000,
        duration: DURATION,
        size: [16, 26],
        rise: [0.5, 1.2],
        sprite: () =>
          fx.sprite(26, 26, (ctx) => {
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(13, 13, 11, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(13, 13, 5, 0, TAU);
            ctx.fill();
          }),
      });
      return {
        update(k, elapsed) {
          return stars.update(k, elapsed);
        },
        back(ctx) {
          stars.back(ctx);
        },
      };
    },
  });

  // 12. Thả đèn hoa đăng bến Bạch Đằng
  fx.register({
    name: 'midautumn_lantern_river',
    label: 'Bến Bạch Đằng: Thả Hoa Đăng Sông Sài Gòn',
    weight: 1.8,
    when: (look) => look.dark > 0.6,
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
          const yBase = H * 0.9;
          for (let i = 0; i < 24; i++) {
            const lx = ((i * W) / 24 + t * 0.015) % W;
            const ly = yBase + Math.sin(t * 0.003 + i) * 6;
            ctx.fillStyle = i % 3 === 0 ? '#fbbf24' : '#ef4444';
            ctx.beginPath();
            ctx.arc(lx, ly, 3.5, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 13. Sông Sài Gòn thắp sáng thuyền hoa đêm giao thừa
  fx.register({
    name: 'newyear_river_lights',
    label: 'Giao Thừa: Thuyền Hoa Rực Sáng Sông Sài Gòn',
    weight: 2.0,
    when: (look) => look.dark > 0.65,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 38000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2500);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a;
          const sy = H * 0.88;
          for (let i = 0; i < 5; i++) {
            const bx = (W * 0.15 + (i * W * 0.7) / 5 + Math.sin(t * 0.001 + i) * 20) % W;
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(bx - 18, sy, 36, 6);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(bx - 12, sy - 8, 24, 8);
          }
          ctx.restore();
        },
      };
    },
  });

  // 14. Đại lễ Phật Đản: Đèn sen kênh Nhiêu Lộc
  fx.register({
    name: 'vesak',
    label: 'Đại Lễ Phật Đản: Hoa Sen Nở Rộ Kênh Nhiêu Lộc',
    weight: 1.5,
    when: (look) => look.dark > 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 35000;
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
          ctx.globalAlpha = a * 0.85;
          const y = H * 0.91;
          for (let i = 0; i < 20; i++) {
            const x = ((i * W) / 20 + t * 0.01) % W;
            ctx.fillStyle = '#f472b6'; // pink lotus
            ctx.beginPath();
            ctx.arc(x, y + Math.sin(t * 0.004 + i) * 3, 5, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#fef08a'; // golden core
            ctx.beginPath();
            ctx.arc(x, y + Math.sin(t * 0.004 + i) * 3, 2, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 15. Lễ hội trái cây Nam Bộ Suối Tiên
  fx.register({
    name: 'southern_fruit',
    label: 'Lễ Hội Trái Cây Nam Bộ: Sắc Màu Phù Sa Sài Gòn',
    weight: 1.4,
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
        back(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.8;
          const colors = ['#f59e0b', '#10b981', '#ef4444', '#84cc16'];
          for (let i = 0; i < 15; i++) {
            const x = (W * 0.1 + (i * W * 0.8) / 15 + Math.sin(t * 0.002 + i) * 20) % W;
            const y = H * 0.45 + Math.cos(t * 0.003 + i) * 30;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 16. Lễ hội Áo Dài phố đi bộ Nguyễn Huệ
  fx.register({
    name: 'ao_dai_festival',
    label: 'Lễ Hội Áo Dài: Phố Đi Bộ Nguyễn Huệ Rực Rỡ',
    weight: 1.6,
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
          ctx.globalAlpha = a * 0.7;
          // Flowing silk ribbon across the bottom
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let x = 0; x < W; x += 20) {
            const y = H * 0.85 + Math.sin(x * 0.01 + t * 0.003) * 16;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        },
      };
    },
  });

  // 17. Chợ đêm ẩm thực Bến Thành
  fx.register({
    name: 'saigon_street_food',
    label: 'Chợ Đêm Bến Thành: Khói Thơm & Ánh Đèn Vàng',
    weight: 1.5,
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
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.65;
          // Warm amber lanterns along the city horizon
          for (let i = 0; i < 30; i++) {
            const x = (i * W) / 30;
            const y = H * 0.82 + Math.sin(i * 1.5) * 4;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 18. Tri ân Ngày Nhà Giáo 20/11
  fx.register({
    name: 'vietnam_teachers_day',
    label: 'Ngày Nhà Giáo 20/11: Hoa Điểm 10 & Tri Ân',
    weight: 1.4,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 28000;
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
          ctx.globalAlpha = a * 0.8;
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('20/11 Tri Ân Thầy Cô', W * 0.38, H * 0.25);
          ctx.restore();
        },
      };
    },
  });

  // 19. Ngày Lập Trình Viên (Day 256): Matrix Code Rain Landmark 81
  fx.register({
    name: 'programmers_day',
    label: "Programmer's Day (Day 256): Matrix Code Rain Landmark 81",
    weight: 2.0,
    when: (look) => look.dark > 0.4,
    create(stage) {
      const { H } = stage;
      const L = stage.landmark;
      const DURATION = 32000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 2000);
          if (a <= 0 || !L) return;
          ctx.save();
          stage.traceLandmark(ctx);
          ctx.clip();
          const top = H - L.h;
          const left = L.x - L.w / 2;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(left, top, L.w, L.h);
          ctx.fillStyle = '#22c55e'; // matrix green
          ctx.font = '10px monospace';
          for (let y = top; y < H; y += 14) {
            const char = String.fromCharCode(48 + Math.floor(Math.sin(y + t * 0.01) * 36));
            ctx.fillText(char, left + Math.sin(y) * (L.w * 0.4) + L.w * 0.4, y);
          }
          ctx.restore();
        },
      };
    },
  });

  // 20. Cuối tuần lộng gió Thủ Thiêm
  fx.register({
    name: 'weekend_kite',
    label: 'Cuối Tuần: Lộng Gió Thả Diều Thủ Thiêm',
    weight: 1.8,
    when: (look) => look.dark < 0.7,
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
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.9;
          for (let i = 0; i < 4; i++) {
            const kx = W * 0.25 + i * 160 + Math.sin(t * 0.002 + i) * 25;
            const ky = H * 0.35 + Math.cos(t * 0.003 + i) * 30;
            ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(kx, ky - 14);
            ctx.lineTo(kx + 12, ky);
            ctx.lineTo(kx, ky + 14);
            ctx.lineTo(kx - 12, ky);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 21. Đêm nhạc acoustic công viên bờ sông
  fx.register({
    name: 'weekend_acoustic',
    label: 'Cuối Tuần: Đêm Nhạc Acoustic Bờ Sông Sài Gòn',
    weight: 1.6,
    when: (look) => look.dark > 0.6,
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
          // Musical notes floating up
          for (let i = 0; i < 8; i++) {
            const nx = W * 0.35 + (i * W * 0.3) / 8 + Math.sin(t * 0.003 + i) * 15;
            const ny = H * 0.85 - ((t * 0.04 + i * 30) % 180);
            ctx.fillStyle = '#facc15';
            ctx.font = '14px sans-serif';
            ctx.fillText('♪', nx, ny);
          }
          ctx.restore();
        },
      };
    },
  });

  // 22. Kỷ niệm 30/4 Giải phóng miền Nam
  fx.register({
    name: 'independence_day_april',
    label: 'Kỷ Niệm 30/4: Non Sông Liền Một Dải Sài Gòn',
    weight: 2.2,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 36000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 2000, 2500);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.85;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(W * 0.25, H * 0.15, W * 0.5, 4);
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⭐ 30/4 - Độc Lập & Tự Do ⭐', W * 0.5, H * 0.22);
          ctx.restore();
        },
      };
    },
  });

  /* ---------- Multi-stage Composite Cascades ---------- */

  // 23. Chuỗi Giông Bão Đa Tầng Liên Hoàn
  fx.register({
    name: 'cascade_thunderstorm',
    label: 'Chuỗi Giông Bão Đa Tầng: Mây Đen → Gió Giật → Chớp → Mưa Rào → Cầu Vồng',
    tier: 'major',
    weight: 3.0,
    when: (_look) => true,
    create(_stage) {
      Portfolio.ambientEnvironment?.triggerCascade('cascade_thunderstorm');
      return {
        update() {
          return true;
        },
      };
    },
  });

  // 24. Chuỗi Đại Tiệc Giao Thừa Hoành Tráng
  fx.register({
    name: 'cascade_newyear_eve',
    label: 'Chuỗi Đại Tiệc Giao Thừa: Đếm Ngược → Pháo Hoa → Liễu Rủ → Đèn Trời',
    tier: 'major',
    weight: 3.0,
    when: (_look) => true,
    create(_stage) {
      Portfolio.ambientEnvironment?.triggerCascade('cascade_newyear_eve');
      return {
        update() {
          return true;
        },
      };
    },
  });

  // 25. Chuỗi Sáng Mùng 1 Tết Sài Gòn
  fx.register({
    name: 'cascade_tet_morning',
    label: 'Chuỗi Sáng Mùng 1 Tết: Nắng Vàng → Hoa Mai Bay → Én Lượn → Đèn Hoa Đăng',
    tier: 'major',
    weight: 3.0,
    when: (_look) => true,
    create(_stage) {
      Portfolio.ambientEnvironment?.triggerCascade('cascade_tet_morning');
      return {
        update() {
          return true;
        },
      };
    },
  });

  // 26. Chuỗi Hoàng Hôn Sài Gòn Chuyển Đêm
  fx.register({
    name: 'cascade_twilight_flight',
    label: 'Chuỗi Hoàng Hôn Sông Sài Gòn: Mặt Trời Lặn → Tia Nắng → Diều Bay → Dơi → Đèn Phố',
    tier: 'major',
    weight: 3.0,
    when: (_look) => true,
    create(_stage) {
      Portfolio.ambientEnvironment?.triggerCascade('cascade_twilight_flight');
      return {
        update() {
          return true;
        },
      };
    },
  });

  // 27. Chuỗi Đại Nhạc Hội Ánh Sáng & Drone Show
  fx.register({
    name: 'cascade_drone_laser',
    label: 'Chuỗi Đại Nhạc Hội Ánh Sáng: Đèn Pha → Laser Đa Sắc → Drone Show Nghệ Thuật',
    tier: 'major',
    weight: 3.0,
    when: (_look) => true,
    create(_stage) {
      Portfolio.ambientEnvironment?.triggerCascade('cascade_drone_laser');
      return {
        update() {
          return true;
        },
      };
    },
  });

  // 28. Chuỗi Mừng Ngày Quốc Khánh 2/9 Sài Gòn
  fx.register({
    name: 'cascade_national_celebration',
    label: 'Chuỗi Quốc Khánh 2/9: Trực Thăng Kéo Cờ → Landmark 81 Cờ Đỏ → Pháo Hoa',
    tier: 'major',
    weight: 3.0,
    when: (_look) => true,
    create(_stage) {
      Portfolio.ambientEnvironment?.triggerCascade('cascade_national_celebration');
      return {
        update() {
          return true;
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
