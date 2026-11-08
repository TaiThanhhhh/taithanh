/**
 * @file Ambient surprises: things keep happening over the city.
 *
 * Two tiers run side by side:
 * - major events (`eventGapMinutes`): fireworks, a comet, a storm, kites...
 *   One at a time, announced by a caption under the clock.
 * - details (`detailGapSeconds`): small things passing by between them: a
 *   shooting star, a plane on approach, bats at dusk, a paper plane...
 *
 * The director picks what fits the hour (each event says when it fits from the
 * current look: `look.dark`, `look.sun`, `look.moon`...), weighs it by rarity
 * (common / uncommon / rare) and skips the last few ones, so a long session
 * keeps changing. Events live in the ambient-events-*.js files and register here.
 *
 * An event is `create(stage)` â†’ { update(k, t) â†’ still running?, back(ctx)?,
 * front(ctx)?, trails?, end()? }: `back` draws behind the skyline (things rise
 * from behind the city), `front` in front of it (rain, fog, the LED show on
 * Landmark 81). `trails` (0..1) fades the previous frame instead of clearing it.
 *
 * Cost: the two canvases only get a backing store while an event draws on
 * them; in between they are 0x0 and nothing is drawn.
 */
(function (Portfolio) {
  'use strict';

  const TAU = Math.PI * 2;
  /** An event does not come back before this many others (when the hour allows). */
  const RECENT = 8;
  const RARITY = { common: 1, uncommon: 0.5, rare: 0.18 };
  const TIERS = ['major', 'detail'];
  const MAX_CONCURRENT = 3;

  function domainOf(name) {
    if (
      /plane|widebody|takeoff|flight|cessna|helicopter|drone|balloon|kite|bird|swallow|eagle|bat/.test(name)
    ) {
      return 'airspace';
    }
    if (/firework|laser|searchlight|landmark|bitexco|grandshow/.test(name)) {
      return 'spectacle';
    }
    if (
      /water_taxi|boat|lantern|lion_dance|street|acoustic|market|seed|blossom|leaves|flower|bubble|chimes/.test(
        name,
      )
    ) {
      return 'ground_water';
    }
    return 'atmosphere';
  }

  const registry = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smooth = (x) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
  };
  const tierOf = (def) => def.tier || 'major';

  /** Helpers shared by the event files. */
  const fx = {
    TAU,
    rand,
    clamp01,
    smooth,
    pick: (list) => list[Math.floor(Math.random() * list.length)],
    shuffle: (list) =>
      list
        .map((v) => [Math.random(), v])
        .sort((a, b) => a[0] - b[0])
        .map((p) => p[1]),
    mix: (a, b, u) => a.map((v, i) => v + (b[i] - v) * u),
    /** '#rrggbb' â†’ [r, g, b]. */
    hex: (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)),
    /** 0 â†’ 1 â†’ 0: fades in over `inMs` from the start and out over `outMs` before `total`. */
    envelope: (t, total, inMs, outMs) => clamp01(Math.min(t / inMs, (total - t) / outMs)),
    /** Keeps the items for which `alive` is true, in place (no garbage, unlike filter/splice). */
    compact(list, alive) {
      let j = 0;
      for (let i = 0; i < list.length; i++) if (alive(list[i])) list[j++] = list[i];
      list.length = j;
    },

    /** An off-screen canvas, painted once by `paint(ctx, w, h)`. */
    sprite(w, h, paint) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w));
      c.height = Math.max(1, Math.ceil(h));
      paint(c.getContext('2d'), c.width, c.height);
      return c;
    },

    /** Soft round glow, painted once and stamped with drawImage (much cheaper than shadowBlur). */
    glowSprite(rgb, size = 32) {
      return fx.sprite(size, size, (ctx) => {
        const m = size / 2;
        const g = ctx.createRadialGradient(m, m, 0, m, m, m);
        g.addColorStop(0, `rgba(${rgb}, 1)`);
        g.addColorStop(0.25, `rgba(${rgb}, 0.45)`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      });
    },

    /**
     * Things released from the city that rise and drift with the wind (lanterns, balloons).
     * @param {object} stage
     * @param {object} o
     * @param {number} o.count
     * @param {number} o.releaseMs Released one after another over this long.
     * @param {number} o.duration
     * @param {number} o.spread Horizontal spread of the release point (share of the width).
     * @param {number[]} o.size Width range in px (at 1080p).
     * @param {number[]} o.rise Rising speed range (px per 60fps frame at 1080p).
     * @param {(i: number) => HTMLCanvasElement} o.sprite
     * @param {number} [o.flicker] Brightness flicker (0..1), for flames.
     */
    risers(stage, o) {
      const { W, H } = stage;
      const scale = H / 1080;
      const wind = rand(-0.3, 0.3);
      const centre = rand(0.2, 0.8) * W;
      const top = H * 0.06;
      const items = Array.from({ length: o.count }, (_, i) => {
        const depth = rand(0.55, 1.2);
        const sprite = o.sprite(i);
        const w = rand(o.size[0], o.size[1]) * depth * scale;
        return {
          at: (i / o.count) * o.releaseMs + rand(0, 400),
          x: centre + rand(-o.spread, o.spread) * W,
          y: stage.rooftop,
          depth,
          sprite,
          w,
          h: (w * sprite.height) / sprite.width,
          rise: rand(o.rise[0], o.rise[1]) * depth * scale,
          phase: rand(0, TAU),
        };
      });
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          items.forEach((it) => {
            if (t < it.at) return;
            it.y -= it.rise * k;
            it.x += (wind + Math.sin(t * 0.0008 + it.phase) * 0.18) * it.depth * scale * k;
          });
          return t < o.duration;
        },
        back(ctx) {
          const fade = fx.envelope(t, o.duration, 1, 5000);
          items.forEach((it) => {
            if (t < it.at) return;
            const high = smooth((top * 3 - it.y) / (top * 2)); // gone before the top of the screen
            let a = fade * (1 - high) * (0.55 + 0.4 * (it.depth / 1.2));
            if (o.flicker) a *= 1 - o.flicker * (0.5 + 0.5 * Math.sin(t * 0.017 + it.phase * 7));
            if (a <= 0.01) return;
            ctx.globalAlpha = a;
            ctx.drawImage(it.sprite, it.x - it.w / 2, it.y - it.h / 2, it.w, it.h);
          });
        },
      };
    },

    /**
     * Light things drifting down in front of the city on a gust of wind (seeds, petals).
     * @param {object} stage
     * @param {object} o
     * @param {number} o.count
     * @param {number} o.releaseMs
     * @param {number} o.duration
     * @param {number[]} o.size Height range in px (at 1080p).
     * @param {number[]} o.fall Falling speed range (px per 60fps frame at 1080p).
     * @param {number[]} o.spin Spin speed range (radians per frame).
     * @param {'twirl'|'tumble'} o.mode twirl: spins around its vertical axis (a winged seed);
     *   tumble: rolls and flips (a petal).
     * @param {(i: number) => HTMLCanvasElement} o.sprite
     */
    fallers(stage, o) {
      const { W, H } = stage;
      const scale = H / 1080;
      const wind = rand(0.5, 1.2) * (Math.random() < 0.5 ? 1 : -1);
      const items = Array.from({ length: o.count }, (_, i) => {
        const depth = rand(0.5, 1.4); // near ones are bigger and faster
        const sprite = o.sprite(i);
        const h = rand(o.size[0], o.size[1]) * depth * scale;
        return {
          at: rand(0, o.releaseMs),
          x: (wind > 0 ? rand(-0.35, 0.75) : rand(0.25, 1.35)) * W,
          y: -rand(0.02, 0.3) * H,
          depth,
          sprite,
          h,
          w: (h * sprite.width) / sprite.height,
          fall: rand(o.fall[0], o.fall[1]) * depth * scale,
          spin: rand(o.spin[0], o.spin[1]) * (Math.random() < 0.5 ? 1 : -1),
          angle: rand(0, TAU),
          phase: rand(0, TAU),
        };
      });
      let t = 0;
      return {
        update(k, elapsed) {
          t = elapsed;
          items.forEach((it) => {
            if (t < it.at) return;
            const gust = 0.7 + 0.5 * Math.sin(t * 0.0007 + it.phase * 0.3);
            it.x += (wind * gust + Math.sin(t * 0.002 + it.phase) * 0.5) * it.depth * scale * k;
            it.y += it.fall * k;
            it.angle += it.spin * k;
          });
          return t < o.duration;
        },
        front(ctx) {
          const fade = fx.envelope(t, o.duration, 1, 4000);
          items.forEach((it) => {
            if (t < it.at || it.y > H + it.h) return;
            ctx.save();
            ctx.globalAlpha = fade * (0.6 + 0.3 * (it.depth / 1.4));
            ctx.translate(it.x, it.y);
            if (o.mode === 'twirl') {
              ctx.rotate(Math.sin(it.phase + t * 0.0015) * 0.35);
              ctx.scale(Math.cos(it.angle), 1); // wings spinning around the seed
            } else {
              ctx.rotate(it.angle * 0.6);
              ctx.scale(1, Math.cos(it.angle * 1.3)); // a petal flipping over
            }
            ctx.drawImage(it.sprite, -it.w / 2, -it.h / 2, it.w, it.h);
            ctx.restore();
          });
        },
      };
    },

    /**
     * Rain streaks, drawn in one path.
     * @param {object} stage
     * @param {{count?: number, wind?: number, length?: number}} [o]
     */
    rain(stage, o = {}) {
      const { W, H } = stage;
      const scale = H / 1080;
      const wind = o.wind ?? rand(0.12, 0.28) * (Math.random() < 0.5 ? 1 : -1);
      const drops = Array.from({ length: o.count || 320 }, () => ({
        x: rand(-0.1, 1.1) * W,
        y: rand(0, H),
        len: rand(12, 22) * scale * (o.length || 1),
        speed: rand(18, 26) * scale,
      }));
      return {
        update(k) {
          drops.forEach((d) => {
            d.y += d.speed * k;
            d.x += d.speed * wind * k;
            if (d.y > H) {
              d.y = rand(-60, -10);
              d.x = rand(-0.1, 1.1) * W;
            }
          });
        },
        /** @param {number} amount 0..1, how hard it rains. */
        draw(ctx, amount, color = '220, 228, 240', alpha = 0.35) {
          if (amount <= 0) return;
          ctx.strokeStyle = `rgba(${color}, ${alpha * amount})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const count = Math.floor(drops.length * amount);
          for (let i = 0; i < count; i++) {
            const d = drops[i];
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - d.len * wind, d.y - d.len);
          }
          ctx.stroke();
        },
      };
    },

    /** A jagged lightning bolt from the clouds down to the rooftops, with a branch or two. */
    bolt(x, top, bottom, scale) {
      const main = [[x, top]];
      let px = x;
      for (let y = top; y < bottom; ) {
        y += rand(10, 24) * scale;
        px += rand(-14, 14) * scale;
        main.push([px, Math.min(y, bottom)]);
      }
      const paths = [main];
      const branches = Math.floor(rand(1, 3.5));
      for (let b = 0; b < branches; b++) {
        const start = main[Math.floor(rand(1, main.length * 0.6))];
        const side = Math.random() < 0.5 ? -1 : 1;
        const branch = [start];
        let [bx, by] = start;
        for (let i = 0, n = Math.floor(rand(4, 9)); i < n; i++) {
          bx += side * rand(6, 16) * scale;
          by += rand(6, 16) * scale;
          branch.push([bx, by]);
        }
        paths.push(branch);
      }
      return paths;
    },

    drawBolt(ctx, paths, intensity, scale) {
      ctx.lineJoin = 'round';
      [
        [5 * scale, `rgba(180, 170, 255, ${0.35 * intensity})`],
        [1.6 * scale, `rgba(255, 255, 255, ${0.95 * intensity})`],
      ].forEach(([width, color]) => {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        paths.forEach((path) => {
          ctx.beginPath();
          path.forEach(([x, y]) => ctx.lineTo(x, y));
          ctx.stroke();
        });
      });
    },

    /** Geometrically drafted 5-pointed star */
    drawStar(ctx, cx, cy, spikes, outerR, innerR) {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerR;
        y = cy + Math.sin(rot) * outerR;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerR;
        y = cy + Math.sin(rot) * innerR;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerR);
      ctx.closePath();
    },

    /** High-fidelity vector airliner (Airbus A350 / modern jet) */
    drawAirplane(ctx, x, y, scale = 1, angle = 0, isNight = false, t = 0, _options = {}) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      // 1. Swept Wings with sharklets/winglets
      ctx.fillStyle = isNight ? '#334155' : '#64748b';
      // Left / Port wing
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(-6, -26);
      ctx.lineTo(-9, -27); // upward curved winglet
      ctx.lineTo(-4, -28);
      ctx.lineTo(-2, -26);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();

      // Right / Starboard wing
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(-6, 26);
      ctx.lineTo(-9, 27); // upward curved winglet
      ctx.lineTo(-4, 28);
      ctx.lineTo(-2, 26);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();

      // 2. Dual turbofan engine pods under wings
      ctx.fillStyle = isNight ? '#1e293b' : '#475569';
      ctx.fillRect(-4, -13, 10, 3.2); // port engine
      ctx.fillRect(-4, 9.8, 10, 3.2); // starboard engine

      // Engine intake cowlings (hot metallic rim)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(5, -13, 1.2, 3.2);
      ctx.fillRect(5, 9.8, 1.2, 3.2);

      // 3. Horizontal stabilizers & Tail Fin
      ctx.fillStyle = isNight ? '#334155' : '#64748b';
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-26, -11);
      ctx.lineTo(-28, -10.5);
      ctx.lineTo(-23, 0);
      ctx.lineTo(-28, 10.5);
      ctx.lineTo(-26, 11);
      ctx.closePath();
      ctx.fill();

      // Vertical tail fin (with deep blue Vietnamese airline trim)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-26, 0);
      ctx.lineTo(-29, -1.5);
      ctx.lineTo(-20, -1.5);
      ctx.closePath();
      ctx.fill();

      // 4. Streamlined composite fuselage
      const fuselageGrad = ctx.createLinearGradient(0, -3.5, 0, 3.5);
      if (isNight) {
        fuselageGrad.addColorStop(0, '#475569');
        fuselageGrad.addColorStop(0.5, '#64748b');
        fuselageGrad.addColorStop(1, '#1e293b');
      } else {
        fuselageGrad.addColorStop(0, '#f8fafc');
        fuselageGrad.addColorStop(0.5, '#e2e8f0');
        fuselageGrad.addColorStop(1, '#94a3b8');
      }
      ctx.fillStyle = fuselageGrad;
      ctx.beginPath();
      ctx.moveTo(22, 0); // nose radome
      ctx.quadraticCurveTo(16, -3.5, 2, -3.5);
      ctx.lineTo(-20, -3.2);
      ctx.quadraticCurveTo(-26, -1.5, -28, 0);
      ctx.quadraticCurveTo(-26, 1.5, -20, 3.2);
      ctx.lineTo(2, 3.5);
      ctx.quadraticCurveTo(16, 3.5, 22, 0);
      ctx.closePath();
      ctx.fill();

      // Cockpit windshield glass gradient
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(18, -1.8);
      ctx.lineTo(15, -2.4);
      ctx.lineTo(15, 2.4);
      ctx.lineTo(18, 1.8);
      ctx.closePath();
      ctx.fill();

      // Cabin passenger windows (illuminated dots at night)
      if (isNight) {
        ctx.fillStyle = '#fef08a';
        for (let w = -15; w <= 10; w += 2.8) {
          ctx.fillRect(w, -1.8, 1.2, 0.8);
          ctx.fillRect(w, 1.0, 1.2, 0.8);
        }
      }

      // 5. Functional Navigation & Strobe Lights
      // Port red light
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-7, -26.5, 1.5, 0, TAU);
      ctx.fill();

      // Starboard green light
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-7, 26.5, 1.5, 0, TAU);
      ctx.fill();

      // High-intensity synchronized white strobe flashes (double flash every 1.2s)
      const strobePhase = t % 1200;
      if (strobePhase < 50 || (strobePhase > 120 && strobePhase < 170)) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-7, -26.5, 3.5, 0, TAU);
        ctx.arc(-7, 26.5, 3.5, 0, TAU);
        ctx.arc(-28, 0, 2.5, 0, TAU);
        ctx.fill();
      }

      // Red rotating beacon on crown and belly (1s cycle)
      if (t % 1000 < 100) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    },

    /** High-fidelity Helicopter with realistic spinning rotors and searchlight */
    drawHelicopter(ctx, x, y, scale = 1, dir = 1, isNight = false, t = 0, options = {}) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir * scale, scale);

      // Searchlight beam
      if (options.searchlight) {
        const beamGrad = ctx.createLinearGradient(0, 5, 0, 320);
        beamGrad.addColorStop(0, 'rgba(235, 248, 255, 0.45)');
        beamGrad.addColorStop(0.6, 'rgba(235, 248, 255, 0.12)');
        beamGrad.addColorStop(1, 'rgba(235, 248, 255, 0)');
        ctx.save();
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(2, 6);
        ctx.lineTo(-2, 6);
        ctx.lineTo(-45, 320);
        ctx.lineTo(45, 320);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Fuselage cabin
      ctx.fillStyle = isNight ? '#1e293b' : '#334155';
      ctx.beginPath();
      ctx.ellipse(2, 0, 14, 8, 0, 0, TAU);
      ctx.fill();

      // Glass bubble canopy
      const glassGrad = ctx.createLinearGradient(6, -6, 14, 4);
      glassGrad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
      glassGrad.addColorStop(1, 'rgba(14, 165, 233, 0.4)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.ellipse(8, -1, 7, 5, 0.2, 0, TAU);
      ctx.fill();

      // Tail boom
      ctx.strokeStyle = isNight ? '#1e293b' : '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, -1);
      ctx.lineTo(-32, -4);
      ctx.lineTo(-34, -12); // vertical stabilizer
      ctx.stroke();

      // Landing skids
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      // Skid bar
      ctx.moveTo(-10, 10);
      ctx.lineTo(14, 10);
      ctx.quadraticCurveTo(18, 10, 19, 7); // curved tip
      // Struts
      ctx.moveTo(-4, 6);
      ctx.lineTo(-4, 10);
      ctx.moveTo(8, 6);
      ctx.lineTo(8, 10);
      ctx.stroke();

      // Spinning Main Rotor disc (semi-transparent with rotational blur)
      const rotorAngle = t * 0.05;
      const bladeSpan = 36;
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(rotorAngle) * bladeSpan, -11 - Math.sin(rotorAngle) * 2);
      ctx.lineTo(Math.cos(rotorAngle) * bladeSpan, -11 + Math.sin(rotorAngle) * 2);
      ctx.stroke();

      // Spinning Tail rotor blur
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-34, -12, 6, 0, TAU);
      ctx.stroke();

      // Anti-collision strobe (red beacon on tail)
      if (t % 1000 < 120) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-34, -15, 2.5, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    },

    /** High-fidelity Saigon Waterbus Catamaran */
    drawWaterbus(ctx, x, y, scale = 1, dir = 1, isNight = false, _t = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir * scale, scale);

      // Twin bow waves and foaming wake
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(-45, 14);
      ctx.moveTo(25, 10);
      ctx.lineTo(35, 12);
      ctx.stroke();

      // Twin hulls (Catamaran)
      ctx.fillStyle = '#f59e0b'; // Saigon Waterbus yellow livery
      ctx.beginPath();
      ctx.moveTo(28, 8);
      ctx.quadraticCurveTo(34, 8, 36, 4);
      ctx.lineTo(-24, 4);
      ctx.lineTo(-26, 8);
      ctx.closePath();
      ctx.fill();

      // Superstructure & Cabin (White)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(24, 4);
      ctx.lineTo(20, -5);
      ctx.lineTo(-20, -5);
      ctx.lineTo(-22, 4);
      ctx.closePath();
      ctx.fill();

      // Tinted Passenger Windows with warm interior lighting
      ctx.fillStyle = isNight ? '#fbbf24' : '#0284c7';
      for (let w = -15; w <= 15; w += 5) {
        ctx.fillRect(w, -3, 3.5, 4.5);
      }

      // AC roof unit & Radar mast
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6, -8, 12, 3);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(8, -12);
      ctx.stroke();

      // Nav light
      ctx.fillStyle = isNight ? '#22c55e' : '#ffffff';
      ctx.beginPath();
      ctx.arc(8, -12, 1.5, 0, TAU);
      ctx.fill();

      ctx.restore();
    },

    /** High-fidelity Ghe Hoa Báº¿n BÃ¬nh ÄÃ´ng (Flower Boat on Saigon canal) */
    drawFlowerBoat(ctx, x, y, scale = 1, dir = 1, isNight = false, t = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir * scale, scale);

      // Wooden Sampan Hull (rich teak wood planks)
      const hullGrad = ctx.createLinearGradient(0, 0, 0, 10);
      hullGrad.addColorStop(0, '#78350f');
      hullGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.moveTo(-32, 2);
      ctx.quadraticCurveTo(0, 12, 32, 2);
      ctx.lineTo(28, 7);
      ctx.quadraticCurveTo(0, 15, -28, 7);
      ctx.closePath();
      ctx.fill();

      // Bamboo arched awning (Mui ghe)
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, 14, Math.PI, 0);
      ctx.stroke();

      // Potted Golden Mai & Crimson Marigold flowers crowding the deck
      const flowerColors = ['#facc15', '#ea580c', '#facc15', '#dc2626', '#fbbf24'];
      for (let i = -22; i <= 22; i += 5.5) {
        const col = flowerColors[Math.abs(Math.round(i)) % flowerColors.length];
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(i, 0 - Math.abs(i) * 0.1, 3.2, 0, TAU);
        ctx.fill();
        // Green leaves
        ctx.fillStyle = '#15803d';
        ctx.fillRect(i - 1, 2, 2, 2);
      }

      // Warm incandescent yellow bulb string hanging along the awning
      if (isNight) {
        ctx.fillStyle = '#fef08a';
        for (let b = -10; b <= 10; b += 5) {
          ctx.beginPath();
          ctx.arc(b, -10 + Math.abs(b) * 0.4, 2, 0, TAU);
          ctx.fill();
        }
      }

      // Water reflection ripples
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-20, 14 + Math.sin(t * 0.003) * 2);
      ctx.lineTo(20, 14 + Math.sin(t * 0.003) * 2);
      ctx.stroke();

      ctx.restore();
    },

    /** Parametric Billowing National Flag (Cá» Äá» Sao VÃ ng) with genuine cloth wave */
    drawWavingFlag(ctx, x, y, w = 36, h = 24, t = 0, speed = 0.005) {
      ctx.save();
      const slices = 18;
      const sliceW = w / slices;
      for (let i = 0; i < slices; i++) {
        const sx = x + i * sliceW;
        const wave = Math.sin(i * 0.45 - t * speed) * 3.5;
        const sy = y + wave;
        const shadow = 0.85 + 0.15 * Math.sin(i * 0.45 - t * speed);

        // Crimson red cloth slice with fold shading
        ctx.fillStyle = `rgb(${Math.round(220 * shadow)}, ${Math.round(38 * shadow)}, ${Math.round(38 * shadow)})`;
        ctx.fillRect(sx, sy, sliceW + 0.5, h);

        // Gold star slice (in the central 40% of the flag)
        const centerDist = Math.abs(i - slices / 2);
        if (centerDist < 3.2) {
          ctx.fillStyle = `rgb(${Math.round(250 * shadow)}, ${Math.round(204 * shadow)}, ${Math.round(21 * shadow)})`;
          const starSliceH = h * 0.38 * (1 - centerDist / 3.5);
          ctx.fillRect(sx, sy + (h - starSliceH) / 2, sliceW + 0.5, starSliceH);
        }
      }
      ctx.restore();
    },

    /** Elaborate Traditional Southern Lion Head (Äáº§u LÃ¢n Nam SÆ°) */
    drawLionDanceHead(ctx, x, y, scale = 1, t = 0) {
      ctx.save();
      ctx.translate(x, y + Math.sin(t * 0.006) * 6);
      ctx.scale(scale, scale);

      // Horn & Red pompon
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -22, 4.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-3, -12);
      ctx.lineTo(0, -19);
      ctx.lineTo(3, -12);
      ctx.closePath();
      ctx.fill();

      // Forehead Mirror Disc
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -10, 4, 0, TAU);
      ctx.fill();

      // Main Face (Crimson & Gold)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 12, 0, 0, TAU);
      ctx.fill();

      // Arched golden brows
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(-7, -4, 6, 3, -0.2, 0, TAU);
      ctx.ellipse(7, -4, 6, 3, 0.2, 0, TAU);
      ctx.fill();

      // Eyes (blinking periodically)
      const blink = Math.sin(t * 0.004) > 0.95;
      ctx.fillStyle = blink ? '#dc2626' : '#ffffff';
      ctx.beginPath();
      ctx.arc(-7, -3, 3.2, 0, TAU);
      ctx.arc(7, -3, 3.2, 0, TAU);
      ctx.fill();
      if (!blink) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-7, -3, 1.8, 0, TAU);
        ctx.arc(7, -3, 1.8, 0, TAU);
        ctx.fill();
      }

      // Snout & Mouth
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(0, 6, 10, 5, 0, 0, TAU);
      ctx.fill();

      // Green & Gold Fur Fringe
      ctx.fillStyle = '#10b981';
      for (let f = -14; f <= 14; f += 4) {
        ctx.fillRect(f, 10, 3, 6);
      }

      ctx.restore();
    },

    /** 3D Faceted Origami Paperplane */
    drawPaperPlane3D(ctx, x, y, scale = 1, angle = 0, color = '#f8fafc') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      // Left wing (light upper facet)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, -9);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();

      // Right wing (light upper facet)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, 9);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();

      // Center keel fold (shaded underside facet)
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();

      // Crease line
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-6, 0);
      ctx.stroke();

      ctx.restore();
    },

    /** Translucent Golden Mai Blossom (Hoa Mai VÃ ng) */
    drawMaiBlossom(ctx, x, y, size = 16, angle = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const rad = size / 2;
      const petals = 5;

      // 5 overlapping delicate golden petals with radial gradient
      for (let i = 0; i < petals; i++) {
        const a = (i * TAU) / petals;
        const px = Math.cos(a) * (rad * 0.45);
        const py = Math.sin(a) * (rad * 0.45);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, rad * 0.7);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.5, '#fbbf24');
        grad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, rad * 0.48, rad * 0.32, a, 0, TAU);
        ctx.fill();
      }

      // Saffron orange center core with stamens
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.2, 0, TAU);
      ctx.fill();

      ctx.restore();
    },

    /**
     * @param {{name: string, label?: string, tier?: 'major'|'detail',
     *   rarity?: 'common'|'uncommon'|'rare', weight?: number,
     *   when: (look: object, stage: object) => boolean,
     *   create: (stage: object) => object}} def
     */
    register(def) {
      registry.push(def);
    },
  };

  class AmbientEvents {
    /**
     * @param {HTMLCanvasElement} back Canvas behind the skyline.
     * @param {HTMLCanvasElement} front Canvas in front of the skyline.
     * @param {object} config `Portfolio.config.ambient`.
     * @param {{event?: string}} [options] `?event=<name>`: that event comes first, on every visit.
     */
    constructor(back, front, config, options = {}) {
      this.layers = {
        back: { canvas: back, ctx: back.getContext('2d') },
        front: { canvas: front, ctx: front.getContext('2d') },
      };
      this.config = config;
      this.requested = registry.find((d) => d.name === options.event) || null;
      this.pending = null;
      this.stage = null;
      this.activeEvents = [];
      this.slots = { major: null, detail: null };
      this.nextAt = { major: Infinity, detail: Infinity };
      this.recent = [];
      this.k = 1;
      /** Called with (def, tier) when an event begins (the scene shows a caption). */
      this.onBegin = null;
      // A new canvas is 300x150: start without a backing store, sized when an event needs it.
      Object.values(this.layers).forEach(({ canvas }) => {
        canvas.width = 0;
        canvas.height = 0;
      });
    }

    static get names() {
      return registry.map((def) => def.name);
    }

    static get allDefs() {
      return registry.map((def) => ({
        name: def.name,
        label: def.label || def.name,
        tier: tierOf(def),
        rarity: def.rarity || 'common',
      }));
    }

    resize(stage) {
      this.stop();
      this.stage = stage;
    }

    reset(now, look) {
      this.stop();
      this.stage.look = look;
      this.pending = this.requested;
      const seconds = (range) => rand(range[0], range[1]) * 1000;
      this.nextAt.major = now + seconds(this.config.firstEventSeconds);
      this.nextAt.detail = now + seconds(this.config.firstDetailSeconds);
      if (this.pending) this.nextAt[tierOf(this.pending)] = now + 1500;
    }

    /** Plays an event now, whatever the hour (for trying them out). */
    trigger(name, now) {
      if (!name) return false;
      const clean = String(name).trim().toLowerCase();
      const aliases = {
        // Sky
        bolide: 'bolide_fireball',
        bolide_fireball: 'bolide_fireball',
        meteor: 'meteors',
        meteors: 'meteors',
        shooting_star: 'shootingstar',
        starlink: 'starlink_train',
        comet_neowise: 'comet_twin',
        anticrepuscular_rays: 'anticrepuscular',
        blood_moon: 'eclipse',
        aurora_subtle: 'aurora_equator',
        airglow: 'milkyway_rise',
        crepuscular_rays: 'sunrays',

        // Flyby
        airplane_takeoff: 'takeoff',
        take_off: 'takeoff',
        widebody_a350: 'widebody',
        a350: 'widebody',
        plane: 'landing',
        airplane: 'landing',
        jet: 'contrail',
        airplane_night_strobe: 'night_flight',
        cessna_low: 'flight_formation_v',
        paperplane_squadron: 'paperplane_trio',
        paperplane_origami_crane: 'paperplane',
        birds_dispersal: 'birds_scatter',
        swallow_dive: 'swallows_dive',
        swallow: 'swallows',
        bat: 'bats',
        bats_emerge_dusk: 'bats_swarm',
        bat_colony_spiral: 'bats_swarm',
        sea_eagle_soar: 'sea_eagle',
        rescue_helicopter: 'helicopter_searchlight',

        // Weather
        lightning_forked: 'lightning_fork',
        heat_lightning: 'lightning',
        lightning_spider: 'lightning_sheet',
        tropical_downpour: 'heavy_rain',
        downpour: 'heavy_rain',
        monsoon_squall: 'gust_wind',
        rainbow_double: 'double_rainbow',
        rainbow_primary: 'rainbow',
        fog_river: 'river_mist',
        smog_haze: 'twilight_haze',
        mirage_heat: 'heat_haze',
        mirage: 'heat_haze',
        cloud_stratocumulus: 'cumulonimbus',
        cloud_cirrus_fall: 'golden_clouds',

        // Day
        balloon: 'balloons',
        balloon_glow: 'balloonglow',
        kite: 'kites',
        kite_led_night: 'kite_led',
        kite_dragon: 'kite_flute',
        bubble: 'bubbles',
        soap_bubble_stream: 'giant_bubble',
        seed: 'seeds',
        dipterocarp_whirlwind: 'seed_whirlwind',
        mai: 'blossoms',
        mai_petal_drift: 'blossoms',
        peach_blossom_drift: 'peach_blossoms',
        lotus_petal_drift: 'vesak',
        saigon_waterbus_wake: 'water_taxi',
        pigeon_flock: 'pigeons_park',
        fireflies_canals: 'fireflies',
        urban_sparrows: 'sparrow_perch',
        valentine: 'heart_balloons',
        party_balloons: 'party',

        // Night / Light
        fireworks_peony: 'fireworks',
        fireworks_chrysanthemum: 'fireworks_comet_tails',
        fireworks_kamuro: 'fireworks_willow',
        fireworks_salute: 'fireworks_whistle',
        fireworks_ghost: 'fireworks_brocade',
        drone: 'drones',
        laser: 'lasers',
        laser_cross: 'laser_cross',
        lasers_cross: 'laser_cross',
        lasers_fan: 'laser_cross',
        drones_flag: 'drones_vietnam',
        drones_globe: 'drones_lotus',
        drones_matrix: 'drones_code',
        searchlight: 'searchlights',
        searchlights_sweep: 'searchlights_skyline',

        // Cultural / Calendar
        tet_saigon: 'tet',
        tet_parade: 'tet_lion_dance',
        midautumn_parade: 'midautumn_mooncake',
        christmas_carol: 'wind_chimes',
        christmas: 'street_lanterns',
        halloween: 'bats_swarm',
        lanternfestival: 'midautumn_lantern_river',
        earthhour: 'landmark_equalizer',
        childrensday: 'giant_bubble',
        teachersday: 'vietnam_teachers_day',
        womansday: 'ao_dai_festival',
        saigonday: 'saigon_street_food',
        thapmuoi_lotus: 'southern_fruit',
        cholon_heritage: 'tet_calligraphy',
        buddha: 'vesak',
        liberation: 'independence_day_april',
        giai_phong: 'independence_day_april',
        hungkings: 'tet_calligraphy',
      };

      const resolved = aliases[clean] || clean;
      let def = registry.find((d) => d.name === resolved);
      if (!def) {
        def = registry.find((d) => d.name === clean || d.name.includes(clean) || clean.includes(d.name));
      }

      if (!this.stage && Portfolio.ambient?.scene?.sky) {
        this.stage = Portfolio.ambient.scene.sky.stage();
      }

      if (!def || !this.stage) return false;

      // Check if it's a multi-stage cascade sequence
      if (
        (resolved.startsWith('cascade_') || resolved === 'storm_cascade') &&
        Portfolio.ambientEnvironment?.cascades?.[resolved]
      ) {
        Portfolio.ambientEnvironment.triggerCascade(resolved);
      }

      this.begin(def, now);
      return true;
    }

    step(now, k, look) {
      this.k = k;
      this.stage.look = look;

      // 1. Update all currently running concurrent events
      for (let i = this.activeEvents.length - 1; i >= 0; i--) {
        const slot = this.activeEvents[i];
        if (!slot.event.update(k, now - slot.startedAt)) {
          this.endSlot(slot);
          this.schedule(slot.tier, now);
        }
      }

      // 2. Harmonious Multi-Event Scheduling ("SÃ i GÃ²n - ThÃ nh Phá»‘ KhÃ´ng Ngá»§")
      TIERS.forEach((tier) => {
        if (now < this.nextAt[tier]) return;

        // If we already have 2 or more active events, delay spawning so the sky doesn't get cluttered
        if (this.activeEvents.length >= MAX_CONCURRENT) {
          this.nextAt[tier] = now + 4000;
          return;
        }

        if (this.pending && tierOf(this.pending) === tier) {
          const def = this.pending;
          this.pending = null;
          this.begin(def, now);
          return;
        }

        // Details keep out of the way of an event that leaves trails (they would smear).
        if (tier === 'detail' && this.activeEvents.some((s) => s.event.trails)) {
          this.nextAt.detail = now + 5000;
          return;
        }

        const def = this.choose(look, tier);
        if (def) {
          this.begin(def, now);
        } else {
          this.nextAt[tier] = now + 20000;
        }
      });
    }

    schedule(tier, now) {
      const [a, b] =
        tier === 'major' ? this.config.eventGapMinutes.map((m) => m * 60) : this.config.detailGapSeconds;
      this.nextAt[tier] = now + rand(a, b) * 1000;
    }

    /** Weighted pick among the events of a tier that fit the hour, skipping recent ones if possible. */
    choose(look, tier) {
      const fits = registry.filter((d) => tierOf(d) === tier && d.when(look, this.stage));
      const fresh = fits.filter((d) => !this.recent.includes(d.name));
      const pool = fresh.length ? fresh : fits;
      const state = Portfolio.ambientCalendar?.getState?.();
      const weight = (d) => {
        let w = (d.weight || 1) * RARITY[d.rarity || 'common'];
        // If today matches a real cultural holiday, give this event a 4x celebratory boost!
        if (state?.activeHoliday?.id && d.name.startsWith(state.activeHoliday.id)) {
          w *= 4.0;
        }
        return w;
      };
      let r = Math.random() * pool.reduce((sum, d) => sum + weight(d), 0);
      return pool.find((d) => (r -= weight(d)) < 0) || pool[pool.length - 1] || null;
    }

    begin(def, now) {
      const tier = tierOf(def);
      const domain = domainOf(def.name);

      // If an event already runs in the exact same domain, end it to prevent collisions:
      const existingSameDomain = this.activeEvents.find((e) => domainOf(e.def.name) === domain);
      if (existingSameDomain) {
        this.endSlot(existingSameDomain);
      }

      // If active events reach max concurrency limit (3), end the oldest one:
      while (this.activeEvents.length >= MAX_CONCURRENT) {
        this.endSlot(this.activeEvents[0]);
      }

      const event = def.create(this.stage);
      if (event.trails) {
        // Clear details that might smear persistent trails
        this.activeEvents.filter((s) => s.tier === 'detail').forEach((s) => this.endSlot(s));
      }

      const slot = { def, event, startedAt: now, domain, tier };
      this.activeEvents.push(slot);
      this.slots[tier] = slot;

      this.recent = [def.name, ...this.recent.filter((n) => n !== def.name)].slice(0, RECENT);
      this.syncLayers();
      if (this.onBegin) this.onBegin(def, tier);
    }

    endSlot(slot) {
      if (!slot) return;
      if (slot.event.end) slot.event.end();
      this.activeEvents = this.activeEvents.filter((s) => s !== slot);
      if (this.slots[slot.tier] === slot) {
        this.slots[slot.tier] = this.activeEvents.find((s) => s.tier === slot.tier) || null;
      }
      this.syncLayers();
    }

    end(tier) {
      const slot = this.slots[tier] || this.activeEvents.find((s) => s.tier === tier);
      if (slot) this.endSlot(slot);
    }

    /** Ends everything and frees the canvases' memory. */
    stop() {
      [...this.activeEvents].forEach((slot) => this.endSlot(slot));
      this.slots = { major: null, detail: null };
      this.syncLayers();
    }

    /** Gives a canvas a backing store only while an event draws on it. */
    syncLayers() {
      Object.entries(this.layers).forEach(([name, { canvas, ctx }]) => {
        const needed = this.activeEvents.some((slot) => slot.event[name]);
        if (needed && !canvas.width) {
          const { W, H, dpr } = this.stage;
          canvas.width = Math.round(W * dpr);
          canvas.height = Math.round(H * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else if (!needed && canvas.width) {
          canvas.width = 0;
          canvas.height = 0;
        }
      });
    }

    render() {
      if (!this.activeEvents.length) return;
      const { W, H } = this.stage;
      Object.entries(this.layers).forEach(([name, { canvas, ctx }]) => {
        if (!canvas.width) return;
        const trails = this.activeEvents.find((s) => s.event.trails && s.event[name]);
        if (trails) {
          // Persistence: fade the last frame instead of clearing it, so moving lights leave trails.
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = `rgba(0, 0, 0, ${1 - (1 - trails.event.trails) ** this.k})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.clearRect(0, 0, W, H);
        }
        this.activeEvents.forEach((slot) => {
          if (!slot.event[name]) return;
          ctx.save();
          slot.event[name](ctx);
          ctx.restore();
        });
      });
    }
  }

  Portfolio.ambientFx = fx;
  Portfolio.AmbientEvents = AmbientEvents;
})((window.Portfolio = window.Portfolio || {}));
