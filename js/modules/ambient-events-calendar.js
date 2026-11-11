/**
 * @file Occasions: what Saigon really does on its days (registered with ambient-events.js).
 * Each event only happens on its occasion (ambient-calendar.js knows the real date and
 * the lunar one); the test lab can play any of them.
 *
 * Every one of them can also come on another day, now and then (`occasionsAnyDay`).
 *
 * - Giao thừa and New Year: the countdown on Landmark 81 and Bitexco in the last minute,
 *   then fireworks over the river opening with a salvo at midnight (live, at the real
 *   time), then both towers wishing a happy new year; Tết nights: the towers in red and
 *   gold with the year's name, drones drawing a mai flower, lanterns strung along the
 *   bank; by day mai petals on the wind (ambient-events-day.js).
 * - 30/4 and 2/9: fireworks 21:00–21:15 (live), the tower lit as the flag, drones
 *   drawing the flag waving.
 * - Phật đản: floating lanterns drifting from the mouth of the Nhiêu Lộc canal.
 * - Trung thu: children's star-lantern procession along the river under the full moon.
 * - Noel: the tower in green and gold, fairy lights along the river.
 * - Earth Hour: the city switches its lights off building by building (stage.city.blackout,
 *   the windows follow it in ambient-sky.js); the Milky Way comes out, candles on the bank.
 * - Programmer's Day and the site owner's birthday.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, pick, envelope, clamp01 } = fx;

  const night = (look) => look.dark > 0.6;
  /** Name of the lunar year Tết opens: the current one in the first lunar month, the coming one otherwise. */
  const tetYear = (cal) => {
    const lunarYear = cal && cal.lunar ? cal.lunar.year + (cal.lunar.month === 1 ? 0 : 1) : 2027;
    return fx.canChi(lunarYear);
  };
  const solarYear = (cal) => (cal && cal.date ? cal.date.getFullYear() : new Date().getFullYear());
  /** The year being welcomed: the current one on New Year's Day, the next one any other day. */
  const nextYear = (cal) => {
    const d = cal && cal.date;
    return solarYear(cal) + (d && d.getMonth() === 0 && d.getDate() === 1 ? 0 : 1);
  };

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

  /*
   * The sequence of the night: countdown (both towers) → at zero, the fireworks open with a
   * salvo → then the towers wish a happy new year. Live at the real time; any other night
   * now and then (occasionsAnyDay), or from the test lab.
   */
  [
    { id: 'tet', palette: fx.palettes.tet, label: 'Giao thừa: pháo hoa đón Tết' },
    { id: 'newyear', palette: null, label: 'Pháo hoa chào năm mới' },
  ].forEach((o) => {
    fx.register({
      name: `${o.id}_countdown`,
      label: o.id === 'tet' ? 'Đếm ngược giao thừa' : 'Đếm ngược năm mới',
      place: 'Landmark 81 · Bitexco · 23:59',
      group: 'occasion',
      occasion: o.id,
      rarity: 'rare',
      spectacle: true,
      live: ['countdown'],
      then: `${o.id}_fireworks`,
      when: (look) => look.dark > 0.8,
      create: (stage, extra = {}) =>
        fx.countdownShow(stage, {
          endsAt: extra.live ? extra.live.endsAt : Date.now() + 13500,
          year: o.id === 'tet' ? tetYear(extra.cal) : String(nextYear(extra.cal)),
        }),
    });

    fx.register({
      name: `${o.id}_fireworks`,
      label: o.label,
      place: 'Sông Sài Gòn · 00:00',
      group: 'occasion',
      occasion: o.id,
      manual: true, // after the countdown, or live at midnight (and from the test lab)
      live: ['fireworks'],
      then: `${o.id}_landmark`,
      when: night,
      create(stage, extra = {}) {
        const remaining = extra.live ? extra.live.endsAt - Date.now() - 6000 : 45000;
        return fx.fireworksShow(stage, {
          until: Math.max(15000, Math.min(90000, remaining)),
          gap: [300, 800],
          pair: 0.6,
          finale: 30,
          opening: 9,
          spread: 0.32,
          barge: 0.3,
          palette: o.palette || undefined,
          kinds: [
            'peony',
            'chrysanthemum',
            'chrysanthemum',
            'pistil',
            'kamuro',
            'willow',
            'palm',
            'ring',
            'glitter',
            'saturn',
            'brocade',
          ],
        });
      },
    });
  });

  fx.register({
    name: 'tet_landmark',
    label: 'Landmark 81 & Bitexco mừng xuân',
    place: 'Tết ở Sài Gòn',
    group: 'occasion',
    occasion: 'tet',
    spectacle: true,
    when: (look) => look.dark > 0.55,
    create: (stage, extra = {}) =>
      fx.combine(
        fx.landmarkShow(stage, ['tet', 'year', 'sparkle', 'year'], { year: tetYear(extra.cal) }),
        fx.bitexcoShow(stage, ['tet', 'lotus', 'sparkle', 'tet'], { segment: 10000 }),
      ),
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
    label: 'Landmark 81 & Bitexco chào năm mới',
    place: 'Bình Thạnh · Quận 1',
    group: 'occasion',
    occasion: 'newyear',
    spectacle: true,
    when: (look) => look.dark > 0.55,
    create: (stage, extra = {}) => {
      const year = String(nextYear(extra.cal));
      return fx.combine(
        fx.landmarkShow(stage, ['year', 'rainbow', 'year', 'sparkle'], { year }),
        fx.bitexcoShow(stage, ['rainbow', 'year', 'helix', 'sparkle'], { year }),
      );
    },
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
      rarity: 'uncommon', // live at 21:00 on the day; another night now and then
      spectacle: true,
      live: ['fireworks'],
      when: (look) => look.dark > 0.7,
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
      create: (stage) =>
        fx.combine(
          fx.landmarkShow(stage, ['flag', 'rise', 'flag'], { segment: 12000 }),
          fx.bitexcoShow(stage, ['flag', 'sonar', 'flag'], { segment: 12000 }),
        ),
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
    create: (stage) =>
      fx.combine(
        fx.landmarkShow(stage, ['noel', 'sparkle', 'noel'], { segment: 12000 }),
        fx.bitexcoShow(stage, ['sparkle', 'noel', 'sparkle'], { segment: 12000 }),
      ),
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
   * The Milky Way, painted once: thousands of faint stars crowded along a band across the
   * sky, a soft glow warmer towards the galactic centre, and the dark dust lane down its
   * middle. Only a city with its lights off shows it.
   */
  function milkyWay(W, H) {
    const w = Math.round(W / 2);
    const h = Math.round(H * 0.45);
    return fx.sprite(w, h, (ctx) => {
      const from = [w * 0.02, h * 1.0];
      const to = [w * 0.98, h * 0.02];
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const nx = -(to[1] - from[1]) / len; // perpendicular to the band
      const ny = (to[0] - from[0]) / len;
      const along = (u, off) => [
        from[0] + (to[0] - from[0]) * u + nx * off,
        from[1] + (to[1] - from[1]) * u + ny * off,
      ];
      const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      // The glow: soft clouds along the band, warm near the core (a third of the way along).
      for (let i = 0; i < 70; i++) {
        const u = Math.random();
        const core = Math.exp(-(((u - 0.35) / 0.18) ** 2));
        const [x, y] = along(u, gauss() * h * 0.08);
        const r = h * (0.08 + Math.random() * 0.1) * (1 + core * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const rgb = core > 0.4 ? '255, 228, 200' : '200, 215, 255';
        g.addColorStop(0, `rgba(${rgb}, ${0.05 + core * 0.05})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Star clouds.
      for (let i = 0; i < 4200; i++) {
        const u = Math.random();
        const [x, y] = along(u, gauss() * h * 0.11);
        const b = Math.random();
        ctx.fillStyle = `rgba(${b < 0.15 ? '255, 230, 210' : '230, 238, 255'}, ${0.12 + b * 0.45})`;
        ctx.fillRect(x, y, b > 0.97 ? 1.4 : 0.8, b > 0.97 ? 1.4 : 0.8);
      }
      // The Great Rift: dark dust down the middle of the band.
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 90; i++) {
        const u = 0.12 + Math.random() * 0.6;
        const [x, y] = along(u, (Math.sin(u * 17) * 0.02 + gauss() * 0.01) * h);
        const r = h * (0.012 + Math.random() * 0.026);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
  }

  const candle = fx.glowSprite([255, 186, 110], 24);

  /**
   * Earth Hour: the city switches its lights off building by building in a wave across
   * the skyline (the windows, Landmark 81's crown, Bitexco's helipad ring, the promenade
   * lamps; the red aviation lights stay on). With no glow in the haze the Milky Way comes
   * out; candles are lit along the bank and floating candles spell 60+ on the river. At
   * the end the lights come back on, the wave running the other way. Live 20:30–21:30 on
   * its day; any other night now and then.
   */
  fx.register({
    name: 'earthhour',
    label: 'Giờ Trái Đất: thành phố tắt đèn',
    place: 'Sài Gòn · 20:30 – 21:30',
    group: 'occasion',
    occasion: 'earthhour',
    rarity: 'rare',
    live: ['earthhour'],
    when: (look) => look.dark > 0.8,
    create(stage, extra = {}) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = extra.live ? Math.max(30000, extra.live.endsAt - Date.now()) : 100000;
      const OFF_AT = 2500;
      const OFF_MS = 11000;
      const ON_MS = 9000;
      const ON_AT = DURATION - ON_MS - 1500;
      const blackoutAt = (t) =>
        t < OFF_AT
          ? 0
          : t < OFF_AT + OFF_MS
            ? fx.easeInOut((t - OFF_AT) / OFF_MS)
            : t < ON_AT
              ? 1
              : 1 - fx.easeInOut((t - ON_AT) / ON_MS);
      const galaxy = milkyWay(W, H);
      const lit = OFF_AT + OFF_MS;
      // People with candles along the promenade.
      const bank = Array.from({ length: 110 }, (_, i) => ({
        x: rand(0.02, 0.98) * W,
        y: stage.ground - rand(1.5, 5) * scale,
        at: lit + i * rand(30, 90),
        phase: rand(0, TAU),
      }));
      // Floating candles spelling 60+ on the water, in perspective.
      const river = stage.river;
      const cx = W * 0.6;
      const span = river.h * 2.6;
      const word = fx.figurePoints(fx.figures.text('60+'), 240).map((p, i) => {
        const d = 0.08 + (p.y + 0.5) * 0.84;
        const spot = fx.onWater(stage, d);
        return {
          x: cx + p.x * span * (0.75 + 0.5 * d),
          y: spot.y,
          s: spot.s,
          at: lit + 3000 + i * 28,
          phase: rand(0, TAU),
        };
      });
      let b = 0;
      let t = 0;
      const flame = (ctx, x, y, s, alpha, phase) => {
        const f = 0.75 + 0.25 * Math.sin(t * 0.013 + phase) * Math.sin(t * 0.0071 + phase * 3);
        const r = 5 * s;
        ctx.globalAlpha = alpha * f;
        ctx.drawImage(candle, x - r, y - r, r * 2, r * 2);
        ctx.fillStyle = 'rgb(255, 236, 200)';
        ctx.fillRect(x - 0.6 * s, y - 0.8 * s, 1.2 * s, 1.6 * s);
      };
      return {
        mirror: true,
        update(_k, elapsed) {
          t = elapsed;
          b = blackoutAt(t);
          stage.city.blackout = b;
          return t < DURATION;
        },
        end() {
          stage.city.blackout = 0;
        },
        back(ctx) {
          const a = b ** 1.5;
          if (a <= 0.01) return;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a * 0.85;
          ctx.drawImage(galaxy, 0, 0, W, H * 0.72); // behind the skyline: it rises from the city
          ctx.globalAlpha = 1;
        },
        front(ctx) {
          const a = clamp01(b * 1.4 - 0.4);
          if (a <= 0) return;
          ctx.globalCompositeOperation = 'lighter';
          bank.forEach((c) => {
            if (t < c.at) return;
            flame(ctx, c.x, c.y, scale, a * clamp01((t - c.at) / 600) * 0.85, c.phase);
          });
          word.forEach((c) => {
            if (t < c.at) return;
            const on = a * clamp01((t - c.at) / 500);
            const bob = Math.sin(t * 0.0015 + c.phase) * 0.8 * c.s;
            flame(ctx, c.x, c.y - 2 * c.s + bob, c.s, on, c.phase);
            // Its warm reflection, broken by the ripples.
            ctx.globalAlpha = on * 0.3;
            ctx.fillStyle = 'rgb(255, 170, 100)';
            ctx.fillRect(c.x - 0.8 * c.s + Math.sin(t * 0.004 + c.phase) * c.s, c.y, 1.6 * c.s, 6 * c.s);
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
    create: (stage) =>
      fx.combine(
        fx.landmarkShow(stage, ['code', 'scan', 'code'], { segment: 12000 }),
        fx.bitexcoShow(stage, ['code', 'equalizer', 'code'], { segment: 12000 }),
      ),
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
