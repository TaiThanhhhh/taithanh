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
      const hasBolt = Math.random() < boltChance;
      // The tallest towers take a good share of the strikes: their lightning rods.
      const tower =
        hasBolt && stage.bitexco && Math.random() < 0.3 ? fx.pick([stage.landmark, stage.bitexco]) : null;
      const x = tower ? tower.x + rand(-0.06, 0.06) * W : rand(0.1, 0.9) * W;
      const near = tower ? rand(0.6, 1) : Math.random();
      const cloud = H * rand(0.16, 0.3);
      list.push({
        at,
        x,
        near,
        cloud,
        tower,
        timing: fx.strikeTiming(),
        bolt: hasBolt
          ? fx.bolt(
              x,
              cloud + H * 0.02,
              tower ? tower.top : stage.rooftop,
              H / 1080,
              tower ? tower.x : undefined,
            )
          : null,
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
      s.hit = s.tower && reach >= 1 ? I : 0; // the tower it strikes lights up (towerHits, in front)
    });
    return brightest;
  }

  /** A strike on a spire: the tip blazes and the whole tower is lit for an instant (front layer). */
  function towerHits(ctx, stage, list) {
    list.forEach((s) => {
      if (!s.hit || s.hit < 0.01) return;
      const tw = s.tower;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = tw.w * 2.2;
      const g = ctx.createRadialGradient(tw.x, tw.top, 0, tw.x, tw.top, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.9 * s.hit})`);
      g.addColorStop(0.3, `rgba(200, 195, 255, ${0.35 * s.hit})`);
      g.addColorStop(1, 'rgba(200, 195, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(tw.x - r, tw.top - r, r * 2, r * 2);
      (tw === stage.landmark ? stage.traceLandmark : stage.traceBitexco)(ctx);
      ctx.fillStyle = `rgba(215, 210, 255, ${0.3 * s.hit})`;
      ctx.fill();
      ctx.restore();
    });
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
        front(ctx) {
          towerHits(ctx, stage, list);
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
          towerHits(ctx, stage, list);
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
          towerHits(ctx, stage, list);
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
    // Saigon's foggy mornings come in the dry season, around Tết (Dec–Feb); now and then otherwise.
    boost: (cal) => (cal.haze ? 2.5 : 0.35),
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

  /**
   * A fair-weather cumulus, painted once: a flat grey base, domes of puffs, lit from above.
   * @returns {{body: HTMLCanvasElement, rim: HTMLCanvasElement, shade: HTMLCanvasElement}}
   *   body: the cloud; rim: a blurred glow of its outline (silver lining); shade: its shadow.
   */
  function cumulus(top, base) {
    const w = 420;
    const h = 170;
    const puffs = [];
    const n = Math.round(rand(16, 24));
    for (let i = 0; i < n; i++) {
      const u = rand(0.12, 0.88);
      const dome = Math.sin(Math.PI * ((u - 0.12) / 0.76));
      puffs.push([u * w, h * 0.72 - dome * h * rand(0.25, 0.45), h * rand(0.12, 0.2) * (0.6 + dome * 0.6)]);
    }
    const shape = (ctx, color) => {
      ctx.fillStyle = color;
      puffs.forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      });
      ctx.fillRect(w * 0.14, h * 0.6, w * 0.72, h * 0.13); // flat base
    };
    const body = fx.sprite(w, h, (ctx) => {
      ctx.filter = 'blur(3px)';
      shape(ctx, '#fff');
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-in';
      const g = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.75);
      g.addColorStop(0, `rgb(${top})`);
      g.addColorStop(1, `rgb(${base})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    const rim = fx.sprite(w, h, (ctx) => {
      ctx.filter = 'blur(10px)';
      shape(ctx, 'rgba(255, 250, 235, 1)');
    });
    const shade = fx.sprite(w, h, (ctx) => {
      ctx.filter = 'blur(14px)';
      shape(ctx, 'rgb(10, 18, 36)');
    });
    return { body, rim, shade };
  }

  /**
   * Clouds sailing over the city on a sunny day, and what they do to the light: their
   * shadows sweep across the towers and the river (the rest of the city warm in the sun);
   * when one passes over the sun, everything dims, the cloud gets a silver lining and
   * rays fan out from behind it; when the sun comes back out, the glass of Landmark 81
   * and Bitexco flashes as the light reaches it.
   */
  fx.register({
    name: 'cloudshadows',
    label: 'Mây che nắng, bóng mây lướt qua thành phố',
    place: 'Quận 1 · Thủ Thiêm',
    group: 'weather',
    weight: 1.2,
    when: (look) => look.dark < 0.25 && !!look.sun && look.sun.altitude > 0.12,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 75000;
      const look = stage.look;
      const tint = (c, k) =>
        c
          .slice(0, 3)
          .map((v) => Math.round(Math.min(255, v * k)))
          .join(', ');
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = rand(0.55, 0.75) * (W / 1920) * dir;
      // One cloud is sent across the sun (its middle over it ~22 s in); the others pass beside it.
      // (From the test lab it may be played at night: then a sun where it would be in the afternoon.)
      const sun0 = look.sun || { x: 0.62, y: 0.3, core: [255, 244, 225] };
      let sunX = sun0.x * W;
      let sunY = sun0.y * H;
      const clouds = Array.from({ length: 3 }, (_, i) => {
        const w = rand(0.24, 0.36) * W;
        const h = w * 0.4;
        const sprites = cumulus(tint(look.cloudTop, 1.02), tint(look.cloudBase, 0.82));
        if (i === 0) return { w, h, x: sunX - w / 2 - speed * 60 * 22, y: sunY - h * 0.45, ...sprites };
        const lead = (i - 1) * rand(0.45, 0.6) * W + rand(0.05, 0.25) * W;
        return { w, h, x: dir > 0 ? -w - lead : W + lead, y: rand(0.08, 0.3) * H, ...sprites };
      });
      // Mask: the buildings and the river, where shadows and sunlight fall.
      const mask = fx.sprite(W, H, (ctx) => {
        ctx.drawImage(stage.silhouette, 0, stage.skylineTop, W, stage.skylineH);
        ctx.fillRect(0, stage.ground, W, H - stage.ground);
      });
      const star = fx.glowSprite([255, 246, 225], 64);
      const glints = [];
      const towers = [
        { tw: stage.landmark, trace: stage.traceLandmark, sunny: true },
        { tw: stage.bitexco, trace: stage.traceBitexco, sunny: true },
      ];
      const rays = Array.from({ length: 14 }, () => ({
        angle: rand(0, TAU),
        width: rand(0.015, 0.05),
        phase: rand(0, TAU),
      }));
      /** How much of the shade at x (0..1), from the clouds' shadows on the city. */
      const shadeAt = (x) =>
        clouds.reduce((m, c) => Math.max(m, smoothEdge(Math.abs(x - (c.x + c.w / 2)) / (c.w * 0.36))), 0);
      const smoothEdge = (d) => 1 - fx.smooth((d - 0.7) / 0.3);
      let cover = 0;
      let t = 0;
      return {
        mirror: true,
        update(k, elapsed) {
          t = elapsed;
          clouds.forEach((c) => {
            c.x += speed * k;
          });
          if (stage.look.sun) {
            sunX = stage.look.sun.x * W;
            sunY = stage.look.sun.y * H;
          }
          // How much the sun is hidden: the cloud's middle over it.
          cover = clouds.reduce((m, c) => {
            const dx = Math.abs(sunX - (c.x + c.w / 2)) / (c.w * 0.42);
            const dy = Math.abs(sunY - (c.y + c.h * 0.45)) / (c.h * 0.6);
            return Math.max(m, (1 - fx.smooth((dx - 0.55) / 0.45)) * (dy < 1 ? 1 : 0));
          }, 0);
          // The sun coming back out on a tower: its glass flashes.
          towers.forEach((o) => {
            const sunny = shadeAt(o.tw.x) < 0.3 && cover < 0.4;
            if (sunny && !o.sunny && t > 4000) glints.push({ ...o, at: t });
            o.sunny = sunny;
          });
          fx.compact(glints, (g) => t - g.at < 1600);
          return t < DURATION;
        },
        back(ctx) {
          const a = envelope(t, DURATION, 5000, 6000);
          ctx.globalCompositeOperation = 'lighter';
          // Rays fan out from the sun hidden behind the cloud's edge (strongest half-covered).
          const edge = cover * (1 - cover) * 4;
          if (edge > 0.02) {
            const L = Math.hypot(W, H);
            ctx.fillStyle = 'rgba(255, 240, 210, 0.18)';
            rays.forEach((r) => {
              ctx.globalAlpha = a * edge * (0.5 + 0.5 * Math.sin(t * 0.0006 + r.phase));
              const ang = r.angle + Math.sin(t * 0.00004 + r.phase) * 0.04;
              ctx.beginPath();
              ctx.moveTo(sunX, sunY);
              ctx.lineTo(sunX + Math.cos(ang - r.width) * L, sunY + Math.sin(ang - r.width) * L);
              ctx.lineTo(sunX + Math.cos(ang + r.width) * L, sunY + Math.sin(ang + r.width) * L);
              ctx.fill();
            });
          }
          // Silver lining: the outline of a cloud near the sun glows.
          clouds.forEach((c) => {
            const near = Math.max(
              0,
              1 - Math.hypot(sunX - (c.x + c.w / 2), sunY - (c.y + c.h / 2)) / (c.w * 0.75),
            );
            if (near <= 0) return;
            ctx.globalAlpha = a * near * 0.9;
            ctx.drawImage(c.rim, c.x - c.w * 0.03, c.y - c.h * 0.05, c.w * 1.06, c.h * 1.1);
          });
          // The clouds themselves (they hide the sun).
          ctx.globalCompositeOperation = 'source-over';
          clouds.forEach((c) => {
            ctx.globalAlpha = a * 0.96;
            ctx.drawImage(c.body, c.x, c.y, c.w, c.h);
          });
          // The whole sky dims a little while the sun is hidden.
          ctx.globalAlpha = a * cover * 0.16;
          ctx.fillStyle = 'rgb(40, 50, 72)';
          ctx.fillRect(0, 0, W, stage.ground);
          ctx.globalAlpha = 1;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 5000, 6000);
          const sun = 1 - cover;
          // Sunlight: the city warm and bright where no shadow falls...
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a * sun;
          ctx.fillStyle = `rgba(${tint(sun0.core, 1)}, 0.14)`;
          ctx.fillRect(0, stage.skylineTop, W, H - stage.skylineTop);
          // ...cut where the clouds' shadows fall, which are darker (they move with the clouds):
          // a patch with the cloud's own ragged outline over the buildings, and a flattened one
          // gliding over the water.
          const patches = (c) => {
            const g = stage.ground;
            const rh = H - g;
            ctx.drawImage(c.shade, c.x - c.w * 0.1, g - H * 0.45, c.w * 1.2, H * 0.62);
            ctx.drawImage(c.shade, c.x + c.w * 0.2, g - H * 0.3, c.w * 0.75, H * 0.42);
            ctx.drawImage(c.shade, c.x - c.w * 0.05, g - rh * 0.2, c.w * 1.1, rh * 1.7);
          };
          ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = 1;
          clouds.forEach(patches);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = a * 0.42;
          clouds.forEach(patches);
          // With the sun hidden, the whole city falls into shade.
          ctx.globalAlpha = a * cover * 0.3;
          ctx.fillStyle = 'rgb(16, 24, 44)';
          ctx.fillRect(0, stage.skylineTop, W, H - stage.skylineTop);
          // Glints: the light sweeping down a tower's glass as the sun reaches it, and a star.
          glints.forEach((g) => {
            const u = (t - g.at) / 1600;
            const tw = g.tw;
            const y = tw.top + tw.h * fx.easeOut(u);
            ctx.save();
            g.trace(ctx);
            ctx.clip();
            ctx.globalCompositeOperation = 'lighter';
            const band = tw.h * 0.14;
            const gr = ctx.createLinearGradient(0, y - band, 0, y + band);
            gr.addColorStop(0, 'rgba(255, 246, 225, 0)');
            gr.addColorStop(0.5, `rgba(255, 246, 225, ${0.7 * (1 - u)})`);
            gr.addColorStop(1, 'rgba(255, 246, 225, 0)');
            ctx.fillStyle = gr;
            ctx.globalAlpha = a;
            ctx.fillRect(tw.x - tw.w, y - band, tw.w * 2, band * 2);
            ctx.restore();
            const f = Math.sin(Math.PI * Math.min(1, u * 1.6));
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a * f;
            const r = 30 * scale;
            ctx.drawImage(star, tw.x - r, tw.top + tw.h * 0.15 - r, r * 2, r * 2);
          });
          // Only on the buildings and the water, never on the sky between them.
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(mask, 0, 0, W, H);
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
