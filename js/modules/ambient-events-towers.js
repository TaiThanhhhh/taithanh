/**
 * @file The two towers of the skyline (registered with ambient-events.js): Bitexco's
 * own light shows, Landmark 81 and Bitexco playing together (light passing from one
 * crown to the other), a helicopter landing on Bitexco's helipad (cantilevered from its
 * 52nd floor), the low sun catching Bitexco's glass, and the New Year countdown on both
 * towers (shared with ambient-events-calendar.js: `fx.countdownShow`).
 *
 * `fx.bitexcoShow(stage, programs, o)` is the Bitexco counterpart of `fx.landmarkShow`:
 * each program is clipped to the tower's outline (stage.traceBitexco).
 */
(function (Portfolio) {
  'use strict';

  const fx = Portfolio.ambientFx;
  const { TAU, rand, envelope, smooth, clamp01 } = fx;

  /* ---------- Bitexco's light shows ---------- */

  /**
   * Programs drawing the whole tower (clip already set): (ctx, local, a, B, stage, o).
   * Row programs from Landmark 81 (fx.ledPrograms) work too.
   */
  const BITEXCO = {
    /** A lotus of light opening from the base: the tower is shaped like a lotus bud. */
    lotus(ctx, local, a, B, stage) {
      const grow = fx.easeOut(local / 2600);
      const hue = (330 + Math.sin(local * 0.0007) * 20 + 360) % 360;
      ctx.globalCompositeOperation = 'lighter';
      [
        { n: 5, spread: 1.05, len: 1.05, delay: 0, light: 58 },
        { n: 4, spread: 0.7, len: 0.85, delay: 0.25, light: 70 },
        { n: 3, spread: 0.35, len: 0.65, delay: 0.45, light: 84 },
      ].forEach((ring) => {
        const g = clamp01((grow - ring.delay) / (1 - ring.delay));
        if (g <= 0) return;
        for (let i = 0; i < ring.n; i++) {
          const ang = ring.n > 1 ? -ring.spread + (2 * ring.spread * i) / (ring.n - 1) : 0;
          const len = B.h * ring.len * g;
          const wid = B.w * 0.42 * g;
          ctx.save();
          ctx.translate(B.x, stage.ground);
          ctx.rotate(ang * 0.35);
          const grad = ctx.createLinearGradient(0, 0, 0, -len);
          grad.addColorStop(0, `hsla(${hue}, 85%, ${ring.light - 18}%, ${0.75 * a})`);
          grad.addColorStop(1, `hsla(${hue + 20}, 90%, ${ring.light}%, ${0.25 * a})`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-wid, -len * 0.55, 0, -len);
          ctx.quadraticCurveTo(wid, -len * 0.55, 0, 0);
          ctx.fill();
          ctx.restore();
        }
      });
      // Pollen of light rising up the middle once it has opened.
      if (grow > 0.8) {
        ctx.fillStyle = `rgba(255, 236, 170, ${0.8 * a})`;
        for (let i = 0; i < 16; i++) {
          const v = (local * 0.00018 + i / 16) % 1;
          ctx.fillRect(
            B.x + Math.sin(i * 7.3 + local * 0.002) * B.w * 0.18,
            stage.ground - B.h * v,
            1.6,
            1.6,
          );
        }
      }
    },
    /** Two families of stripes twisting round the tower in opposite directions (a double helix). */
    helix(ctx, local, a, B, stage) {
      const left = B.x - B.w * 0.7;
      const width = B.w * 1.4;
      const sw = Math.max(2, B.w * 0.12);
      ctx.globalCompositeOperation = 'lighter';
      [
        [1, 'rgba(90, 225, 255,', 0.00022],
        [-1, 'rgba(230, 110, 255,', 0.00017],
      ].forEach(([sign, rgb, speed]) => {
        ctx.fillStyle = `${rgb} ${0.7 * a})`;
        for (let i = 0; i < 4; i++) {
          const u = (((local * speed + i / 4) % 1) + 1) % 1;
          [0, 1].forEach((wrap) => {
            const xb = left + (u - wrap) * width * 1.6;
            const shift = sign * width * 0.8;
            ctx.beginPath();
            ctx.moveTo(xb, stage.ground);
            ctx.lineTo(xb + sw, stage.ground);
            ctx.lineTo(xb + sw + shift, B.top);
            ctx.lineTo(xb + shift, B.top);
            ctx.fill();
          });
        }
      });
    },
    /** A music visualiser: LED bars bouncing, peaks falling back slowly. */
    equalizer(ctx, local, a, B, stage, o) {
      const bars = 6;
      const left = B.x - B.w * 0.62;
      const bw = (B.w * 1.24) / bars;
      o.peaks = o.peaks || new Array(bars).fill(0);
      for (let i = 0; i < bars; i++) {
        const beat = 0.5 + 0.5 * Math.sin(local * 0.011 + i * 0.4) ** 8; // a kick on every bar
        const level = clamp01(
          0.18 + 0.45 * Math.abs(Math.sin(local * 0.0031 * (1 + i * 0.37) + i)) * beat + 0.3 * beat * (i % 2),
        );
        o.peaks[i] = Math.max(level, o.peaks[i] - 0.006);
        for (let v = 0; v < level; v += 0.035) {
          ctx.globalAlpha = 0.85 * a;
          ctx.fillStyle = v > 0.8 ? '#ff4d4d' : v > 0.6 ? '#ffd23f' : '#34e39b';
          ctx.fillRect(left + i * bw + 1, stage.ground - B.h * (v + 0.03), bw - 2, B.h * 0.026);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(left + i * bw + 1, stage.ground - B.h * (o.peaks[i] + 0.04), bw - 2, 1.5);
      }
    },
    /** Rings of light spreading from the helipad, like sonar. */
    sonar(ctx, local, a, B) {
      const P = B.pad;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = Math.max(2, B.w * 0.08);
      for (let k = 0; k < 4; k++) {
        const u = (((local / 1800 + k / 4) % 1) + 1) % 1;
        ctx.strokeStyle = `rgba(110, 255, 220, ${0.75 * a * (1 - u)})`;
        ctx.beginPath();
        ctx.arc(P.x, P.y, u * B.h * 0.9, 0, TAU);
        ctx.stroke();
      }
    },
    /** Fills from the base like a progress bar (o.progress(): 0..1), a bright edge on top. */
    progress(ctx, local, a, B, stage, o) {
      const p = o.progress ? o.progress() : (local % 4000) / 4000;
      const y = stage.ground - B.h * p;
      const g = ctx.createLinearGradient(0, stage.ground, 0, B.top);
      g.addColorStop(0, `rgba(255, 196, 60, ${0.85 * a})`);
      g.addColorStop(1, `rgba(255, 70, 60, ${0.85 * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(B.x - B.w, y, B.w * 2, stage.ground - y);
      ctx.fillStyle = `rgba(255, 250, 230, ${a})`;
      ctx.fillRect(B.x - B.w, y - 2, B.w * 2, 3);
      // The rest of the tower waits, dim.
      ctx.fillStyle = `rgba(30, 40, 80, ${0.45 * a})`;
      ctx.fillRect(B.x - B.w, B.top - 2, B.w * 2, y - B.top);
    },
    /** The flag: red, the gold star on the bulge of the bud, breathing. */
    flag(ctx, local, a, B, stage) {
      ledRows(ctx, B, stage, () => ['#e3201b', 0.95], local, a);
      const cy = stage.ground - B.h * 0.5;
      const r = B.w * 0.42;
      ctx.globalAlpha = a * (0.85 + 0.15 * Math.sin(local * 0.003));
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.382 : r;
        const ang = (i / 10) * TAU - Math.PI / 2;
        ctx.lineTo(B.x + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    /** The year's name across the tower. */
    year(ctx, local, a, B, stage, o) {
      ledRows(ctx, B, stage, fx.ledPrograms.tet, local, a * 0.5);
      fx.towerText(ctx, stage, (o.year || '').split(' '), 0.45, '#fff6dc', a, B, 0.95);
    },
  };

  /** LED strips across the tower, one row every 3 px (dark gaps between floors). */
  function ledRows(ctx, B, stage, fn, local, a) {
    for (let y = B.top; y < stage.ground; y += 3) {
      const [color, level] = fn((stage.ground - y) / B.h, local, stage.colors);
      ctx.globalAlpha = 0.8 * a * Math.min(1, level);
      ctx.fillStyle = color;
      ctx.fillRect(B.x - B.w, y, B.w * 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Bitexco lights its façade: a run of programs (BITEXCO or Landmark 81's row programs,
   * or 'off'), a short blackout between two, and the ring of lights round the helipad
   * chasing all the while.
   * @param {object} stage
   * @param {string[]} programs
   * @param {{segment?: number, duration?: number, year?: string, progress?: () => number}} [o]
   */
  function bitexcoShow(stage, programs, o = {}) {
    const B = stage.bitexco;
    const SEGMENT = o.segment || 10000;
    const DURATION = o.duration || programs.length * SEGMENT;
    const glow = fx.glowSprite([255, 200, 150], 48);
    const scale = stage.H / 1080;
    let t = 0;
    return {
      mirror: true,
      bloom: 0.4,
      update(_k, elapsed) {
        t = elapsed;
        return t < DURATION;
      },
      front(ctx) {
        const seg = Math.min(programs.length - 1, Math.floor(t / SEGMENT));
        const local = t - seg * SEGMENT;
        const name = programs[seg];
        const cutIn = seg > 0 ? clamp01(local / 300) : 1;
        const cutOut = seg < programs.length - 1 ? clamp01((SEGMENT - local) / 300) : 1;
        const a = envelope(t, DURATION, 2000, 2000) * cutIn * cutOut;
        if (a <= 0 || name === 'off') return;
        ctx.save();
        stage.traceBitexco(ctx);
        ctx.clip();
        if (BITEXCO[name]) BITEXCO[name](ctx, local, a, B, stage, o);
        else if (fx.ledPrograms[name]) ledRows(ctx, B, stage, fx.ledPrograms[name], local, a);
        ctx.restore();
        // The ring of lights round the helipad, chasing.
        const P = B.pad;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * TAU;
          const on = 0.3 + 0.7 * Math.max(0, Math.cos(ang - t * 0.004)) ** 4;
          ctx.globalAlpha = a * on;
          ctx.fillStyle = '#b8ffe6';
          ctx.fillRect(
            P.x + Math.cos(ang) * P.r * 0.96 - 1,
            P.y + Math.sin(ang) * P.r * 0.16 - 1,
            2 * scale,
            2 * scale,
          );
        }
        // The crown throws its light on the haze.
        ctx.globalAlpha = 0.14 * a;
        const r = B.w * 2.4;
        ctx.drawImage(glow, B.x - r, B.top + B.h * 0.12 - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      },
    };
  }

  fx.bitexcoShow = bitexcoShow;

  fx.register({
    name: 'bitexco',
    label: 'Bitexco trình diễn ánh sáng',
    place: 'Bitexco Financial Tower · Quận 1',
    group: 'towers',
    spectacle: true,
    weight: 1.1,
    when: (look) => look.dark > 0.55,
    create: (stage) =>
      bitexcoShow(
        stage,
        ['lotus', ...fx.shuffle(['helix', 'equalizer', 'sonar', 'wave', 'rainbow']).slice(0, 3)],
        {
          segment: 9000,
        },
      ),
  });

  /* ---------- Landmark 81 and Bitexco, playing together ---------- */

  /**
   * A light that leaves one crown and arcs across the sky to the other, a tail behind it;
   * on arrival the tower it reaches flashes and takes over.
   */
  function lightPass(stage, from, to, at, ms = 1000) {
    const { H } = stage;
    const scale = H / 1080;
    const head = fx.glowSprite([255, 245, 220], 32);
    const a = { x: from.x, y: from.top + from.h * 0.03 };
    const b = { x: to.x, y: to.top + to.h * 0.03 };
    const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - H * 0.16 };
    const point = (u) => ({
      x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
      y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
    });
    let flashed = false;
    return {
      draw(ctx, t) {
        const u = (t - at) / ms;
        if (u < 0 || u > 1.7) return;
        ctx.globalCompositeOperation = 'lighter';
        if (u <= 1) {
          const e = fx.easeInOut(u);
          for (let k = 14; k >= 0; k--) {
            const p = point(Math.max(0, e - k * 0.018));
            const s = (7 - k * 0.4) * scale;
            ctx.globalAlpha = (1 - k / 15) * 0.9;
            ctx.drawImage(head, p.x - s, p.y - s, s * 2, s * 2);
          }
        } else {
          if (!flashed) {
            flashed = true;
            if (stage.flash) stage.flash(b.x, b.y, 0.5, [255, 236, 200], 0.25, 260);
          }
          // A ring bursting out of the crown it reached.
          const v = (u - 1) / 0.7;
          ctx.globalAlpha = (1 - v) * 0.8;
          ctx.strokeStyle = '#fff3d6';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(b.x, b.y, (8 + v * 60) * scale, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  fx.register({
    name: 'towers_duet',
    label: 'Landmark 81 & Bitexco song tấu ánh sáng',
    place: 'Bình Thạnh · Quận 1',
    group: 'towers',
    spectacle: true,
    rarity: 'uncommon',
    when: (look) => look.dark > 0.6,
    create(stage) {
      const SEG = 6500;
      // Call and response, then both together.
      const landmark = ['rainbow', 'off', 'scan', 'off', 'wave', 'sparkle'];
      const bitexco = ['off', 'lotus', 'off', 'helix', 'equalizer', 'sparkle'];
      const L = stage.landmark;
      const B = stage.bitexco;
      const passes = [
        lightPass(stage, L, B, SEG - 1000),
        lightPass(stage, B, L, 2 * SEG - 1000),
        lightPass(stage, L, B, 3 * SEG - 1000),
        lightPass(stage, B, L, 4 * SEG - 1000),
      ];
      let t = 0;
      const arcs = {
        update(_k, elapsed) {
          t = elapsed;
          return t < SEG * landmark.length;
        },
        front(ctx) {
          passes.forEach((p) => p.draw(ctx, t));
        },
      };
      return fx.combine(
        fx.landmarkShow(stage, landmark, { segment: SEG }),
        bitexcoShow(stage, bitexco, { segment: SEG }),
        arcs,
      );
    },
  });

  /* ---------- A helicopter landing on Bitexco's helipad ---------- */

  /**
   * Draws a helicopter seen from the side, nose towards `dir`, at (x, y) (the skids).
   * @param {number} u Size unit (px).
   * @param {number} rotor Rotor phase (radians); `spin` 0..1: how fast it turns.
   */
  function drawHeli(ctx, x, y, u, dir, pitch, rotor, spin, night) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pitch * Math.sign(dir || 1));
    // dir in -1..1: mid-turn the body is seen nearly end-on, never quite flat.
    ctx.scale(Math.sign(dir || 1) * Math.max(0.14, Math.abs(dir)) * u, u);
    const body = night ? 'rgba(46, 48, 64, 0.97)' : 'rgba(44, 50, 64, 0.95)';
    ctx.fillStyle = body;
    ctx.strokeStyle = body;
    ctx.lineCap = 'round';
    // Skids.
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(8, 0);
    ctx.quadraticCurveTo(10, 0, 10.5, -1);
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(-3, -2.5);
    ctx.moveTo(4, 0);
    ctx.lineTo(3.5, -2.5);
    ctx.stroke();
    // Cabin, tail boom, fin.
    ctx.beginPath();
    ctx.ellipse(1, -6, 8.5, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5, -6.5);
    ctx.lineTo(-20, -7.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-19, -7.5);
    ctx.lineTo(-22, -12);
    ctx.lineTo(-20.5, -7);
    ctx.fill();
    // Windscreen catching the light.
    ctx.fillStyle = night ? 'rgba(255, 220, 160, 0.55)' : 'rgba(170, 200, 230, 0.7)';
    ctx.beginPath();
    ctx.ellipse(6, -7, 3, 2.2, 0.3, 0, TAU);
    ctx.fill();
    // Mast and main rotor, seen edge on: a blur disc when fast, blades sweeping when slow.
    ctx.fillStyle = body;
    ctx.fillRect(0.2, -11.6, 1.2, 1.8);
    if (spin > 0.35) {
      ctx.globalAlpha = 0.25 + 0.2 * spin;
      ctx.beginPath();
      ctx.ellipse(0.8, -11.8, 17, 0.9, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1 - spin * 0.55;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let k = 0; k < 2; k++) {
      const c = Math.cos(rotor + k * Math.PI) * 17;
      ctx.moveTo(0.8, -11.8);
      ctx.lineTo(0.8 + c, -11.8);
    }
    ctx.stroke();
    // Tail rotor: a small blurred disc.
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(-21, -10, 2.8, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  fx.register({
    name: 'helipad',
    label: 'Trực thăng đáp sân đỗ Bitexco',
    place: 'Tầng 52 · Bitexco',
    group: 'towers',
    rarity: 'uncommon',
    zones: ['pad'],
    dry: true, // no landing in a storm
    // It flies on the way it was going, or turns round on the pad and goes back where it came from.
    variants: [{ id: 'onward' }, { id: 'return' }],
    when: () => true,
    create(stage, extra = {}) {
      const { W, H } = stage;
      const scale = H / 1080;
      const P = stage.bitexco.pad;
      const back = !!extra.variant && extra.variant.id === 'return';
      const night = stage.look.dark > 0.5;
      const u = Math.max(1.3 * scale, P.r / 14);
      const side = Math.random() < 0.5 ? 1 : -1; // comes in from the right (1) or the left
      // Timeline (ms): approach, hover, settle, parked, lift, leave.
      const T = {
        approach: rand(13000, 17000),
        hover: rand(2500, 4500),
        settle: 3200,
        parked: rand(6000, 12000),
        lift: back ? 4200 : 3000, // turning round on the spot takes a little longer
        leave: rand(12000, 15000),
      };
      const at = {};
      let acc = 0;
      Object.keys(T).forEach((k) => {
        at[k] = acc;
        acc += T[k];
      });
      const DURATION = acc;
      const deck = P.y - 0.6 * u; // skids on the deck
      const hoverY = P.y - 26 * u;
      const start = { x: P.x + side * W * 0.62, y: H * 0.1 };
      const ctrlIn = { x: P.x + side * W * 0.22, y: hoverY - H * 0.04 };
      // Heading while leaving: on (-side, the way it came in) or back (+side).
      const out = back ? side : -side;
      const end = { x: P.x + out * W * 0.7, y: rand(0.04, 0.12) * H };
      const ctrlOut = { x: P.x + out * W * 0.18, y: hoverY - H * 0.1 };
      const quad = (a, c, b, s) => ({
        x: (1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * c.x + s * s * b.x,
        y: (1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * c.y + s * s * b.y,
      });
      const red = fx.glowSprite([255, 60, 60], 16);
      const white = fx.glowSprite([255, 255, 255], 16);
      const padGlow = fx.glowSprite([255, 236, 190], 48);
      let rotor = 0;
      let state = { x: start.x, y: start.y, pitch: 0, spin: 1, dir: -side, light: 0 };
      let t = 0;

      const where = (time) => {
        if (time < at.hover) {
          const s = fx.easeInOut(time / T.approach);
          const p = quad(start, ctrlIn, { x: P.x, y: hoverY }, s);
          // Nose down while cruising, flaring nose up as it slows into the hover.
          const pitch = 0.16 * Math.sin(Math.PI * s) - 0.12 * smooth((s - 0.75) / 0.25) * (1 - s) * 4;
          return { ...p, pitch, spin: 1, dir: -side, light: smooth((s - 0.55) / 0.3) };
        }
        if (time < at.settle) {
          const bob = Math.sin((time - at.hover) * 0.004) * 1.5 * scale;
          return { x: P.x, y: hoverY + bob, pitch: 0, spin: 1, dir: -side, light: 1 };
        }
        if (time < at.parked) {
          const s = fx.easeInOut((time - at.settle) / T.settle);
          return { x: P.x, y: hoverY + (deck - hoverY) * s, pitch: 0, spin: 1, dir: -side, light: 1 };
        }
        if (time < at.lift) {
          // Engines idle down, then spool up again before taking off.
          const s = (time - at.parked) / T.parked;
          const spin = s < 0.5 ? 1 - 0.75 * smooth(s / 0.35) : 0.25 + 0.75 * smooth((s - 0.6) / 0.35);
          return {
            x: P.x,
            y: deck,
            pitch: 0,
            spin,
            dir: -side,
            light: 1 - smooth(s / 0.2) + smooth((s - 0.8) / 0.2),
          };
        }
        if (time < at.leave) {
          const s = fx.easeInOut((time - at.lift) / T.lift);
          // Lifts off; turning back, it pivots on the spot (seen side-on: narrows, then faces the other way).
          const dir = back ? -side * Math.cos(Math.PI * smooth((s - 0.25) / 0.6)) : -side;
          return { x: P.x, y: deck + (hoverY - deck) * s, pitch: -0.05 * s, spin: 1, dir, light: 1 };
        }
        const s = fx.easeInOut((time - at.leave) / T.leave);
        const p = quad({ x: P.x, y: hoverY }, ctrlOut, end, s);
        return {
          ...p,
          pitch: 0.2 * Math.sin(Math.PI * Math.min(1, s * 1.4)),
          spin: 1,
          dir: out, // nose first, the way it flies
          light: 1 - s,
        };
      };

      return {
        update(k, elapsed) {
          t = elapsed;
          state = where(t);
          rotor += (0.12 + 0.55 * state.spin) * k;
          return t < DURATION;
        },
        front(ctx) {
          const a = envelope(t, DURATION, 1500, 1500);
          const s = state;
          // The pad lights up for the landing (at night, floodlit).
          const padOn = clamp01(Math.min((t - at.hover + 6000) / 2000, (at.leave + 3000 - t) / 2000));
          if (padOn > 0) {
            ctx.globalCompositeOperation = 'lighter';
            if (night) {
              ctx.globalAlpha = 0.5 * padOn * a;
              const r = P.r * 1.6;
              ctx.drawImage(padGlow, P.x - r, P.y - r * 0.6, r * 2, r * 1.2);
            }
            for (let i = 0; i < 12; i++) {
              const ang = (i / 12) * TAU;
              const chase = 0.25 + 0.75 * (Math.floor(t / 150) % 12 === i ? 1 : 0.35);
              ctx.globalAlpha = a * padOn * chase;
              ctx.fillStyle = i % 2 ? '#7dffb0' : '#fff4d0';
              ctx.fillRect(
                P.x + Math.cos(ang) * P.r * 0.95 - 1,
                P.y + Math.sin(ang) * P.r * 0.16 - 1,
                2 * scale,
                2 * scale,
              );
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          // Landing light: a cone from the belly down to the deck.
          if (night && s.light > 0.02) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const len = Math.max(12 * u, deck - s.y + 18 * u);
            const g = ctx.createLinearGradient(0, s.y, 0, s.y + len);
            g.addColorStop(0, `rgba(255, 246, 225, ${0.32 * s.light * a})`);
            g.addColorStop(1, 'rgba(255, 246, 225, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(s.x - 1, s.y - 3 * u);
            ctx.lineTo(s.x + 1, s.y - 3 * u);
            ctx.lineTo(s.x + 9 * u, s.y + len);
            ctx.lineTo(s.x - 9 * u, s.y + len);
            ctx.fill();
            ctx.restore();
          }
          ctx.globalAlpha = a;
          drawHeli(ctx, s.x, s.y, u, s.dir, s.pitch, rotor, s.spin, night);
          // Anti-collision beacon and strobes.
          ctx.globalCompositeOperation = 'lighter';
          const r = 5 * u;
          ctx.globalAlpha = a;
          if (t % 1000 < 130) ctx.drawImage(red, s.x - r / 2, s.y - 11 * u - r / 2, r, r);
          if (t % 1400 < 60) ctx.drawImage(white, s.x - s.dir * 20 * u - r, s.y - 8 * u - r, r * 2, r * 2);
          ctx.globalAlpha = 1;
        },
      };
    },
  });

  /* ---------- The low sun catching Bitexco's glass ---------- */

  fx.register({
    name: 'bitexco_glint',
    label: 'Kính Bitexco bắt nắng',
    place: 'Bitexco · Quận 1',
    group: 'towers',
    tier: 'detail',
    when: (look) => !!look.sun && look.sun.altitude < 0.4 && look.dark < 0.4,
    create(stage) {
      const B = stage.bitexco;
      const L = stage.landmark;
      const scale = stage.H / 1080;
      const DURATION = 9000;
      const warm = (stage.look.sun ? stage.look.sun.core : [255, 236, 200]).map(Math.round).join(', ');
      const star = fx.glowSprite([255, 240, 210], 64);
      // Sometimes Landmark 81's glass answers a moment later.
      const both = Math.random() < 0.5;
      let t = 0;
      const sweep = (ctx, tower, trace, local) => {
        const u = local / 5200;
        if (u < 0 || u > 1) return;
        const y = tower.top - tower.h * 0.2 + tower.h * 1.4 * fx.easeInOut(u);
        const band = tower.h * 0.12;
        ctx.save();
        trace(ctx);
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, y - band, 0, y + band);
        g.addColorStop(0, `rgba(${warm}, 0)`);
        g.addColorStop(0.5, `rgba(${warm}, ${0.6 * Math.sin(Math.PI * u)})`);
        g.addColorStop(1, `rgba(${warm}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(tower.x - tower.w, y - band, tower.w * 2, band * 2);
        ctx.restore();
        // A star flare where the band crosses the widest part of the façade.
        const f = Math.exp(-(((u - 0.5) / 0.08) ** 2));
        if (f > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = f;
          const r = 26 * scale;
          ctx.drawImage(star, tower.x - r, y - r, r * 2, r * 2);
          ctx.strokeStyle = `rgba(255, 248, 230, ${0.7 * f})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tower.x - r * 2.2 * f, y);
          ctx.lineTo(tower.x + r * 2.2 * f, y);
          ctx.moveTo(tower.x, y - r * 1.3 * f);
          ctx.lineTo(tower.x, y + r * 1.3 * f);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      };
      return {
        mirror: true,
        update(_k, elapsed) {
          t = elapsed;
          return t < DURATION;
        },
        front(ctx) {
          sweep(ctx, B, stage.traceBitexco, t);
          if (both) sweep(ctx, L, stage.traceLandmark, t - 2600);
        },
      };
    },
  });

  /* ---------- The New Year countdown, on both towers ---------- */

  /**
   * The last seconds before midnight: Landmark 81 shows the year, then counts 10…1, each
   * digit landing with a pop and a ring of light; Bitexco fills up like a progress bar,
   * red as it nears; searchlights rise and close in; at zero both towers flash white.
   * @param {object} stage
   * @param {{endsAt: number, year?: string}} o `endsAt`: midnight (epoch ms).
   */
  function countdownShow(stage, o) {
    const L = stage.landmark;
    const B = stage.bitexco;
    const { H } = stage;
    const scale = H / 1080;
    const total = Math.max(3000, o.endsAt - Date.now());
    const startLeft = total;
    const glow = fx.glowSprite([255, 220, 160], 48);
    let lastTick = 11;
    let t = 0;
    const left = () => o.endsAt - Date.now();

    const towers = bitexcoShow(stage, ['progress'], {
      duration: total + 200,
      progress: () => clamp01(1 - left() / Math.min(10000, startLeft)),
    });

    return {
      mirror: true,
      bloom: 0.5,
      update(k, elapsed) {
        t = elapsed;
        towers.update(k, elapsed);
        const s = Math.ceil(left() / 1000);
        if (s !== lastTick && s >= 1 && s <= 10) {
          lastTick = s;
          // Every second throws light on the haze, stronger towards zero; the last three startle the flock.
          if (stage.flash)
            stage.flash(L.x, L.top + L.h * 0.3, 0.25 + (10 - s) * 0.04, [255, 236, 200], 0.3, 300);
          if (s <= 3 && stage.startle) stage.startle(L.x, L.top, H * 0.3);
        }
        if (left() <= 0 && lastTick !== 0) {
          lastTick = 0;
          if (stage.flash) stage.flash(L.x, L.top, 1, [255, 255, 255], 0.7, 600);
          if (stage.startle) stage.startle(L.x, L.top, H);
        }
        return left() > -500;
      },
      front(ctx) {
        const ms = left();
        const a = clamp01(t / 1500);
        // Searchlights from the foot of both towers, closing in on the vertical as zero nears.
        const close = clamp01(1 - ms / 10000);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        [L, B].forEach((tw, i) => {
          [-1, 1].forEach((side) => {
            ctx.save();
            ctx.translate(tw.x + side * tw.w * 0.3, stage.ground);
            ctx.rotate(
              side * (0.55 - 0.5 * fx.easeInOut(close)) + Math.sin(t * 0.0012 + i) * 0.05 * (1 - close),
            );
            const len = H * 1.1;
            const g = ctx.createLinearGradient(0, 0, 0, -len);
            g.addColorStop(0, `rgba(220, 230, 255, ${0.16 * a * (0.4 + 0.6 * close)})`);
            g.addColorStop(1, 'rgba(220, 230, 255, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(-2, 0);
            ctx.lineTo(2, 0);
            ctx.lineTo(H * 0.04, -len);
            ctx.lineTo(-H * 0.04, -len);
            ctx.fill();
            ctx.restore();
          });
        });
        ctx.restore();

        towers.front(ctx);

        // Landmark 81: navy LEDs shimmering, then the digits.
        ctx.save();
        stage.traceLandmark(ctx);
        ctx.clip();
        const zero = ms <= 350;
        for (let y = L.top; y < stage.ground; y += 3) {
          const v = (stage.ground - y) / L.h;
          ctx.globalAlpha = a * (zero ? 0.95 : 0.3 + 0.12 * Math.sin(v * 30 - t * 0.01));
          ctx.fillStyle = zero ? '#ffffff' : '#14213d';
          ctx.fillRect(L.x - L.w / 2, y, L.w, 2);
        }
        const s = Math.ceil(ms / 1000);
        if (!zero && s <= 10 && s >= 1) {
          const frac = 1 - (ms % 1000) / 1000; // 0 as the second begins .. 1 at its end
          const pop = fx.backOut(frac / 0.22, 2.4); // lands big, settles
          const size = 1.6 - 0.6 * pop;
          const cy = stage.ground - L.h * 0.62;
          ctx.translate(L.x, cy);
          ctx.scale(size, size);
          ctx.translate(-L.x, -cy);
          fx.towerText(
            ctx,
            stage,
            [String(s)],
            0.62,
            s <= 3 ? '#ffd23f' : '#fff6dc',
            a * (1 - frac ** 3 * 0.6),
          );
        } else if (!zero) {
          fx.towerText(ctx, stage, (o.year || '').split(' '), 0.62, '#ffd23f', a * 0.9);
        }
        ctx.restore();

        // A ring of light leaving the crown on every tick.
        if (s <= 10 && s >= 1 && !zero) {
          const frac = 1 - (ms % 1000) / 1000;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (1 - frac) * 0.7 * a;
          ctx.strokeStyle = s <= 3 ? '#ffd23f' : '#cfe0ff';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(L.x, stage.ground - L.h * 0.62, (L.w * 0.6 + frac * H * 0.12) * 1, 0, TAU);
          ctx.stroke();
        }
        // The crown glows brighter as zero nears.
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * (0.1 + 0.3 * close + (zero ? 0.6 : 0));
        const r = L.w * 3;
        ctx.drawImage(glow, L.x - r, L.top + L.h * 0.1 - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      },
    };
  }

  fx.countdownShow = countdownShow;
})((window.Portfolio = window.Portfolio || {}));
