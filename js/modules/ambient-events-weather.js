/**
 * @file Ambient weather (registered with ambient-events.js), after Saigon's seasons:
 * in the rainy season (May–Nov) afternoon downpours with thunder, night storms and
 * distant lightning, virga far away; a rainbow when the sun comes back; in the dry
 * season (Dec–Apr) clear skies and, around Tết, hazy mornings when fog covers the
 * city; cloud shadows sweeping across the buildings on sunny days.
 *
 * Lightning: a stepped leader feeling its way down, the return stroke, then one to
 * three restrikes (fx.strikeAt); each stroke lights the clouds from inside (the
 * skyline stays black against them) and the thunder reaches the flock a few seconds
 * later, as far as the strike is.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, envelope, clamp01 } = fx;
  const FRAME_MS = Portfolio.motion.FRAME_MS;

  /**
   * Strikes over a stretch of time. Some come down to the rooftops (a visible bolt),
   * the others stay inside the clouds and only light them up. `near` (0..1) sets how
   * soon the thunder follows: about three seconds a kilometre.
   */
  function strikes(stage, from, until, gap, boltChance) {
    const { W, H } = stage;
    const list = [];
    for (let at = from; at < until; at += rand(gap[0], gap[1])) {
      const x = rand(0.1, 0.9) * W;
      const near = Math.random();
      list.push({
        at,
        x,
        near,
        cloud: H * rand(0.16, 0.3),
        timing: fx.strikeTiming(),
        bolt: Math.random() < boltChance ? fx.bolt(x, H * rand(0.18, 0.3), stage.rooftop, H / 1080) : null,
        thunderAt: at + 600 + (1 - near) * 5500,
        heard: false,
        strokes: 0,
      });
    }
    return list;
  }

  function thunder(stage, list, t) {
    list.forEach((s) => {
      if (s.heard || t < s.thunderAt) return;
      s.heard = true;
      // A close one makes the whole flock flinch; a far rumble only those nearby.
      if (stage.startle) stage.startle(s.x, stage.H * 0.4, stage.H * (0.6 + 1.6 * s.near));
    });
  }

  /**
   * Draws the strikes going on: the bolt (growing down, then flashing), a glow inside
   * the cloud it comes from, and each stroke lighting the clouds on the light layer.
   * @returns {number} Brightness of the brightest stroke (0..1), to light the rain.
   */
  function drawStrikes(ctx, stage, list, t, strength = 1) {
    const { W, H } = stage;
    const scale = H / 1080;
    let brightest = 0;
    list.forEach((s) => {
      const dt = t - s.at;
      if (dt < 0 || dt > 2500) return;
      const { reach, I } = fx.strikeAt(s.timing, dt);
      if (I < 0.01) return;
      // Each new stroke (return stroke, restrikes) throws light on the clouds.
      const strokes =
        reach < 1 ? 0 : 1 + s.timing.restrikes.filter((at) => dt - s.timing.leader >= at).length;
      if (strokes > s.strokes) {
        s.strokes = strokes;
        if (stage.flash) {
          const power = (0.55 + 0.45 * s.near) * strength * (strokes === 1 ? 1 : 0.75);
          stage.flash(s.x, s.cloud, power, [214, 208, 255], 0.55 + 0.25 * s.near, 110);
        }
      }
      brightest = Math.max(brightest, I * (reach < 1 ? 0.2 : 1));
      if (reach >= 1) {
        // The cloud the strike comes from glows from inside.
        const r = W * 0.16;
        const g = ctx.createRadialGradient(s.x, s.cloud, 0, s.x, s.cloud, r);
        g.addColorStop(0, `rgba(225, 220, 255, ${0.28 * I * strength})`);
        g.addColorStop(1, 'rgba(225, 220, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x - r, s.cloud - r, r * 2, r * 2);
      }
      if (s.bolt) fx.drawBolt(ctx, s.bolt, I, scale, reach);
    });
    return brightest;
  }

  /** More rain in the rainy season, most of it in the afternoon. */
  const rainySeason = (cal, look) =>
    cal.season === 'rainy' ? (['afternoon', 'golden'].includes(look.name) ? 3 : 1.4) : 0.12;

  /* ---------- Distant lightning ---------- */

  fx.register({
    name: 'lightning',
    label: 'Chớp xa',
    group: 'weather',
    weight: 0.8,
    boost: (cal) => (cal.season === 'rainy' ? 1.6 : 0.2),
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
    group: 'weather',
    season: 'rainy',
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
          rain.update(k, amount);
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
    group: 'weather',
    weight: 0.8,
    boost: rainySeason,
    when: (look) => look.dark < 0.3,
    create(stage, extra = {}) {
      const { W, H } = stage;
      const DURATION = 82000;
      const RAIN_END = 46000;
      const BOW_AT = 40000;
      const rainy = !extra.cal || extra.cal.season === 'rainy';
      const rain = fx.rain(stage, { count: rainy ? 420 : 280 });
      // A rainy-season downpour comes with thunder.
      const list = rainy ? strikes(stage, 7000, RAIN_END - 9000, [5000, 11000], 0.7) : [];
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
          rain.update(k, amount);
          thunder(stage, list, t);
          return t < DURATION;
        },
        back(ctx) {
          if (amount > 0) {
            // Overcast; a rainy-season downpour turns the sky a heavy grey.
            ctx.fillStyle = `rgba(88, 96, 110, ${(rainy ? 0.66 : 0.42) * amount})`;
            ctx.fillRect(0, 0, W, H);
            drawStrikes(ctx, stage, list, t, 0.7);
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
          ctx.fillStyle = `rgba(160, 168, 180, ${(rainy ? 0.24 : 0.12) * amount})`; // mist over the city
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
    group: 'weather',
    rarity: 'uncommon',
    boost: (cal) => (cal.season === 'rainy' ? 1.5 : 0.3),
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
    label: 'Sương mù phủ thành phố',
    place: 'Sáng mùa khô',
    group: 'weather',
    // Saigon's foggy mornings come in the dry season, around Tết (Dec–Feb).
    when: (look, _stage, cal) => !!cal.haze && ['late', 'predawn', 'sunrise', 'morning'].includes(look.name),
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
    group: 'weather',
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
          ctx.drawImage(stage.silhouette, 0, stage.skylineTop, W, stage.skylineH);
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
