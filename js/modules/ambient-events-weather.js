/**
 * @file Ambient weather (registered with ambient-events.js): distant lightning, a night
 * thunderstorm, a passing shower and its rainbow, virga (rain that never reaches
 * the ground) far away, morning fog over the city, and cloud shadows sweeping
 * across the buildings.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, envelope, clamp01 } = fx;
  const FRAME_MS = Portfolio.motion.FRAME_MS;

  /** Brightness of a flash `dt` ms after the strike: most flicker twice. */
  const flash = (strike, dt) => {
    if (dt < 0) return 0;
    const second = strike.double && dt > 130 ? 0.7 * Math.exp(-(dt - 130) / 110) : 0;
    return Math.min(1, Math.exp(-dt / 90) + second);
  };

  /** Strikes over a stretch of time; thunder startles the whole flock. */
  function strikes(stage, from, until, gap, boltChance) {
    const { W, H } = stage;
    const list = [];
    for (let at = from; at < until; at += rand(gap[0], gap[1])) {
      const x = rand(0.1, 0.9) * W;
      list.push({
        at,
        x,
        double: Math.random() < 0.6,
        bolt: Math.random() < boltChance ? fx.bolt(x, H * rand(0.18, 0.3), stage.rooftop, H / 1080) : null,
        heard: false,
      });
    }
    return list;
  }

  function thunder(stage, list, t) {
    list.forEach((s) => {
      if (s.heard || t < s.at) return;
      s.heard = true;
      if (stage.startle) stage.startle(s.x, stage.H * 0.4, stage.H * 2);
    });
  }

  /** The sky lights up from inside the clouds; the skyline stays black in front of it. */
  function drawStrikes(ctx, stage, list, t, strength = 1) {
    const { W, H } = stage;
    const scale = H / 1080;
    let brightest = 0;
    list.forEach((s) => {
      const I = flash(s, t - s.at);
      if (I < 0.01) return;
      brightest = Math.max(brightest, I);
      const g = ctx.createRadialGradient(s.x, H * 0.28, 0, s.x, H * 0.28, W * 0.5);
      g.addColorStop(0, `rgba(205, 200, 255, ${0.32 * I * strength})`);
      g.addColorStop(1, 'rgba(205, 200, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (s.bolt) fx.drawBolt(ctx, s.bolt, I, scale);
    });
    return brightest;
  }

  /* ---------- Distant lightning ---------- */

  fx.register({
    name: 'lightning',
    label: 'Chớp xa',
    weight: 0.8,
    when: (look) => look.dark > 0.45,
    create(stage) {
      const DURATION = 22000;
      const list = strikes(stage, rand(400, 1500), DURATION - 1500, [1200, 4200], 0.4);
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          thunder(stage, list, t);
          return t < DURATION;
        },
        back(ctx) {
          drawStrikes(ctx, stage, list, t);
        },
      };
    },
  });

  /* ---------- Night thunderstorm ---------- */

  fx.register({
    name: 'storm',
    label: 'Giông đêm',
    rarity: 'uncommon',
    when: (look) => look.dark > 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 65000;
      const RAIN_END = DURATION - 9000;
      const rain = fx.rain(stage, {
        count: 460,
        wind: rand(0.22, 0.38) * (Math.random() < 0.5 ? 1 : -1),
        length: 1.3,
      });
      const list = strikes(stage, rand(2500, 4000), DURATION - 8000, [1500, 4500], 0.6);
      let amount = 0;
      let lit = 0;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          amount = clamp01(Math.min(t / 7000, (RAIN_END - t) / 8000));
          rain.update(k);
          thunder(stage, list, t);
          return t < DURATION;
        },
        back(ctx) {
          ctx.fillStyle = `rgba(10, 12, 20, ${0.4 * amount})`; // heavy clouds swallow the stars
          ctx.fillRect(0, 0, W, H);
          lit = drawStrikes(ctx, stage, list, t, 1.3);
        },
        front(ctx) {
          ctx.fillStyle = `rgba(60, 66, 84, ${0.12 * amount})`; // wet haze over the city
          ctx.fillRect(0, 0, W, H);
          rain.draw(ctx, amount, '200, 210, 230', 0.32);
          if (lit > 0.01) {
            // Each flash lights up the rain and the street haze for an instant.
            ctx.fillStyle = `rgba(210, 210, 255, ${0.1 * lit})`;
            ctx.fillRect(0, 0, W, H);
          }
        },
      };
    },
  });

  /* ---------- A passing shower, then a rainbow ---------- */

  fx.register({
    name: 'shower',
    label: 'Mưa rào bất chợt',
    weight: 0.8,
    when: (look) => look.dark < 0.3,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 82000;
      const RAIN_END = 46000;
      const BOW_AT = 40000;
      const rain = fx.rain(stage);
      // The rainbow stands opposite the sun; now and then a bright double rainbow.
      const sun = stage.look.sun;
      const bowX = sun ? Math.min(0.8, Math.max(0.2, 1 - sun.x)) * W : 0;
      const secondary = Math.random() < 0.25 ? 0.13 : 0.06;
      const bands = [
        '255, 70, 70',
        '255, 150, 60',
        '255, 230, 90',
        '120, 220, 110',
        '90, 170, 255',
        '110, 110, 240',
        '170, 100, 230',
      ];
      let amount = 0;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          amount = clamp01(Math.min(t / 6000, (RAIN_END - t) / 8000));
          rain.update(k);
          return t < DURATION;
        },
        back(ctx) {
          if (amount > 0) {
            ctx.fillStyle = `rgba(92, 102, 118, ${0.42 * amount})`; // overcast
            ctx.fillRect(0, 0, W, H);
          }
          if (!sun || t < BOW_AT) return;
          const a = envelope(t - BOW_AT, DURATION - BOW_AT, 7000, 12000);
          const R = H * 0.62;
          const band = H * 0.0095;
          ctx.lineWidth = band * 1.2;
          bands.forEach((color, i) => {
            ctx.strokeStyle = `rgba(${color}, ${0.2 * a})`;
            ctx.beginPath();
            ctx.arc(bowX, H * 1.05, R - i * band, Math.PI, TAU);
            ctx.stroke();
            // Secondary bow, colours reversed.
            ctx.strokeStyle = `rgba(${color}, ${secondary * a})`;
            ctx.beginPath();
            ctx.arc(bowX, H * 1.05, R * 1.3 + i * band, Math.PI, TAU);
            ctx.stroke();
          });
        },
        front(ctx) {
          if (amount <= 0) return;
          ctx.fillStyle = `rgba(170, 180, 195, ${0.12 * amount})`; // mist over the city
          ctx.fillRect(0, 0, W, H);
          rain.draw(ctx, amount);
        },
      };
    },
  });

  /* ---------- Virga: rain shafts far away, fading before they reach the ground ---------- */

  fx.register({
    name: 'virga',
    label: 'Mưa xa cuối trời',
    rarity: 'uncommon',
    when: (look) => look.dark < 0.35,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 70000;
      const grey = fx.mix([120, 128, 145], stage.look.cloudBase.slice(0, 3), 0.35).map(Math.round).join(', ');
      const curtain = fx.sprite(200, 300, (ctx, w, h) => {
        ctx.filter = 'blur(2px)';
        for (let i = 0; i < 80; i++) {
          const x = rand(0, w);
          const bottom = rand(h * 0.45, h);
          const g = ctx.createLinearGradient(0, 0, 0, bottom);
          g.addColorStop(0, `rgba(${grey}, 0.3)`);
          g.addColorStop(1, `rgba(${grey}, 0)`);
          ctx.strokeStyle = g;
          ctx.lineWidth = rand(1, 4);
          ctx.beginPath();
          ctx.moveTo(x, rand(0, h * 0.1));
          ctx.lineTo(x + rand(-6, 6), bottom);
          ctx.stroke();
        }
      });
      const cloud = fx.sprite(256, 96, (ctx, w, h) => {
        ctx.scale(1, h / w);
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, `rgba(${grey}, 0.7)`);
        g.addColorStop(1, `rgba(${grey}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
      });
      const cells = Array.from({ length: Math.random() < 0.5 ? 1 : 2 }, () => ({
        x: rand(0.15, 0.85) * W,
        base: rand(0.32, 0.45) * H,
        w: rand(0.12, 0.22) * W,
        vx: rand(-0.12, 0.12) * scale,
        phase: rand(0, TAU),
      }));
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 8000, 10000);
          cells.forEach((c) => {
            const x = c.x + (c.vx * t) / FRAME_MS;
            ctx.save();
            ctx.globalAlpha = a * 0.9;
            ctx.translate(x, c.base);
            ctx.transform(1, 0, 0.18 + Math.sin(t * 0.0004 + c.phase) * 0.05, 1, 0, 0); // blown by the wind
            ctx.drawImage(curtain, -c.w / 2, 0, c.w, H * 0.55);
            ctx.restore();
            ctx.globalAlpha = a;
            ctx.drawImage(cloud, x - c.w * 0.8, c.base - c.w * 0.22, c.w * 1.6, c.w * 0.45);
          });
        },
      };
    },
  });

  /* ---------- Morning fog over the city ---------- */

  fx.register({
    name: 'fog',
    label: 'Sương sớm',
    when: (look) => ['late', 'predawn', 'sunrise', 'morning'].includes(look.name),
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 80000;
      const look = stage.look;
      // Takes the colour of the low sky: grey-violet before dawn, warm at sunrise, white by day.
      const rgb = fx
        .mix(look.sky[4], [205, 210, 220], 0.2 + 0.4 * (1 - look.dark))
        .map(Math.round)
        .join(', ');
      const bank = fx.sprite(512, 160, (ctx, w, h) => {
        for (let i = 0; i < 46; i++) {
          const x = rand(0.05, 0.95) * w;
          const y = rand(0.35, 0.65) * h;
          const r = rand(0.12, 0.3) * h;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(${rgb}, 0.35)`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      });
      const dir = Math.random() < 0.5 ? 1 : -1;
      const banks = Array.from({ length: 5 }, () => {
        const w = rand(0.9, 1.5) * W;
        return {
          x: rand(-0.6, 0.9) * W,
          y: rand(0.72, 0.97) * H,
          w,
          h: rand(0.16, 0.3) * H,
          vx: dir * rand(0.12, 0.3) * scale,
          alpha: rand(0.45, 0.8),
        };
      });
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          banks.forEach((b) => {
            b.x += b.vx * k;
            if (b.x > W)
              b.x = -b.w; // wraps while fully off-screen: no popping
            else if (b.x + b.w < 0) b.x = W;
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 10000, 12000);
          banks.forEach((b) => {
            ctx.globalAlpha = a * b.alpha;
            ctx.drawImage(bank, b.x, b.y - b.h / 2, b.w, b.h);
          });
        },
      };
    },
  });

  /* ---------- Cloud shadows sweeping across the buildings ---------- */

  fx.register({
    name: 'cloudshadows',
    label: 'Bóng mây trôi qua thành phố',
    when: (look) => look.dark < 0.2 && !!look.sun,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 60000;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const blob = fx.sprite(256, 128, (ctx, w, h) => {
        ctx.scale(1, h / w);
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, 'rgba(14, 22, 44, 0.75)');
        g.addColorStop(0.6, 'rgba(14, 22, 44, 0.4)');
        g.addColorStop(1, 'rgba(18, 28, 52, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
      });
      const shadows = Array.from({ length: Math.round(rand(3, 4)) }, () => ({
        x: rand(-0.6, 0.9) * W,
        y: rand(0.68, 0.9) * H,
        w: rand(0.3, 0.55) * W,
        h: rand(0.25, 0.4) * H,
        vx: dir * rand(0.5, 0.9) * scale,
      }));
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          shadows.forEach((s) => {
            s.x += s.vx * k;
          });
          return t < DURATION;
        },
        front(ctx) {
          ctx.globalAlpha = envelope(t, DURATION, 6000, 6000) * 0.85;
          shadows.forEach((s) => ctx.drawImage(blob, s.x, s.y - s.h / 2, s.w, s.h));
          // Only on the buildings, never on the sky between them.
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(stage.silhouette, 0, stage.skylineTop, W, H - stage.skylineTop);
        },
      };
    },
  });

  /* ---------- Các Hiện Tượng Thời Tiết & Khí Hậu Sài Gòn Mở Rộng ---------- */

  // 7. Chớp phân nhánh rễ cây nhiều tầng (Forked Lightning)
  fx.register({
    name: 'lightning_fork',
    label: 'Tia Sét Phân Nhánh Rễ Cây Đa Tầng (Forked Lightning)',
    weight: 1.4,
    when: (look) => look.dark > 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 6000;
      let t = 0;
      const lx = W * 0.45;
      Portfolio.ambientEnvironment?.illumination.flash(0.95, [240, 240, 255], 0.82);
      Portfolio.ambientEnvironment?.notifyDisturbance(lx, H * 0.3, 300, 1.5);
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 100, 1200);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(lx, 0);
          ctx.lineTo(lx - 20, H * 0.2);
          ctx.lineTo(lx + 15, H * 0.4);
          ctx.lineTo(lx - 10, H * 0.65);
          // Branch 1
          ctx.moveTo(lx - 20, H * 0.2);
          ctx.lineTo(lx - 60, H * 0.35);
          // Branch 2
          ctx.moveTo(lx + 15, H * 0.4);
          ctx.lineTo(lx + 50, H * 0.55);
          ctx.stroke();
          ctx.restore();
        },
      };
    },
  });

  // 8. Chớp nội bộ đám mây rực sáng (Sheet Lightning)
  fx.register({
    name: 'lightning_sheet',
    label: 'Chớp Nội Bộ Tán Mây Rực Sáng (Sheet Lightning)',
    weight: 1.6,
    when: (look) => look.dark > 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 8000;
      let t = 0;
      Portfolio.ambientEnvironment?.illumination.flash(0.8, [192, 132, 252], 0.88);
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 150, 1500);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.45;
          ctx.fillStyle = '#c084fc'; // purple flash
          ctx.fillRect(0, 0, W, H * 0.6);
          ctx.restore();
        },
      };
    },
  });

  // 9. Cơn mưa tầm tã đặc trưng mùa mưa Sài Gòn (Heavy Rain)
  fx.register({
    name: 'heavy_rain',
    label: 'Cơn Mưa Rào Xối Xả Mùa Mưa Sài Gòn (Heavy Downpour)',
    weight: 2.0,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 32000;
      let t = 0;
      const drops = Array.from({ length: 90 }, () => ({
        x: rand(0, W),
        y: rand(-H, 0),
        speed: rand(18, 28),
        len: rand(22, 38),
      }));
      Portfolio.ambientEnvironment?.wind.setWind(-1.2, -2.0);
      return {
        update(k, elapsed) {
          t = elapsed;
          const wind = Portfolio.ambientEnvironment?.wind.sample(0.5) || -1.2;
          drops.forEach((d) => {
            d.y += d.speed * k;
            d.x += wind * 4 * k;
            if (d.y > H) {
              d.y = rand(-40, 0);
              d.x = rand(0, W);
            }
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.55;
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          drops.forEach((d) => {
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 6, d.y + d.len);
          });
          ctx.stroke();
          ctx.restore();
        },
      };
    },
  });

  // 10. Mưa phùn bay lất phất se lạnh (Drizzle)
  fx.register({
    name: 'drizzle',
    label: 'Mưa Phùn Bay Lất Phất Se Lạnh (Saigon Drizzle)',
    weight: 1.5,
    when: (_look) => true,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 28000;
      let t = 0;
      const motes = Array.from({ length: 45 }, () => ({
        x: rand(0, W),
        y: rand(0, H),
        vy: rand(2, 4),
        vx: rand(-1, 0.5),
      }));
      return {
        update(k, elapsed) {
          t = elapsed;
          motes.forEach((m) => {
            m.y += m.vy * k;
            m.x += m.vx * k;
            if (m.y > H) m.y = 0;
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 2000, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.4;
          ctx.fillStyle = '#e0f2fe';
          motes.forEach((m) => {
            ctx.fillRect(m.x, m.y, 1.5, 3.5);
          });
          ctx.restore();
        },
      };
    },
  });

  // 11. Mưa bóng mây nắng vàng (Sun Shower)
  fx.register({
    name: 'sun_shower',
    label: 'Mưa Bóng Mây Nắng Vàng Rực Rỡ (Sun Shower)',
    weight: 1.6,
    when: (look) => look.dark < 0.45,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 26000;
      let t = 0;
      const drops = Array.from({ length: 50 }, () => ({
        x: rand(0, W),
        y: rand(-H, 0),
        speed: rand(14, 22),
      }));
      return {
        update(k, elapsed) {
          t = elapsed;
          drops.forEach((d) => {
            d.y += d.speed * k;
            if (d.y > H) d.y = rand(-20, 0);
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 2000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.65;
          ctx.strokeStyle = '#fef08a'; // golden sunlit rain
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          drops.forEach((d) => {
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 3, d.y + 18);
          });
          ctx.stroke();
          ctx.restore();
        },
      };
    },
  });

  // 12. Cầu vồng rực rỡ sau cơn mưa (Rainbow)
  fx.register({
    name: 'rainbow',
    label: 'Cầu Vồng 7 Sắc Rực Rỡ Sau Mưa (42deg Rainbow Arc)',
    weight: 1.8,
    when: (look) => look.dark < 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 32000;
      let t = 0;
      const cx = W * 0.5;
      const cy = H * 0.95;
      const r = Math.min(W, H) * 0.68;
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 3000, 3000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.42;
          colors.forEach((col, idx) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(cx, cy, r - idx * 5.5, Math.PI, 0);
            ctx.stroke();
          });
          ctx.restore();
        },
      };
    },
  });

  // 13. Cầu vồng đôi hiếm gặp (Double Rainbow)
  fx.register({
    name: 'double_rainbow',
    label: 'Hiện Tượng Cầu Vồng Đôi Hiếm Gặp (Double Rainbow)',
    weight: 1.2,
    when: (look) => look.dark < 0.45,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 32000;
      let t = 0;
      const cx = W * 0.48;
      const cy = H * 0.98;
      const r1 = Math.min(W, H) * 0.65;
      const r2 = r1 + 55;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 3000, 3000);
          if (a <= 0) return;
          ctx.save();
          // Primary bow
          ctx.globalAlpha = a * 0.45;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(cx, cy, r1, Math.PI, 0);
          ctx.stroke();
          // Secondary inverted bow
          ctx.globalAlpha = a * 0.22;
          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, r2, Math.PI, 0);
          ctx.stroke();
          ctx.restore();
        },
      };
    },
  });

  // 14. Làn sương giăng nhẹ mặt nước sông Sài Gòn (River Mist)
  fx.register({
    name: 'river_mist',
    label: 'Làn Sương Giăng Nhẹ Mặt Nước Sông Sài Gòn (River Mist)',
    weight: 1.7,
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
          const a = envelope(t, DURATION, 3000, 3000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.28;
          const my = H * 0.86;
          const grad = ctx.createLinearGradient(0, my, 0, H);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, my, W, H - my);
          ctx.restore();
        },
      };
    },
  });

  // 15. Ảo ảnh không khí bốc hơi nắng trưa Sài Gòn (Heat Haze Mirage)
  fx.register({
    name: 'heat_haze',
    label: 'Ảo Ảnh Không Khí Nắng Nóng Bốc Hơi (Heat Haze Mirage)',
    weight: 1.4,
    when: (look) => look.dark < 0.25,
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
          ctx.globalAlpha = a * 0.18;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1;
          for (let x = 0; x < W; x += 30) {
            ctx.beginPath();
            const yStart = H * 0.85;
            ctx.moveTo(x, yStart);
            ctx.quadraticCurveTo(x + Math.sin(t * 0.005 + x) * 10, yStart - 30, x, yStart - 60);
            ctx.stroke();
          }
          ctx.restore();
        },
      };
    },
  });

  // 16. Đám mây vũ tích khổng lồ hình đe (Cumulonimbus Anvil)
  fx.register({
    name: 'cumulonimbus',
    label: 'Đám Mây Vũ Tích Khổng Lồ Hình Đe (Cumulonimbus Anvil)',
    weight: 1.6,
    when: (_look) => true,
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
          const a = envelope(t, DURATION, 3000, 3000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.55;
          ctx.fillStyle = '#334155';
          const cx = W * 0.65;
          const cy = H * 0.35;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 140, 60, 0, 0, TAU);
          ctx.ellipse(cx + 60, cy - 30, 110, 40, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        },
      };
    },
  });

  // 17. Đám mây vú Mammatus kỳ vĩ sau cơn dông (Mammatus)
  fx.register({
    name: 'mammatus',
    label: 'Đám Mây Dạng Túi Vú Kỳ Vĩ (Mammatus Cloud Pouches)',
    weight: 1.3,
    when: (look) => look.dark > 0.3 && look.dark < 0.7,
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
          const a = envelope(t, DURATION, 3000, 3000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.45;
          ctx.fillStyle = '#475569';
          for (let i = 0; i < 8; i++) {
            const x = W * 0.2 + i * 85;
            const y = H * 0.22 + Math.sin(i) * 12;
            ctx.beginPath();
            ctx.arc(x, y, 35, 0, Math.PI);
            ctx.fill();
          }
          ctx.restore();
        },
      };
    },
  });

  // 18. Mây ngũ sắc tán xạ ánh nắng hoàng hôn (Golden Clouds)
  fx.register({
    name: 'golden_clouds',
    label: 'Mây Ngũ Sắc Tán Xạ Ánh Nắng Hoàng Hôn (Golden Clouds)',
    weight: 1.7,
    when: (look) => look.dark > 0.15 && look.dark < 0.55,
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
          ctx.globalAlpha = a * 0.6;
          const cx = W * 0.4;
          const cy = H * 0.3;
          const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 180);
          g.addColorStop(0, '#fef08a');
          g.addColorStop(0.5, '#f97316');
          g.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, 180, 0, TAU);
          ctx.fill();
          ctx.restore();
        },
      };
    },
  });

  // 19. Màn khói sương lam chiều hoàng hôn (Twilight Haze)
  fx.register({
    name: 'twilight_haze',
    label: 'Màn Khói Sương Lam Chiều Hoàng Hôn (Twilight Haze)',
    weight: 1.5,
    when: (look) => look.dark > 0.3 && look.dark < 0.65,
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
          const a = envelope(t, DURATION, 3000, 3000);
          if (a <= 0) return;
          ctx.save();
          ctx.globalAlpha = a * 0.25;
          ctx.fillStyle = '#c084fc'; // purple haze
          ctx.fillRect(0, H * 0.4, W, H * 0.45);
          ctx.restore();
        },
      };
    },
  });

  // 20. Đợt gió giật xào xạc cành lá (Gust Wind)
  fx.register({
    name: 'gust_wind',
    label: 'Đợt Gió Giật Xào Xạc Mùa Mưa (Sudden Wind Gust)',
    weight: 1.8,
    when: (_look) => true,
    create(_stage) {
      Portfolio.ambientEnvironment?.wind.triggerGust(2.8);
      const DURATION = 12000;
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
      };
    },
  });

  // 21. Chuỗi giông bão liên hoàn (Storm Cascade)
  fx.register({
    name: 'storm_cascade',
    label: 'Chuỗi Giông Bão: Gió Giật → Mây Đen → Sét Đánh → Mưa Rào',
    tier: 'major',
    weight: 2.5,
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
})((window.Portfolio = window.Portfolio || {}));
