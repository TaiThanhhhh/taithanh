/**
 * @file Ambient surprises in the sky itself (registered with ambient-events.js):
 * a meteor shower and single shooting stars, a satellite pass, a comet, a total
 * lunar eclipse, a 22° halo around the moon, a halo with sun dogs around the
 * sun, and sun rays through the haze.
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, pick, envelope, smooth, clamp01 } = fx;
  const FRAME_MS = Portfolio.motion.FRAME_MS;

  /* ---------- Meteors ---------- */

  /**
   * @param {number} at Start time (ms into the event).
   * @param {number} side Which way the radiant lies (all meteors of a shower share it).
   */
  function makeMeteor(stage, at, side) {
    const { W, H } = stage;
    const scale = H / 1080;
    const bolide = Math.random() < 0.12; // now and then a bright, slow fireball that breaks up
    const angle = rand(0.45, 0.8);
    const speed = rand(13, 20) * scale * (bolide ? 0.7 : 1);
    // Their colour comes from what burns: magnesium (blue-green), sodium (orange), iron (yellow).
    const color = bolide
      ? pick(['200, 255, 215', '190, 240, 255'])
      : pick(['230, 240, 255', '230, 240, 255', '200, 255, 225', '255, 226, 190']);
    return {
      at,
      x: rand(0.1, 0.9) * W,
      y: rand(0.02, 0.4) * H,
      vx: Math.cos(angle) * speed * -side,
      vy: Math.sin(angle) * speed,
      life: bolide ? rand(75, 95) : rand(30, 55),
      len: speed * (bolide ? 18 : 11),
      width: (bolide ? 3 : 1.7) * Math.max(1, scale),
      color,
      bolide,
      // A bolide breaks up at the end: fragments, a flash, and a glowing train that lingers and twists.
      fragments: bolide
        ? Array.from({ length: Math.round(rand(3, 6)) }, () => [rand(-0.25, 0.25), rand(0.5, 0.9)])
        : null,
      flashed: false,
    };
  }

  const TRAIN_MS = 4500;

  /** @param {object} [stage] To light the sky when a fireball bursts. */
  function drawMeteor(ctx, m, t, head, stage) {
    const age = (t - m.at) / FRAME_MS; // in 60fps frames
    if (age < 0 || age > m.life + (m.bolide ? TRAIN_MS / FRAME_MS : 0)) return;
    const v = Math.hypot(m.vx, m.vy);
    const ux = m.vx / v;
    const uy = m.vy / v;
    if (m.bolide) {
      // The persistent train: ionised air along the path, glowing, drifting and twisting.
      const end = Math.min(age, m.life);
      const fade = age > m.life ? 1 - (age - m.life) / (TRAIN_MS / FRAME_MS) : 1;
      ctx.strokeStyle = `rgba(${m.color}, ${0.16 * fade * Math.min(1, age / 20)})`;
      ctx.lineWidth = m.width * 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const s = (i / 16) * end;
        const drift = Math.sin(i * 0.9 + t * 0.0012) * (1 - fade) * 10;
        ctx.lineTo(m.x + m.vx * s - uy * drift, m.y + m.vy * s + ux * drift);
      }
      ctx.stroke();
      if (age > m.life) {
        if (!m.flashed && stage && stage.flash) {
          m.flashed = true;
          stage.flash(m.x + m.vx * m.life, m.y + m.vy * m.life, 0.45, [210, 255, 225], 0.3, 220);
        }
        // Fragments flying on, dimming.
        const f = (age - m.life) / 40;
        if (f < 1) {
          m.fragments.forEach(([turn, k]) => {
            const fx2 = m.x + m.vx * m.life + (ux * Math.cos(turn) - uy * Math.sin(turn)) * v * k * f * 40;
            const fy2 = m.y + m.vy * m.life + (uy * Math.cos(turn) + ux * Math.sin(turn)) * v * k * f * 40;
            ctx.globalAlpha = (1 - f) * 0.9;
            const r = m.width * 2.2 * (1 - f * 0.5);
            ctx.drawImage(head, fx2 - r, fy2 - r, r * 2, r * 2);
          });
          ctx.globalAlpha = 1;
        }
        return;
      }
    }
    const hx = m.x + m.vx * age;
    const hy = m.y + m.vy * age;
    const tail = m.len * Math.min(1, age / 10);
    const tx = hx - ux * tail;
    const ty = hy - uy * tail;
    // Brightens as it plunges deeper, then flares just before it burns out.
    const flare =
      age > m.life * 0.8 ? 1 + Math.sin(((age - m.life * 0.8) / (m.life * 0.2)) * Math.PI) * 0.6 : 1;
    const a = Math.min(1, Math.sin((Math.PI * age) / m.life) ** 0.7 * flare);
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, `rgba(${m.color}, ${a})`);
    g.addColorStop(1, `rgba(${m.color}, 0)`);
    ctx.strokeStyle = g;
    ctx.lineWidth = m.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.globalAlpha = a * 0.8;
    const r = m.width * 4 * flare;
    ctx.drawImage(head, hx - r, hy - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  fx.register({
    name: 'meteors',
    group: 'sky',
    label: 'Mưa sao băng',
    // The real showers (Leonids, Geminids, Perseids...) around their peak nights.
    boost: (cal) => (cal.has('meteorshower') ? 8 : 0.35),
    caption: (cal) => {
      const shower = cal.occasions.find((o) => o.id === 'meteorshower');
      return shower ? { title: shower.name, place: 'Đêm cực đại' } : null;
    },
    when: (look) => look.dark > 0.85,
    create(stage) {
      const DURATION = 26000;
      const head = fx.glowSprite([235, 242, 255], 24);
      const side = Math.random() < 0.5 ? 1 : -1;
      const meteors = [];
      for (let at = rand(300, 1500); at < DURATION - 3000; at += rand(700, 3000)) {
        meteors.push(makeMeteor(stage, at, side));
      }
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          ctx.globalCompositeOperation = 'lighter';
          meteors.forEach((m) => drawMeteor(ctx, m, t, head, stage));
        },
      };
    },
  });

  fx.register({
    name: 'shootingstar',
    group: 'sky',
    label: 'Sao băng',
    tier: 'detail',
    boost: (cal) => (cal.has('meteorshower') ? 2.5 : 1),
    when: (look) => look.dark > 0.7,
    create(stage) {
      const head = fx.glowSprite([235, 242, 255], 24);
      const m = makeMeteor(stage, 0, Math.random() < 0.5 ? 1 : -1);
      const DURATION = m.life * FRAME_MS + (m.bolide ? TRAIN_MS : 0) + 100;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          ctx.globalCompositeOperation = 'lighter';
          drawMeteor(ctx, m, t, head, stage);
        },
      };
    },
  });

  /* ---------- Satellites: a pass tracked by a HUD ---------- */

  const MONO = '"JetBrains Mono", "SFMono-Regular", Consolas, "Courier New", monospace';

  /**
   * A tracker that locks on to a moving point, like a telescope's or a flight radar's:
   * four corner brackets close in from wide and settle with a little overshoot, a thin
   * leader line to a label that types itself out, and live figures ticking.
   * @param {object} o
   * @param {string} o.title
   * @param {() => string[]} o.lines Second and third lines (live figures).
   * @param {string} [o.rgb] Colour of the HUD.
   */
  function tracker(stage, o) {
    const scale = stage.H / 1080;
    const rgb = o.rgb || '150, 230, 255';
    return {
      /**
       * @param {number} x
       * @param {number} y
       * @param {number} lockT ms since the lock started (negative: not yet).
       * @param {number} alpha
       * @param {number} [boxW] Half-width of the box (a train is wider).
       */
      draw(ctx, x, y, lockT, alpha, boxW = 12) {
        if (lockT < 0 || alpha <= 0.01) return;
        const close = fx.backOut(lockT / 700, 1.4); // brackets: wide → snug, overshooting a little
        const half = (boxW + (1 - close) * 46) * scale;
        const halfH = (12 + (1 - close) * 46) * scale;
        const arm = 6 * scale;
        const blink = lockT < 700 ? (Math.floor(lockT / 90) % 2 ? 0.4 : 1) : 1;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(${rgb}, ${0.85 * alpha * blink})`;
        ctx.lineWidth = Math.max(1, scale);
        ctx.beginPath();
        [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].forEach(([sx, sy]) => {
          const cx = x + sx * half;
          const cy = y + sy * halfH;
          ctx.moveTo(cx, cy - sy * arm);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx - sx * arm, cy);
        });
        ctx.stroke();
        // A centre tick, rotating slowly while tracking.
        ctx.translate(x, y);
        ctx.rotate(lockT * 0.0006);
        ctx.strokeStyle = `rgba(${rgb}, ${0.35 * alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5 * scale, 0.2, Math.PI / 2 - 0.2);
        ctx.arc(0, 0, 4.5 * scale, Math.PI + 0.2, Math.PI * 1.5 - 0.2);
        ctx.stroke();
        ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
        // Leader line, then the label (typed out once locked).
        const info = clamp01((lockT - 600) / 400);
        if (info > 0) {
          const lines = [o.title, ...o.lines()];
          ctx.font = `600 ${Math.round(11 * Math.max(1, scale))}px ${MONO}`;
          const textW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 6 * scale;
          // The label goes to the right of the target, or to its left near the right edge.
          const side = x + half + 30 * scale + textW > stage.W - 8 ? -1 : 1;
          const cx = x + side * half;
          const lx = cx + side * 26 * scale;
          const ly = y - halfH - 18 * scale;
          ctx.strokeStyle = `rgba(${rgb}, ${0.5 * alpha * info})`;
          ctx.beginPath();
          ctx.moveTo(cx, y - halfH);
          ctx.lineTo(cx + (lx - cx) * info, y - halfH + (ly - y + halfH) * info);
          ctx.lineTo(cx + (lx - cx) * info + side * 70 * scale * clamp01((lockT - 1000) / 300), ly);
          ctx.stroke();
          const typed = Math.max(0, Math.floor((lockT - 1000) / 28));
          ctx.textBaseline = 'bottom';
          ctx.textAlign = side > 0 ? 'left' : 'right';
          let budget = typed;
          lines.forEach((line, i) => {
            if (budget <= 0) return;
            const shown = line.slice(0, budget);
            budget -= line.length;
            ctx.fillStyle = `rgba(${rgb}, ${(i ? 0.6 : 0.95) * alpha})`;
            ctx.font = `${i ? 400 : 600} ${Math.round((i ? 10 : 11) * Math.max(1, scale))}px ${MONO}`;
            const cursor = budget < 0 && Math.floor(lockT / 260) % 2 ? '▌' : '';
            ctx.fillText(shown + cursor, lx + side * 2 * scale, ly - 2 * scale + i * 13 * scale + 13 * scale);
          });
        }
        ctx.restore();
      },
    };
  }

  /** A pass along a straight track across the sky (p: 0..1 → screen position). */
  function track(stage) {
    const { W, H } = stage;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y0 = rand(0.08, 0.3) * H;
    const drop = rand(-0.1, 0.12) * H;
    return (p) => ({ x: dir > 0 ? (p * 1.1 - 0.05) * W : (1.05 - p * 1.1) * W, y: y0 + drop * p, dir });
  }

  fx.register({
    name: 'satellite',
    group: 'sky',
    label: 'Trạm vũ trụ bay qua',
    tier: 'detail',
    weight: 1.2,
    when: (look) => look.dark > 0.75,
    create(stage) {
      const scale = stage.H / 1080;
      const station = pick([
        { title: 'ISS · TRẠM VŨ TRỤ QUỐC TẾ', km: 418, speed: 7.66 },
        { title: 'TIANGONG · THIÊN CUNG', km: 385, speed: 7.68 },
      ]);
      const CROSS = rand(30000, 38000);
      const at = track(stage);
      const shadowAt = rand(0.62, 0.82); // it goes dark mid-sky, entering the Earth's shadow
      const dot = fx.glowSprite([240, 244, 255], 24);
      const orange = fx.glowSprite([255, 140, 70], 24);
      const hud = tracker(stage, {
        title: station.title,
        lines: () => {
          const p = Math.min(1, t / CROSS);
          const alt = station.km + Math.sin(p * 3) * 2;
          return [
            `ALT ${alt.toFixed(1)} KM · ${station.speed.toFixed(2)} KM/S`,
            p > shadowAt - 0.02 ? 'VÀO BÓNG TỐI TRÁI ĐẤT…' : `ĐỘ SÁNG ${(-3.6 + p * 1.2).toFixed(1)} MAG`,
          ];
        },
      });
      const trail = [];
      const DURATION = CROSS + 600;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          const p = t / CROSS;
          const last = trail[trail.length - 1];
          if (p < 1 && (!last || t - last.t > 120)) trail.push({ ...at(p), t });
          while (trail.length && t - trail[0].t > 2600) trail.shift();
          return t < DURATION;
        },
        back(ctx) {
          const p = t / CROSS;
          if (p > 1) return;
          const { x, y } = at(p);
          // Sunlit → reddening at the edge of the Earth's shadow (sunset light) → gone.
          const sunset = smooth((p - (shadowAt - 0.06)) / 0.06);
          const gone = smooth((p - shadowAt) / 0.035);
          const a = smooth(p / 0.08) * (1 - gone);
          if (a <= 0.01) return;
          // A faint streak behind it (the eye's persistence).
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          for (let i = 1; i < trail.length; i++) {
            const age = (t - trail[i].t) / 2600;
            ctx.strokeStyle = `rgba(230, 238, 255, ${0.18 * a * (1 - age)})`;
            ctx.lineWidth = 1.2 * scale;
            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
          }
          const r = (7 + 3 * (1 - sunset)) * scale;
          ctx.globalAlpha = a * (1 - sunset);
          ctx.drawImage(dot, x - r, y - r, r * 2, r * 2);
          ctx.globalAlpha = a * sunset;
          ctx.drawImage(orange, x - r, y - r, r * 2, r * 2);
          ctx.globalAlpha = a;
          ctx.fillStyle = sunset > 0.5 ? '#ffb27a' : '#ffffff';
          ctx.fillRect(x - 1.1, y - 1.1, 2.2, 2.2);
          ctx.globalAlpha = 1;
        },
        front(ctx) {
          const p = t / CROSS;
          if (p > 1) return;
          const { x, y } = at(p);
          const lockT = t - CROSS * 0.1;
          // The HUD lets go once the station has gone dark.
          const a = 1 - smooth((p - shadowAt - 0.02) / 0.05);
          hud.draw(ctx, x, y, lockT, a * smooth(p / 0.12));
        },
      };
    },
  });

  fx.register({
    name: 'starlink',
    group: 'sky',
    label: 'Đoàn vệ tinh Starlink',
    tier: 'detail',
    rarity: 'uncommon',
    when: (look) => look.dark > 0.7,
    create(stage) {
      const { W } = stage;
      const scale = stage.H / 1080;
      const CROSS = rand(38000, 46000);
      const at = track(stage);
      const count = Math.round(rand(16, 26));
      const gap = rand(10, 14) / (W * 1.1); // spacing along the path
      const dot = fx.glowSprite([235, 240, 255], 16);
      // Each catches the sun for a moment as it passes the same spot (a flare running down the train).
      const flareAt = rand(0.35, 0.6);
      const hud = tracker(stage, {
        title: `STARLINK · ${count} VỆ TINH`,
        lines: () => ['ALT 340 KM · 7.70 KM/S', 'MỚI PHÓNG · ĐANG NÂNG QUỸ ĐẠO'],
        rgb: '190, 210, 255',
      });
      const DURATION = CROSS * (1 + count * gap);
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < count; i++) {
            const p = t / CROSS - i * gap;
            if (p < 0 || p > 1) continue;
            const { x, y } = at(p);
            const flare = Math.exp(-(((p - flareAt) / 0.012) ** 2));
            const a = 0.6 * smooth(p / 0.1) * (1 - smooth((p - 0.9) / 0.1)) + flare * 0.8;
            if (a <= 0.01) continue;
            const r = (4 + flare * 10) * scale;
            ctx.globalAlpha = Math.min(1, a);
            ctx.drawImage(dot, x - r, y - r, r * 2, r * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
          }
          ctx.globalAlpha = 1;
        },
        front(ctx) {
          // Locks on to the head of the train while it crosses the middle of the sky.
          const p = t / CROSS;
          if (p > 1) return;
          const head = at(p);
          const mid = at(Math.max(0, p - (count * gap) / 2));
          const a = smooth((p - 0.15) / 0.05) * (1 - smooth((p - 0.75) / 0.06));
          hud.draw(
            ctx,
            (head.x + mid.x) / 2,
            (head.y + mid.y) / 2,
            t - CROSS * 0.15,
            a,
            Math.abs(head.x - mid.x) / 2 / scale + 10,
          );
        },
      };
    },
  });

  fx.register({
    name: 'satflare',
    group: 'sky',
    label: 'Vệ tinh lóe sáng',
    tier: 'detail',
    rarity: 'uncommon',
    when: (look) => look.dark > 0.75,
    create(stage) {
      const scale = stage.H / 1080;
      const CROSS = rand(22000, 28000);
      const at = track(stage);
      const peak = rand(0.4, 0.6);
      const star = fx.glowSprite([255, 255, 255], 64);
      const hud = tracker(stage, {
        title: 'VỆ TINH LÓE SÁNG',
        lines: () => ['TẤM PIN PHẢN CHIẾU MẶT TRỜI', `CỰC ĐẠI ${(-6 - Math.random() * 0.2).toFixed(1)} MAG`],
        rgb: '255, 226, 170',
      });
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < CROSS;
        },
        back(ctx) {
          const p = t / CROSS;
          const { x, y } = at(p);
          // A faint dot, then a sudden glint for a couple of seconds (sunlight off its panels).
          const glint = Math.exp(-(((p - peak) / 0.03) ** 2));
          const a = 0.35 * smooth(p / 0.1) * (1 - smooth((p - 0.9) / 0.1)) + glint;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, a);
          const r = (3 + glint * 20) * scale;
          ctx.drawImage(star, x - r, y - r, r * 2, r * 2);
          if (glint > 0.2) {
            // Diffraction spikes, like through a lens.
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * glint})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - r * 2, y);
            ctx.lineTo(x + r * 2, y);
            ctx.moveTo(x, y - r * 2);
            ctx.lineTo(x, y + r * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        },
        front(ctx) {
          const p = t / CROSS;
          const { x, y } = at(p);
          const a = smooth((p - (peak - 0.12)) / 0.04) * (1 - smooth((p - peak - 0.14) / 0.05));
          hud.draw(ctx, x, y, t - CROSS * (peak - 0.12), a);
        },
      };
    },
  });

  /* ---------- A great comet ---------- */

  /**
   * A great comet, alive: the nucleus moves slowly along its path; the dust tail is a
   * stream of grains released from the coma and pushed away from the sun (below the
   * horizon) while the comet moves on, so it curves and fans out on its own; the ion
   * tail is a few straight blue streamers, rippling in the solar wind, with knots of gas
   * running down them (and now and then the whole tail torn off and re-forming: a
   * disconnection event); the coma breathes; sometimes an outburst throws a shell of
   * dust that expands round the head.
   */
  fx.register({
    name: 'comet',
    group: 'sky',
    label: 'Sao chổi lớn',
    rarity: 'rare',
    when: (look) => look.dark > 0.8,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 95000;
      const side = Math.random() < 0.5 ? 1 : -1;
      // Path of the nucleus across the event (slow: a comet barely moves in an evening).
      const p0 = { x: (0.5 - side * rand(0.05, 0.2)) * W, y: rand(0.18, 0.3) * H };
      const p1 = { x: p0.x + side * rand(0.06, 0.1) * W, y: p0.y + rand(-0.03, 0.04) * H };
      // Away from the sun: up and leaning.
      const away = -Math.PI / 2 + side * rand(0.35, 0.75);
      const ax = Math.cos(away);
      const ay = Math.sin(away);
      const ionLen = H * rand(0.42, 0.55);
      const green = Math.random() < 0.5; // some comets have a vivid green coma (C2 gas)
      const comaRgb = green ? [150, 255, 190] : [235, 245, 255];
      // A grain: soft all over (no hot core), so thousands blend into a smooth haze.
      const grain = fx.sprite(32, 32, (ctx) => {
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255, 236, 205, 0.55)');
        g.addColorStop(0.5, 'rgba(255, 236, 205, 0.22)');
        g.addColorStop(1, 'rgba(255, 236, 205, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 32, 32);
      });
      const coma = fx.glowSprite(comaRgb, 64);
      const core = fx.glowSprite([255, 255, 250], 24);
      const ionGlow = fx.glowSprite([140, 190, 255], 24);
      // The dust tail curls to one side: the grains fall behind the comet along its orbit.
      const curlSide = Math.random() < 0.5 ? 1 : -1;
      const curl = 0.0035 * scale * curlSide;
      // Under the grains, a smooth veil of dust: a wide, curved fan (painted once, tail to the left,
      // bending towards -y, which the rotation below turns towards the side the grains curl to).
      const veilLen = H * 0.36;
      const veil = fx.sprite(veilLen, veilLen * 0.5, (ctx, w, h) => {
        const y = h / 2;
        const g = ctx.createLinearGradient(w, 0, 0, 0);
        g.addColorStop(0, 'rgba(255, 236, 205, 0.5)');
        g.addColorStop(0.45, 'rgba(255, 228, 195, 0.14)');
        g.addColorStop(1, 'rgba(255, 228, 195, 0)');
        ctx.fillStyle = g;
        ctx.filter = `blur(${Math.max(2, h * 0.05)}px)`;
        ctx.beginPath();
        ctx.moveTo(w * 0.98, y);
        ctx.quadraticCurveTo(w * 0.5, y - h * 0.02, w * 0.06, y - h * 0.4);
        ctx.lineTo(w * 0.04, y - h * 0.02);
        ctx.quadraticCurveTo(w * 0.5, y + h * 0.1, w * 0.98, y + 1);
        ctx.fill();
      });
      const px = -ay;
      const py = ax;
      const dust = [];
      const MAX = 1300;
      const knots = [];
      const outburst = Math.random() < 0.55 ? rand(30000, 60000) : Infinity;
      const disconnect = Math.random() < 0.6 ? rand(25000, 65000) : Infinity;
      let head = { ...p0 };
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          const u = fx.easeInOut(t / DURATION);
          head = { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u };
          // Grains leave the coma in all directions, slowly, then radiation pressure pushes
          // them away from the sun, each at its own rate (small grains faster): the fan.
          for (let i = 0; i < 3 * k && dust.length < MAX; i++) {
            const a = rand(0, TAU);
            const s = rand(0.05, 0.3) * scale;
            dust.push({
              x: head.x,
              y: head.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              push: rand(0.0012, 0.005) * scale * (Math.random() < 0.2 ? 1.8 : 1),
              life: 1,
              decay: rand(0.0018, 0.003),
              size: rand(0.6, 1.4),
            });
          }
          dust.forEach((d) => {
            // Pushed away from the sun; the older a grain, the further it has fallen behind
            // the comet's motion: the tail curves and fans out.
            const lag = curl * (1 - d.life);
            d.vx = d.vx * 0.997 + (ax * d.push + px * lag) * k;
            d.vy = d.vy * 0.997 + (ay * d.push + py * lag) * k;
            d.x += d.vx * k;
            d.y += d.vy * k;
            d.life -= d.decay * k;
          });
          fx.compact(dust, (d) => d.life > 0);
          // Knots of ionised gas running down the ion tail.
          if (Math.random() < 0.02 * k) knots.push({ s: 0, v: rand(0.0012, 0.0024), w: rand(0.5, 1) });
          knots.forEach((n) => {
            n.s += n.v * k;
          });
          fx.compact(knots, (n) => n.s < 1);
          return t < DURATION;
        },
        back(ctx) {
          const env = envelope(t, DURATION, 12000, 12000);
          if (env <= 0) return;
          ctx.globalCompositeOperation = 'lighter';
          // Ion tail: thin streamers rippling in the solar wind. A disconnection tears it off
          // the head: a gap opens at the head and runs down the tail, the tail re-forming behind.
          const gap = t > disconnect && t < disconnect + 9000 ? ((t - disconnect) / 9000) * 1.2 : -1;
          for (let s = 0; s < 5; s++) {
            const spread = (s - 2) * 0.018;
            ctx.beginPath();
            const steps = 30;
            let pen = false;
            for (let i = 0; i <= steps; i++) {
              const f = i / steps;
              if (gap >= 0 && f > gap - 0.16 && f < gap) {
                pen = false;
                continue;
              }
              const wave = Math.sin(f * 7 - t * 0.0016 + s) * f * f * H * 0.02;
              const ang = away + spread * (1 + f);
              const x = head.x + Math.cos(ang) * ionLen * f + px * wave;
              const y = head.y + Math.sin(ang) * ionLen * f + py * wave;
              if (pen) ctx.lineTo(x, y);
              else ctx.moveTo(x, y);
              pen = true;
            }
            const g = ctx.createLinearGradient(head.x, head.y, head.x + ax * ionLen, head.y + ay * ionLen);
            g.addColorStop(0, `rgba(130, 190, 255, ${0.32 * env * (s === 2 ? 1.3 : 0.7)})`);
            g.addColorStop(1, 'rgba(130, 190, 255, 0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = (s === 2 ? 2.2 : 1.2) * scale;
            ctx.stroke();
          }
          // Knots: brighter blobs travelling down the tail.
          knots.forEach((n) => {
            const r = (6 + n.s * 18) * scale * n.w;
            ctx.globalAlpha = env * 0.4 * (1 - n.s);
            ctx.drawImage(
              ionGlow,
              head.x + ax * ionLen * n.s - r,
              head.y + ay * ionLen * n.s - r,
              r * 2,
              r * 2,
            );
          });
          // Dust tail: the smooth veil, then the grains on it, warm white, brighter near the head.
          ctx.save();
          ctx.translate(head.x, head.y);
          ctx.rotate(away + Math.PI);
          ctx.scale(1, curlSide);
          ctx.globalAlpha = env * 0.6;
          ctx.drawImage(veil, -veil.width * 0.98, -veil.height / 2);
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter';
          dust.forEach((d) => {
            const a = d.life ** 1.5 * env * 0.4;
            if (a < 0.01) return;
            const r = (3 + (1 - d.life) * 11) * d.size * scale;
            ctx.globalAlpha = a;
            ctx.drawImage(grain, d.x - r, d.y - r, r * 2, r * 2);
          });
          // Outburst: a shell of dust expanding round the head, fading.
          if (t > outburst && t < outburst + 14000) {
            const v = (t - outburst) / 14000;
            const R = (10 + v * 70) * scale;
            const g = ctx.createRadialGradient(head.x, head.y, R * 0.6, head.x, head.y, R);
            g.addColorStop(0, 'rgba(255, 240, 210, 0)');
            g.addColorStop(0.85, `rgba(255, 240, 210, ${0.22 * (1 - v) * env})`);
            g.addColorStop(1, 'rgba(255, 240, 210, 0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(head.x - R, head.y - R, R * 2, R * 2);
          }
          // The coma, breathing, and the star-like nucleus.
          const breath =
            1 + 0.08 * Math.sin(t * 0.0011) + (t > outburst ? 0.5 * Math.exp(-(t - outburst) / 6000) : 0);
          const rc = 26 * scale * breath;
          ctx.globalAlpha = env * 0.8;
          ctx.drawImage(coma, head.x - rc, head.y - rc, rc * 2, rc * 2);
          const rn = 7 * scale * breath;
          ctx.globalAlpha = env;
          ctx.drawImage(core, head.x - rn, head.y - rn, rn * 2, rn * 2);
          ctx.globalAlpha = 1;
        },
      };
    },
  });

  /* ---------- Total lunar eclipse ("blood moon") ---------- */

  fx.register({
    name: 'eclipse',
    group: 'sky',
    label: 'Nguyệt thực toàn phần',
    rarity: 'rare',
    // Only at full moon, as in the sky.
    when: (look, stage) => !!look.moon && look.moon.alpha > 0.7 && look.moon.y < 0.8 && stage.moonDisc().full,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 100000;
      let t = 0;
      let depth = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        end() {
          stage.setMoonFilter('');
        },
        back(ctx) {
          const moon = stage.look.moon;
          if (!moon) return;
          const { r } = stage.moonDisc();
          const mx = moon.x * W;
          const my = moon.y * H;
          // The Earth's umbra (2.6 moon radii) slides across the moon; totality in the middle.
          const R = r * 2.6;
          const reach = (R + r) * 1.05;
          const ox = -reach + (2 * reach * t) / DURATION;
          const oy = r * 0.35 * (t / DURATION - 0.5);
          depth = clamp01(1 - (Math.abs(ox) - (R - r)) / (2 * r));
          // The halo dims, the disc turns copper (sunlight bent through the Earth's atmosphere).
          stage.setMoonFilter(`brightness(${(1 - 0.55 * depth).toFixed(3)})`);
          ctx.beginPath();
          ctx.arc(mx, my, r + 0.5, 0, TAU);
          ctx.clip();
          const g = ctx.createRadialGradient(mx + ox, my + oy, 0, mx + ox, my + oy, R);
          g.addColorStop(0, 'rgba(96, 26, 14, 0.94)');
          g.addColorStop(0.7, 'rgba(150, 56, 26, 0.88)');
          g.addColorStop(0.96, 'rgba(70, 30, 26, 0.8)');
          g.addColorStop(1, 'rgba(40, 30, 40, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(mx - r - 1, my - r - 1, r * 2 + 2, r * 2 + 2);
        },
      };
    },
  });

  /* ---------- 22° halos: around the moon, and around the sun with sun dogs ---------- */

  /** A faint ring, reddish on the inside (ice crystals in thin cirrus bend red the least). */
  function drawHalo(ctx, x, y, R, a, scale) {
    ctx.globalCompositeOperation = 'lighter';
    [
      [0.975, '255, 160, 140', 0.11],
      [1, '235, 238, 255', 0.13],
      [1.03, '200, 215, 255', 0.06],
    ].forEach(([k, rgb, alpha]) => {
      ctx.strokeStyle = `rgba(${rgb}, ${alpha * a})`;
      ctx.lineWidth = 7 * scale;
      ctx.beginPath();
      ctx.arc(x, y, R * k, 0, TAU);
      ctx.stroke();
    });
  }

  fx.register({
    name: 'moonhalo',
    group: 'sky',
    label: 'Quầng trăng',
    rarity: 'uncommon',
    when: (look) => !!look.moon && look.moon.alpha > 0.6 && look.moon.y < 0.72,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 70000;
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const moon = stage.look.moon;
          if (moon)
            drawHalo(ctx, moon.x * W, moon.y * H, H * 0.17, envelope(t, DURATION, 8000, 10000), H / 1080);
        },
      };
    },
  });

  fx.register({
    name: 'sundogs',
    group: 'sky',
    label: 'Quầng mặt trời và mặt trời giả',
    rarity: 'rare',
    when: (look) => !!look.sun && look.sun.altitude > 0.25 && look.sun.altitude < 0.8 && look.dark < 0.2,
    create(stage) {
      const { W, H } = stage;
      const scale = H / 1080;
      const DURATION = 65000;
      const R = H * 0.2;
      // A sun dog: red towards the sun, white then bluish away from it.
      const dog = fx.sprite(48, 96, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(255, 130, 100, 0.85)');
        g.addColorStop(0.4, 'rgba(255, 236, 200, 0.9)');
        g.addColorStop(1, 'rgba(170, 200, 255, 0)');
        ctx.fillStyle = g;
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        ctx.ellipse(w * 0.4, h / 2, w * 0.3, h * 0.38, 0, 0, TAU);
        ctx.fill();
      });
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const sun = stage.look.sun;
          if (!sun) return;
          const a = envelope(t, DURATION, 8000, 10000);
          const sx = sun.x * W;
          const sy = sun.y * H;
          drawHalo(ctx, sx, sy, R, a * 1.6, scale);
          // Upper tangent arc, touching the top of the halo.
          ctx.strokeStyle = `rgba(255, 245, 225, ${0.1 * a})`;
          ctx.lineWidth = 6 * scale;
          ctx.beginPath();
          ctx.arc(sx, sy - R + R * 0.7, R * 0.7, Math.PI * 1.3, Math.PI * 1.7);
          ctx.stroke();
          // Sun dogs, just outside the halo at the sun's height.
          const w = 26 * scale;
          const h = 52 * scale;
          ctx.globalAlpha = a * 0.95;
          [1, -1].forEach((side) => {
            ctx.save();
            ctx.translate(sx + side * R * 1.04, sy);
            ctx.scale(side, 1);
            ctx.drawImage(dog, -w * 0.4, -h / 2, w, h);
            ctx.restore();
          });
        },
      };
    },
  });

  /* ---------- Sun rays through the haze ---------- */

  fx.register({
    name: 'sunrays',
    group: 'sky',
    label: 'Tia nắng xuyên mây',
    weight: 1.1,
    when: (look) => !!look.sun && look.sun.altitude > 0.08 && look.sun.altitude < 0.5,
    create(stage) {
      const { W, H } = stage;
      const DURATION = 50000;
      const L = Math.hypot(W, H);
      const rays = Array.from({ length: Math.round(rand(10, 15)) }, () => ({
        angle: rand(0, TAU),
        width: rand(0.012, 0.05),
        alpha: rand(0.4, 1),
        speed: rand(0.0002, 0.0005),
        phase: rand(0, TAU),
      }));
      let t = 0;
      return {
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        back(ctx) {
          const sun = stage.look.sun;
          if (!sun) return;
          const sx = sun.x * W;
          const sy = sun.y * H;
          const env = envelope(t, DURATION, 6000, 8000);
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, L * 0.8);
          g.addColorStop(0, 'rgba(255, 226, 170, 0.22)');
          g.addColorStop(0.35, 'rgba(255, 214, 160, 0.08)');
          g.addColorStop(1, 'rgba(255, 214, 160, 0)');
          ctx.fillStyle = g;
          ctx.globalCompositeOperation = 'lighter';
          rays.forEach((r) => {
            const a = r.angle + Math.sin(t * 0.00005 + r.phase) * 0.03; // turning very slowly
            ctx.globalAlpha = env * r.alpha * (0.6 + 0.4 * Math.sin(t * r.speed + r.phase));
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(a - r.width) * L, sy + Math.sin(a - r.width) * L);
            ctx.lineTo(sx + Math.cos(a + r.width) * L, sy + Math.sin(a + r.width) * L);
            ctx.closePath();
            ctx.fill();
          });
        },
      };
    },
  });
})((window.Portfolio = window.Portfolio || {}));
