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
 * An event is `create(stage)` → { update(k, t) → still running?, back(ctx)?,
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
    /** '#rrggbb' → [r, g, b]. */
    hex: (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)),
    /** 0 → 1 → 0: fades in over `inMs` from the start and out over `outMs` before `total`. */
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
      const def = registry.find((d) => d.name === name);
      if (!def || !this.stage) return false;
      this.begin(def, now);
      return true;
    }

    step(now, k, look) {
      this.k = k;
      this.stage.look = look;
      TIERS.forEach((tier) => {
        const slot = this.slots[tier];
        if (slot) {
          if (!slot.event.update(k, now - slot.startedAt)) {
            this.end(tier);
            this.schedule(tier, now);
          }
          return;
        }
        if (now < this.nextAt[tier]) return;
        if (this.pending && tierOf(this.pending) === tier) {
          const def = this.pending;
          this.pending = null;
          this.begin(def, now);
          return;
        }
        // Details keep out of the way of an event that leaves trails (they would smear).
        if (tier === 'detail' && this.slots.major && this.slots.major.event.trails) {
          this.nextAt.detail = now + 5000;
          return;
        }
        const def = this.choose(look, tier);
        if (def) this.begin(def, now);
        else this.nextAt[tier] = now + 20000; // nothing fits right now; look again soon
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
      const weight = (d) => (d.weight || 1) * RARITY[d.rarity || 'common'];
      let r = Math.random() * pool.reduce((sum, d) => sum + weight(d), 0);
      return pool.find((d) => (r -= weight(d)) < 0) || pool[pool.length - 1] || null;
    }

    begin(def, now) {
      const tier = tierOf(def);
      this.end(tier);
      const event = def.create(this.stage);
      if (event.trails) this.end('detail');
      this.slots[tier] = { def, event, startedAt: now };
      this.recent = [def.name, ...this.recent.filter((n) => n !== def.name)].slice(0, RECENT);
      this.syncLayers();
      if (this.onBegin) this.onBegin(def, tier);
    }

    end(tier) {
      const slot = this.slots[tier];
      if (!slot) return;
      if (slot.event.end) slot.event.end();
      this.slots[tier] = null;
      this.syncLayers();
    }

    /** Ends everything and frees the canvases' memory. */
    stop() {
      TIERS.forEach((tier) => this.end(tier));
      this.syncLayers();
    }

    /** Gives a canvas a backing store only while an event draws on it. */
    syncLayers() {
      const events = TIERS.map((tier) => this.slots[tier]).filter(Boolean);
      Object.entries(this.layers).forEach(([name, { canvas, ctx }]) => {
        const needed = events.some((slot) => slot.event[name]);
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
      const events = TIERS.map((tier) => this.slots[tier] && this.slots[tier].event).filter(Boolean);
      if (!events.length) return;
      const { W, H } = this.stage;
      Object.entries(this.layers).forEach(([name, { canvas, ctx }]) => {
        if (!canvas.width) return;
        const trails = events.find((e) => e.trails && e[name]);
        if (trails) {
          // Persistence: fade the last frame instead of clearing it, so moving lights leave trails.
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = `rgba(0, 0, 0, ${1 - (1 - trails.trails) ** this.k})`;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.clearRect(0, 0, W, H);
        }
        events.forEach((event) => {
          if (!event[name]) return;
          ctx.save();
          event[name](ctx);
          ctx.restore();
        });
      });
    }
  }

  Portfolio.ambientFx = fx;
  Portfolio.AmbientEvents = AmbientEvents;
})((window.Portfolio = window.Portfolio || {}));
