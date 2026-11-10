/**
 * @file Occasions: what Saigon really does on its days (registered with ambient-events.js).
 * Each event only happens on its occasion (ambient-calendar.js knows the real date and
 * the lunar one); the test lab can play any of them.
 *
 * - Giao thừa and New Year: the countdown on Landmark 81 in the last minute, then
 *   fireworks over the river at midnight (live, at the real time); Tết nights: the
 *   tower in red and gold with the year's name, drones drawing a mai flower, lanterns
 *   strung along the bank; by day mai petals on the wind (ambient-events-day.js).
 * - 30/4 and 2/9: fireworks 21:00–21:15 (live), the tower lit as the flag, drones
 *   drawing the flag waving.
 * - Phật đản: floating lanterns drifting from the mouth of the Nhiêu Lộc canal.
 * - Trung thu: children's star-lantern procession along the river under the full moon.
 * - Noel: the tower in green and gold, fairy lights along the river.
 * - Earth Hour: the city switches its lights off for an hour (ambient-scene.js dims
 *   it); with less glow in the haze, more stars come out.
 * - Programmer's Day and the site owner's birthday.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, pick, envelope, clamp01 } = fx;

  const night = (look) => look.dark > 0.6;
  /** Name of the coming lunar year on Giao thừa night, of the current one after. */
  const tetYear = (cal) => {
    const lunarYear = cal && cal.lunar ? cal.lunar.year + (cal.lunar.month === 12 ? 1 : 0) : 2027;
    return fx.canChi(lunarYear);
  };
  const solarYear = (cal) => (cal && cal.date ? cal.date.getFullYear() : new Date().getFullYear());
  /** The year about to begin on New Year's Eve (the current one on New Year's Day). */
  const nextYear = (cal) => solarYear(cal) + (cal && cal.date && cal.date.getMonth() === 11 ? 1 : 0);

  /* ---------- Lights strung along the far bank ---------- */

  /**
   * Strings of lights hung between lamp posts along the river promenade, swaying a little:
   * red lanterns for Tết, fairy lights for Noel. They glow on the water below.
   * @param {object} stage
   * @param {{kind: 'lantern'|'bulb', colors: string[], duration: number}} o
   */
  function bankLights(stage, o) {
    const { W, H } = stage;
    const scale = H / 1080;
    const y0 = stage.ground - 4 * scale;
    const span = W / 9;
    const lights = [];
    for (let x = -span * 0.2; x < W + span; x += o.kind === 'lantern' ? 20 * scale : 9 * scale) {
      const u = (((x % span) + span) % span) / span; // position between two posts
      lights.push({
        x,
        sag: Math.sin(Math.PI * u) * 9 * scale, // the string hangs in a curve between posts
        color: pick(o.colors),
        phase: rand(0, TAU),
      });
    }
    const glow = fx.glowSprite([255, 190, 120], 24);
    let t = 0;
    return {
      mirror: true,
      bloom: 0.3,
      update(_k, elapsed) {
        t = elapsed;
        return t < o.duration;
      },
      front(ctx) {
        const a = envelope(t, o.duration, 4000, 4000);
        if (a <= 0) return;
        lights.forEach((l) => {
          const sway = Math.sin(t * 0.0012 + l.phase) * 1.2 * scale;
          const x = l.x + sway;
          const y = y0 - 14 * scale + l.sag;
          const twinkle = o.kind === 'bulb' ? 0.55 + 0.45 * Math.sin(t * 0.003 + l.phase * 3) : 1;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a * 0.5 * twinkle;
          const r = (o.kind === 'lantern' ? 9 : 5) * scale;
          ctx.drawImage(glow, x - r, y - r, r * 2, r * 2);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = a * twinkle;
          ctx.fillStyle = l.color;
          if (o.kind === 'lantern') {
            ctx.beginPath();
            ctx.ellipse(x, y + 3 * scale, 2.6 * scale, 3.4 * scale, 0, 0, TAU);
            ctx.fill();
            ctx.fillRect(x - 0.4 * scale, y + 6.4 * scale, 0.8 * scale, 2.5 * scale); // tassel
          } else {
            ctx.fillRect(x - 0.9 * scale, y - 0.9 * scale, 1.8 * scale, 1.8 * scale);
          }
        });
        ctx.globalAlpha = 1;
      },
    };
  }

  /* ---------- Giao thừa & New Year: countdown, then fireworks at midnight ---------- */

  [
    { id: 'tet', palette: fx.palettes.tet, label: 'Giao thừa: pháo hoa đón Tết' },
    { id: 'newyear', palette: null, label: 'Pháo hoa chào năm mới' },
  ].forEach((o) => {
    fx.register({
      name: `${o.id}_countdown`,
      label: o.id === 'tet' ? 'Đếm ngược giao thừa' : 'Đếm ngược năm mới',
      place: 'Landmark 81 · 23:59',
      group: 'occasion',
      occasion: o.id,
      manual: true, // only in the last minute of the year (and from the test lab)
      live: ['countdown'],
      when: night,
      create: (stage, extra = {}) =>
        fx.landmarkShow(stage, ['countdown'], {
          endsAt: extra.live ? extra.live.endsAt : Date.now() + 14000,
          year: o.id === 'tet' ? tetYear(extra.cal) : String(nextYear(extra.cal)),
        }),
    });

    fx.register({
      name: `${o.id}_fireworks`,
      label: o.label,
      place: 'Sông Sài Gòn · 00:00',
      group: 'occasion',
      occasion: o.id,
      manual: true, // at midnight, live (and from the test lab)
      live: ['fireworks'],
      when: night,
      create(stage, extra = {}) {
        const remaining = extra.live ? extra.live.endsAt - Date.now() - 6000 : 45000;
        return fx.fireworksShow(stage, {
          until: Math.max(15000, Math.min(90000, remaining)),
          gap: [300, 800],
          pair: 0.6,
          finale: 30,
          spread: 0.32,
          barge: 0.3,
          palette: o.palette || undefined,
          kinds: [
            'peony',
            'chrysanthemum',
            'chrysanthemum',
            'kamuro',
            'willow',
            'palm',
            'ring',
            'glitter',
            'saturn',
          ],
        });
      },
    });
  });

  fx.register({
    name: 'tet_landmark',
    label: 'Landmark 81 mừng xuân',
    place: 'Tết ở Sài Gòn',
    group: 'occasion',
    occasion: 'tet',
    spectacle: true,
    when: (look) => look.dark > 0.55,
    create: (stage, extra = {}) =>
      fx.landmarkShow(stage, ['tet', 'year', 'sparkle', 'year'], { year: tetYear(extra.cal) }),
  });

  fx.register({
    name: 'tet_drones',
    label: 'Drone show mừng xuân',
    place: 'Sông Sài Gòn',
    group: 'occasion',
    occasion: 'tet',
    spectacle: true,
    when: (look) => look.dark > 0.7,
    create: (stage, extra = {}) =>
      fx.droneShow(stage, [
        { figure: 'mai', colors: 'mai' },
        { figure: 'XUÂN', colors: 'tet' },
        { figure: tetYear(extra.cal).toUpperCase(), colors: 'gold' },
        { lotus: true, colors: 'lotus' },
      ]),
  });

  fx.register({
    name: 'tet_lanterns',
    label: 'Đèn lồng đón Tết bên sông',
    place: 'Bến Bạch Đằng',
    group: 'occasion',
    occasion: 'tet',
    when: (look) => look.dark > 0.45,
    create: (stage) =>
      bankLights(stage, { kind: 'lantern', colors: ['#e3241b', '#e3241b', '#ffb020'], duration: 70000 }),
  });

  fx.register({
    name: 'newyear_landmark',
    label: 'Landmark 81 chào năm mới',
    place: 'Bình Thạnh',
    group: 'occasion',
    occasion: 'newyear',
    spectacle: true,
    when: (look) => look.dark > 0.55,
    create: (stage, extra = {}) =>
      fx.landmarkShow(stage, ['rainbow', 'year', 'sparkle'], { year: String(solarYear(extra.cal)) }),
  });

  /* ---------- 30/4 and 2/9: the flag, fireworks at 21:00 ---------- */

  [
    { id: 'reunification', day: '30/4', since: 1975, name: 'Ngày Thống nhất' },
    { id: 'nationalday', day: '2/9', since: 1945, name: 'Quốc khánh' },
  ].forEach((o) => {
    fx.register({
      name: `${o.id}_fireworks`,
      label: `Pháo hoa mừng ${o.name} ${o.day}`,
      place: 'Sông Sài Gòn · 21:00',
      group: 'occasion',
      occasion: o.id,
      manual: true, // 21:00–21:15, live (and from the test lab)
      live: ['fireworks'],
      when: night,
      create(stage, extra = {}) {
        const remaining = extra.live ? extra.live.endsAt - Date.now() - 6000 : 45000;
        return fx.fireworksShow(stage, {
          until: Math.max(15000, Math.min(90000, remaining)),
          gap: [350, 900],
          pair: 0.55,
          finale: 26,
          spread: 0.3,
          barge: 0.3,
          palette: fx.palettes.flag,
          kinds: ['peony', 'chrysanthemum', 'kamuro', 'ring', 'palm', 'glitter', 'saturn', 'crossette'],
        });
      },
    });

    fx.register({
      name: `${o.id}_landmark`,
      label: `Landmark 81 rực cờ ${o.day}`,
      place: o.name,
      group: 'occasion',
      occasion: o.id,
      spectacle: true,
      when: (look) => look.dark > 0.5,
      create: (stage) => fx.landmarkShow(stage, ['flag', 'rise', 'flag'], { segment: 12000 }),
    });

    fx.register({
      name: `${o.id}_drones`,
      label: `Drone show mừng ${o.day}`,
      place: 'Sông Sài Gòn',
      group: 'occasion',
      occasion: o.id,
      spectacle: true,
      when: (look) => look.dark > 0.7,
      create: (stage, extra = {}) =>
        fx.droneShow(
          stage,
          [
            { flag: true, colors: 'flag' },
            { figure: 'star', colors: 'gold' },
            { figure: o.day, colors: 'flag' },
            { figure: `${solarYear(extra.cal) - o.since} NĂM`, colors: 'gold' },
          ],
          { count: 240, hold: 10500 },
        ),
    });
  });

  /* ---------- Phật đản: floating lanterns from the Nhiêu Lộc canal ---------- */

  const lotusLantern = fx.sprite(40, 30, (ctx, w, h) => {
    const glow = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, w / 2);
    glow.addColorStop(0, 'rgba(255, 200, 120, 0.8)');
    glow.addColorStop(1, 'rgba(255, 160, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Petals: pink, opening around the candle.
    [-0.9, -0.45, 0, 0.45, 0.9].forEach((a) => {
      ctx.save();
      ctx.translate(w / 2, h * 0.72);
      ctx.rotate(a);
      ctx.fillStyle = Math.abs(a) > 0.5 ? 'rgb(236, 110, 160)' : 'rgb(250, 180, 205)';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.2, w * 0.09, h * 0.22, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle = 'rgb(255, 244, 210)';
    ctx.fillRect(w / 2 - 1, h * 0.38, 2, 3);
  });

  fx.register({
    name: 'hoadang',
    label: 'Thả hoa đăng mừng Phật đản',
    place: 'Chùa Pháp Hoa · kênh Nhiêu Lộc',
    group: 'occasion',
    occasion: 'vesak',
    when: (look) => look.dark > 0.5,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const river = stage.river;
      const DURATION = 80000;
      // They come out of the canal's mouth (near Landmark 81) and drift downstream.
      const mouth = stage.landmark.x + W * 0.04;
      const items = Array.from({ length: 70 }, (_, i) => ({
        at: (i / 70) * 52000 + rand(0, 800),
        x: mouth + rand(-0.02, 0.02) * W,
        depth: rand(0.05, 0.9), // 0 at the far bank .. 1 near the viewer
        vx: -rand(0.35, 0.7) * scale,
        phase: rand(0, TAU),
      }));
      let t = 0;
      return {
        bloom: 0.45,
        update(k, elapsed) {
          t = elapsed;
          items.forEach((it) => {
            if (t < it.at) return;
            it.x += it.vx * (0.5 + it.depth) * k;
            it.depth = Math.min(0.95, it.depth + 0.00012 * k); // the current spreads them out
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 3000, 8000);
          items.forEach((it) => {
            if (t < it.at || it.x < -40) return;
            const s = (0.45 + it.depth * 0.9) * scale; // nearer: bigger
            const y = river.top + river.h * it.depth + Math.sin(t * 0.0016 + it.phase) * 1.2 * s;
            const flicker = 0.85 + 0.15 * Math.sin(t * 0.017 + it.phase * 5);
            const w = 26 * s;
            const h = 20 * s;
            ctx.globalAlpha = a * flicker;
            ctx.drawImage(lotusLantern, it.x - w / 2, y - h, w, h);
            // Its warm reflection, broken by the ripples.
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a * 0.25 * flicker;
            ctx.fillStyle = 'rgb(255, 170, 100)';
            ctx.fillRect(it.x - 1 * s, y + 1, 2 * s, 7 * s);
            ctx.globalCompositeOperation = 'source-over';
          });
          ctx.globalAlpha = 1;
        },
      };
    },
  });

  /* ---------- Trung thu: the star-lantern procession under the full moon ---------- */

  const starLantern = (body) =>
    fx.sprite(32, 32, (ctx, w, h) => {
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      glow.addColorStop(0, 'rgba(255, 190, 110, 0.55)');
      glow.addColorStop(1, 'rgba(255, 150, 80, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4.2 : 10;
        const a = (i / 10) * TAU - Math.PI / 2;
        ctx.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
      }
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 220, 0.9)';
      ctx.fillRect(w / 2 - 1.5, h / 2 - 1.5, 3, 3); // the candle inside
    });

  fx.register({
    name: 'ruocden',
    label: 'Rước đèn Trung thu',
    place: 'Đêm rằm tháng Tám',
    group: 'occasion',
    occasion: 'midautumn',
    when: (look) => look.dark > 0.5,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const sprites = ['rgb(230, 40, 40)', 'rgb(255, 196, 40)', 'rgb(255, 120, 60)'].map(starLantern);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const COUNT = 46;
      const speed = 0.32 * scale * dir;
      // Children walk in a loose line along the promenade, lanterns on sticks bobbing as they step.
      const walkers = Array.from({ length: COUNT }, (_, i) => ({
        x: (dir > 0 ? -1 : 1) * (i * 26 + rand(0, 14)) * scale + (dir > 0 ? 0 : W),
        lift: rand(16, 24) * scale,
        step: rand(0.006, 0.008),
        phase: rand(0, TAU),
        sprite: sprites[i % sprites.length],
        size: rand(18, 24) * scale,
      }));
      const travel = COUNT * 26 * scale + W;
      const DURATION = (travel / Math.abs(speed)) * Portfolio.motion.FRAME_MS + 4000;
      let t = 0;
      return {
        mirror: true,
        bloom: 0.45,
        update(k, elapsed) {
          t = elapsed;
          walkers.forEach((w) => {
            w.x += speed * k;
          });
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 3000, 3000);
          walkers.forEach((w) => {
            if (w.x < -30 || w.x > W + 30) return;
            const bob = Math.abs(Math.sin(t * w.step + w.phase)) * 2.2 * scale;
            const swing = Math.sin(t * w.step * 0.5 + w.phase) * 0.18;
            const y = stage.ground - w.lift - bob;
            ctx.save();
            ctx.globalAlpha = a * (0.85 + 0.15 * Math.sin(t * 0.02 + w.phase));
            ctx.translate(w.x, y);
            ctx.rotate(swing);
            ctx.drawImage(w.sprite, -w.size / 2, -w.size / 2, w.size, w.size);
            ctx.restore();
          });
          ctx.globalAlpha = 1;
        },
      };
    },
  });

  fx.register({
    name: 'trungthu_moon',
    label: 'Trăng rằm tháng Tám',
    place: 'Tết Trung thu',
    group: 'occasion',
    occasion: 'midautumn',
    // The full moon itself is real (ambient-calendar.js): this only warms its halo.
    when: (look) => !!look.moon && look.moon.alpha > 0.6,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 60000;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const moon = stage.look.moon;
          if (!moon) return;
          const a = envelope(t, DURATION, 6000, 8000) * moon.alpha;
          const x = moon.x * W;
          const y = moon.y * H;
          const r = H * 0.16;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(255, 220, 160, ${0.22 * a})`);
          g.addColorStop(0.35, `rgba(255, 200, 140, ${0.08 * a})`);
          g.addColorStop(1, 'rgba(255, 200, 140, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        },
      };
    },
  });

  /* ---------- Noel ---------- */

  fx.register({
    name: 'noel_landmark',
    label: 'Landmark 81 đón Giáng sinh',
    place: 'Mùa Noel ở Sài Gòn',
    group: 'occasion',
    occasion: 'christmas',
    spectacle: true,
    when: (look) => look.dark > 0.55,
    create: (stage) => fx.landmarkShow(stage, ['noel', 'sparkle', 'noel'], { segment: 12000 }),
  });

  fx.register({
    name: 'noel_lights',
    label: 'Đèn Noel dọc bờ sông',
    place: 'Bến Bạch Đằng · Nguyễn Huệ',
    group: 'occasion',
    occasion: 'christmas',
    when: (look) => look.dark > 0.45,
    create: (stage) =>
      bankLights(stage, {
        kind: 'bulb',
        colors: ['#fff4dc', '#fff4dc', '#ffd76a', '#ff5a4a', '#5fd38a'],
        duration: 70000,
      }),
  });

  /* ---------- Earth Hour ---------- */

  /**
   * The city switches off (the scene dims the windows and the towers): with less glow in
   * the haze, fainter stars come out. Runs for the hour, live.
   */
  fx.register({
    name: 'earthhour',
    label: 'Giờ Trái Đất: thành phố tắt đèn',
    place: 'Sài Gòn · 20:30 – 21:30',
    group: 'occasion',
    occasion: 'earthhour',
    manual: true,
    live: ['earthhour'],
    when: night,
    create(stage, extra = {}) {
      const { W } = stage;
      const DURATION = extra.live ? Math.max(5000, extra.live.endsAt - Date.now()) : 60000;
      const stars = Array.from({ length: 260 }, () => ({
        x: rand(0, W),
        y: rand(0, 0.7) ** 1.3 * stage.ground,
        s: rand(0.6, 1.3),
        phase: rand(0, TAU),
      }));
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const a = clamp01(t / 25000) * envelope(t, DURATION, 1, 20000);
          ctx.fillStyle = 'rgb(225, 232, 255)';
          stars.forEach((s) => {
            ctx.globalAlpha = a * (0.25 + 0.2 * Math.sin(t * 0.001 + s.phase));
            ctx.fillRect(s.x, s.y, s.s, s.s);
          });
          ctx.globalAlpha = 1;
        },
      };
    },
  });

  /* ---------- Programmer's Day (day 256) and the owner's birthday ---------- */

  fx.register({
    name: 'programmers_landmark',
    label: "Programmer's Day: ngày thứ 256",
    place: 'Landmark 81',
    group: 'occasion',
    occasion: 'programmersday',
    spectacle: true,
    when: (look) => look.dark > 0.55,
    create: (stage) => fx.landmarkShow(stage, ['code', 'scan', 'code'], { segment: 12000 }),
  });

  fx.register({
    name: 'programmers_drones',
    label: "Drone show Programmer's Day",
    place: 'Sông Sài Gòn',
    group: 'occasion',
    occasion: 'programmersday',
    spectacle: true,
    when: (look) => look.dark > 0.7,
    create: (stage) =>
      fx.droneShow(stage, [
        { figure: '</>', colors: 'sweep' },
        { figure: '256', colors: 'sweep' },
        { figure: 'cursor', colors: 'cursor' },
        { figure: 'HELLO WORLD', colors: 'sweep' },
      ]),
  });

  fx.register({
    name: 'birthday_drones',
    label: 'Chúc mừng sinh nhật Thanh Tài',
    place: '16/5',
    group: 'occasion',
    occasion: 'birthday',
    spectacle: true,
    when: (look) => look.dark > 0.7,
    create: (stage) =>
      fx.droneShow(stage, [
        { figure: 'heart', colors: 'pink' },
        { figure: 'HAPPY', colors: 'sweep' },
        { figure: 'BIRTHDAY', colors: 'sweep' },
        { figure: 'cursor', colors: 'cursor' },
      ]),
  });
})((window.Portfolio = window.Portfolio || {}));
