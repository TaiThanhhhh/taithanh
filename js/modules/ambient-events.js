/**
 * @file Ambient surprises: things keep happening over the city.
 *
 * Two tiers, each with several events running at once (`maxEvents`):
 * - major events (a new one every `eventGapMinutes`, overlapping the ones still
 *   going): fireworks, a comet, a storm, kites, a show on a tower, a boat parade...
 *   Each announced by a caption under the clock.
 * - details (`detailGapSeconds`): small things passing by: a shooting star, a plane
 *   on approach, a barge on the river, bats at dusk...
 *
 * What runs together stays logical: each event takes up zones (the sky's show, each
 * tower's façade, the river, the weather, the sun, the moon...) and two events never
 * share one; rain rules out what needs a clear sky. So at night fireworks can go up
 * while Bitexco plays its LED show and a barge passes, but never two fireworks shows,
 * nor kites in a storm.
 *
 * The director picks what fits the hour (each event says when it fits from the
 * current look: `look.dark`, `look.sun`, `look.moon`...) and the date (the Saigon
 * calendar: occasion, season, tonight's moon), weighs it by rarity (common /
 * uncommon / rare) and by the day (kites on a windy dry-season weekend, storms on a
 * rainy-season afternoon), and skips the last few ones, so a long session keeps
 * changing. Many events come in versions (`variants`: where the fireworks are fired,
 * where the lasers come from...), never the same one twice in a row. Occasion events
 * (Tết, Trung thu, 2/9...) come mostly on their days. When the city puts on a show
 * (fireworks at 21:00 on 2/9, at midnight for Giao thừa...), the director plays it
 * live. Events live in the ambient-events-*.js files.
 *
 * An event is `create(stage, extra)` → { update(k, t) → still running?, back(ctx)?,
 * front(ctx)?, trails?, bloom?, mirror?, end()? }: `back` draws behind the skyline
 * (things rise from behind the city), `front` in front of it (rain, fog, the LED show
 * on Landmark 81). `trails` (0..1) fades the previous frame instead of clearing it (on
 * canvases of their own, so the other events are not smeared); `bloom` (0..1) makes it
 * glow; `mirror` makes the river reflect its front layer. `extra.variant` is the version
 * picked. `stage.flash(x, y, ...)` lights the sky and the clouds for an instant.
 *
 * Cost: the event canvases only get a backing store while an event draws on
 * them; in between they are 0x0 and nothing is drawn.
 */
(function (Portfolio) {
  'use strict';

  const TAU = Math.PI * 2;
  /** An event does not come back before this many others (when the hour allows). */
  const RECENT = 8;
  const RARITY = { common: 1, uncommon: 0.5, rare: 0.18 };
  /** With `occasionsAnyDay`: how likely an occasion event is on another day (its own day: x3). */
  const OFF_DAY = 0.35;
  /** ...and a season-bound event (a night storm) in the other season. */
  const OFF_SEASON = 0.35;
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
     * Rain in three depths (far: fine and slow, near: long and bright), slanted with the
     * wind that drives the clouds, and rings where drops hit the river.
     * @param {object} stage
     * @param {{count?: number, wind?: number, length?: number}} [o]
     */
    rain(stage, o = {}) {
      const { W, H } = stage;
      const scale = H / 1080;
      const wind = o.wind ?? rand(0.12, 0.26); // clouds drift to the right: so does the rain
      const river = stage.river || { top: H, h: 0 };
      const LAYERS = [
        { share: 0.5, speed: [13, 17], len: [8, 12], width: 0.7, alpha: 0.55 },
        { share: 0.35, speed: [18, 23], len: [14, 20], width: 1, alpha: 0.8 },
        { share: 0.15, speed: [25, 31], len: [26, 38], width: 1.4, alpha: 1 },
      ];
      const total = o.count || 360;
      // Far drops end on the far bank; nearer ones land on the water, the nearest lowest.
      const floorOf = (li) => (li === 0 ? river.top : river.top + (li / 2) * river.h * rand(0.3, 1));
      const layers = LAYERS.map((L, li) => ({
        ...L,
        drops: Array.from({ length: Math.round(total * L.share) }, () => ({
          x: rand(-0.15, 1.1) * W,
          y: rand(0, H),
          len: rand(L.len[0], L.len[1]) * scale * (o.length || 1),
          speed: rand(L.speed[0], L.speed[1]) * scale,
          floor: floorOf(li),
        })),
      }));
      const rings = [];
      return {
        update(k, amount = 1) {
          layers.forEach((L, li) => {
            L.drops.forEach((d) => {
              d.y += d.speed * k;
              d.x += d.speed * wind * k;
              if (d.y > d.floor) {
                if (li > 0 && river.h && rings.length < 90 && Math.random() < amount * 0.6) {
                  rings.push({ x: d.x, y: d.floor, r: 0, life: 1, max: (2 + li * 2.5) * scale });
                }
                d.y = rand(-60, -10);
                d.x = rand(-0.15, 1.1) * W;
                d.floor = floorOf(li);
              }
            });
          });
          rings.forEach((r) => {
            r.life -= 0.045 * k;
            r.r = r.max * (1 - r.life);
          });
          fx.compact(rings, (r) => r.life > 0);
        },
        /** @param {number} amount 0..1, how hard it rains. */
        draw(ctx, amount, color = '220, 228, 240', alpha = 0.35) {
          if (amount <= 0) return;
          ctx.lineCap = 'round';
          layers.forEach((L) => {
            ctx.strokeStyle = `rgba(${color}, ${alpha * amount * L.alpha})`;
            ctx.lineWidth = L.width * Math.max(1, scale);
            ctx.beginPath();
            const count = Math.floor(L.drops.length * amount);
            for (let i = 0; i < count; i++) {
              const d = L.drops[i];
              ctx.moveTo(d.x, d.y);
              ctx.lineTo(d.x - d.len * wind, d.y - d.len);
            }
            ctx.stroke();
          });
          if (!rings.length) return;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          rings.forEach((r) => {
            ctx.moveTo(r.x + r.r, r.y);
            ctx.ellipse(r.x, r.y, r.r, r.r * 0.28, 0, 0, TAU); // seen from the side: flat ellipses
          });
          ctx.strokeStyle = `rgba(${color}, ${alpha * amount * 0.7})`;
          ctx.stroke();
        },
      };
    },

    /**
     * A lightning bolt by midpoint displacement: the channel from the cloud base down to
     * the rooftops, subdivided with offsets halving at each level (a fractal path), plus
     * branches forking off and dying out. Each point keeps its share of the way down,
     * so the stepped leader can be drawn growing.
     * @returns {{paths: {points: number[][], main: boolean, from: number}[]}}
     */
    bolt(x, top, bottom, scale, endAt) {
      const displace = (ax, ay, bx, by, spread, levels) => {
        let pts = [
          [ax, ay],
          [bx, by],
        ];
        let off = spread;
        for (let l = 0; l < levels; l++) {
          const next = [pts[0]];
          for (let i = 1; i < pts.length; i++) {
            const [x0, y0] = pts[i - 1];
            const [x1, y1] = pts[i];
            next.push([(x0 + x1) / 2 + rand(-off, off), (y0 + y1) / 2 + rand(-off, off) * 0.25]);
            next.push(pts[i]);
          }
          pts = next;
          off *= 0.5;
        }
        return pts;
      };
      const endX = endAt ?? x + rand(-0.12, 0.12) * (bottom - top); // endAt: a spire it strikes
      const main = displace(x, top, endX, bottom, 70 * scale, 7);
      const span = bottom - top;
      const paths = [{ points: main, main: true, from: 0 }];
      const branches = Math.floor(rand(2, 5));
      for (let b = 0; b < branches; b++) {
        const at = Math.floor(rand(0.08, 0.6) * main.length);
        const [sx, sy] = main[at];
        const side = Math.random() < 0.5 ? -1 : 1;
        const len = rand(0.15, 0.4) * span;
        const ex = sx + side * len * rand(0.35, 0.8);
        const ey = sy + len * rand(0.6, 1);
        paths.push({ points: displace(sx, sy, ex, ey, 26 * scale, 5), main: false, from: (sy - top) / span });
      }
      paths.forEach((p) => {
        p.down = p.points.map(([, py]) => (py - top) / span); // 0 at the cloud .. 1 at the roofs
      });
      return { paths };
    },

    /**
     * Draws a bolt: a wide violet glow under a thin white core, additive.
     * @param {number} intensity 0..1
     * @param {number} [reach] 0..1: how far down the leader has come (1: connected).
     */
    drawBolt(ctx, bolt, intensity, scale, reach = 1) {
      const paths = bolt.paths || bolt;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      [
        [9 * scale, `rgba(150, 140, 255, ${0.16 * intensity})`],
        [3.2 * scale, `rgba(200, 195, 255, ${0.45 * intensity})`],
        [1.3 * scale, `rgba(255, 255, 255, ${0.95 * intensity})`],
      ].forEach(([width, color]) => {
        ctx.strokeStyle = color;
        paths.forEach((p) => {
          if (p.from > reach) return;
          ctx.lineWidth = p.main ? width : width * 0.55;
          ctx.beginPath();
          const pts = p.points;
          for (let i = 0; i < pts.length; i++) {
            if (p.down && p.down[i] > reach) break;
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.stroke();
        });
      });
      ctx.restore();
    },

    /**
     * Timing of a cloud-to-ground strike, `dt` ms after it starts: a faint stepped leader
     * feeling its way down (~100 ms), the return stroke (the blinding flash), then one to
     * three restrikes down the same channel, each a little weaker.
     * @param {{restrikes: number[]}} s From fx.strikeTiming().
     * @returns {{reach: number, I: number}}
     */
    strikeAt(s, dt) {
      if (dt < 0) return { reach: 0, I: 0 };
      if (dt < s.leader) return { reach: (dt / s.leader) ** 1.6, I: 0.18 };
      let I = Math.exp(-(dt - s.leader) / 70);
      s.restrikes.forEach((at, i) => {
        const d = dt - s.leader - at;
        if (d >= 0) I = Math.max(I, (0.8 - i * 0.15) * Math.exp(-d / 60));
      });
      // A channel stays faintly glowing for a moment after the last stroke.
      const last = s.restrikes.length ? s.restrikes[s.restrikes.length - 1] : 0;
      const glow = dt - s.leader < last + 400 ? 0.08 : 0;
      return { reach: 1, I: Math.max(I, glow) };
    },

    strikeTiming() {
      const restrikes = [];
      let at = 0;
      for (let i = 0, n = Math.floor(rand(1, 4)); i < n; i++) {
        at += rand(50, 140);
        restrikes.push(at);
      }
      return { leader: rand(70, 130), restrikes };
    },

    /**
     * Runs several events as one (a tower duet, a countdown on two towers): updated and
     * drawn together, running while any of them is.
     * @param {...object} events
     */
    combine(...events) {
      const list = events.filter(Boolean);
      return {
        trails: Math.max(0, ...list.map((e) => e.trails || 0)) || undefined,
        bloom: Math.max(0, ...list.map((e) => e.bloom || 0)) || undefined,
        mirror: list.some((e) => e.mirror),
        update(k, t) {
          let running = false;
          list.forEach((e) => {
            if (!e.done && !e.update(k, t)) e.done = true;
            running = running || !e.done;
          });
          return running;
        },
        back: list.some((e) => e.back)
          ? (ctx) =>
              list.forEach((e) => {
                if (!e.back || e.done) return;
                ctx.save();
                e.back(ctx);
                ctx.restore();
              })
          : undefined,
        front: list.some((e) => e.front)
          ? (ctx) =>
              list.forEach((e) => {
                if (!e.front || e.done) return;
                ctx.save();
                e.front(ctx);
                ctx.restore();
              })
          : undefined,
        end() {
          list.forEach((e) => e.end && e.end());
        },
      };
    },

    /** Ease out, with a little overshoot (a digit landing, a light popping in). */
    backOut(x, s = 1.7) {
      const u = clamp01(x) - 1;
      return 1 + (s + 1) * u * u * u + s * u * u;
    },

    /** Ease out, cubic: fast then gentle (most things coming to rest). */
    easeOut: (x) => 1 - (1 - clamp01(x)) ** 3,

    /** Ease in and out, cubic. */
    easeInOut(x) {
      const u = clamp01(x);
      return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    },

    /**
     * Where something on the water is drawn: `d` 0 at the far bank .. 1 at the viewer.
     * @returns {{y: number, s: number}} Its waterline, and its scale (nearer: bigger).
     */
    onWater(stage, d) {
      const r = stage.river;
      return { y: r.top + r.h * d, s: (0.45 + d * 0.95) * (stage.H / 1080) };
    },

    /**
     * Registers an event.
     * @param {object} def
     * @param {string} def.name
     * @param {string} [def.label] Caption under the clock.
     * @param {string} [def.place] Small line above the caption (where it happens).
     * @param {string} [def.group] Group in the test lab (night, sky, weather, day, flyby, river, towers, occasion).
     * @param {'major'|'detail'} [def.tier]
     * @param {'common'|'uncommon'|'rare'} [def.rarity]
     * @param {number} [def.weight]
     * @param {string} [def.occasion] Mostly on that occasion (ambient-calendar.js), e.g. 'tet'.
     * @param {'rainy'|'dry'} [def.season] Mostly in that season.
     * @param {boolean} [def.spectacle] Uses the city's lights: not during Earth Hour.
     * @param {boolean} [def.manual] Never picked at random (live shows, the test lab).
     * @param {string[]} [def.live] Kinds of live show it can play ('fireworks', 'countdown').
     * @param {string[]} [def.zones] What it takes up while it runs ('show', 'landmark', 'bitexco',
     *   'river', 'weather', 'sun', 'moon', 'astro', 'air'...): two events sharing a zone do not run
     *   together (default: from its group, see GROUP_ZONES).
     * @param {boolean} [def.rain] It rains: nothing that needs a clear sky runs meanwhile.
     * @param {boolean} [def.dry] Needs a clear sky (default: from its zones, see DRY_ZONES).
     * @param {object[]} [def.variants] Versions of the event ({id, label?, place?, weight?, ...}):
     *   one is picked each time (never the same twice in a row) and passed as `extra.variant`;
     *   its label / place replace the event's in the caption.
     * @param {string|((cal: object) => string)} [def.then] Event that follows straight after
     *   this one (the countdown → the fireworks), unless the city's live show takes over.
     * @param {(look: object, stage: object, cal: object) => boolean} def.when
     * @param {(cal: object, look: object) => number} [def.boost] Weight multiplier from the date.
     * @param {(cal: object) => ({title: string, place?: string}|null)} [def.caption] Caption from the date.
     * @param {(stage: object, extra: object) => object} def.create
     */
    register(def) {
      registry.push(def);
    },
  };

  /** What a live show is captioned with, above its name. */
  const LIVE_PLACES = {
    tet: 'Sông Sài Gòn · 00:00',
    newyear: 'Phố đi bộ Nguyễn Huệ · 00:00',
    reunification: 'Sông Sài Gòn · 21:00',
    nationalday: 'Sông Sài Gòn · 21:00',
    earthhour: 'Sài Gòn · 20:30 – 21:30',
  };

  /** Without the calendar module: an ordinary rainy-season day. */
  const NO_CAL = {
    season: 'rainy',
    occasions: [],
    has: () => false,
    live: null,
    isWeekend: false,
    month: 6,
    moon: { illumination: 1, full: true },
  };

  /*
   * What runs together. Each event takes up zones; two events sharing a zone do not run at
   * the same time (one show in the sky, one program on each tower, one kind of weather...),
   * except where a zone has room for more (two boats on the river). Rain rules out what
   * needs a clear sky: no kites, drones, fireworks or stars in a downpour.
   */
  const GROUP_ZONES = {
    major: {
      night: ['show'],
      sky: ['astro'],
      weather: ['weather'],
      day: ['air'],
      flyby: ['air'],
      river: ['river'],
      towers: ['towers'],
      occasion: ['occasion'],
    },
    detail: { river: ['lane'], sky: ['hud'] },
  };
  /** How many events may share a zone at once (default 1). */
  const CAPACITY = { lane: 2 };
  /** Zones that need a clear sky. */
  const DRY_ZONES = new Set(['show', 'astro', 'moon', 'sun', 'hud', 'air']);

  const zonesOf = (def) => def.zones || GROUP_ZONES[tierOf(def)][def.group] || [];
  const isDry = (def) => def.dry ?? zonesOf(def).some((z) => DRY_ZONES.has(z));
  /** Whether a and b cannot run together (a zone of room 1 in common, or rain and clear sky). */
  const clash = (a, b) =>
    a === b ||
    zonesOf(a).some((z) => (CAPACITY[z] || 1) === 1 && zonesOf(b).includes(z)) ||
    (a.rain && isDry(b)) ||
    (b.rain && isDry(a));

  class AmbientEvents {
    /**
     * @param {object} sky The AmbientSky: its event canvases (`fxBack`, `fxFront`, and their
     *   `...Trails` twins for the events that leave trails), the light layer (`flash`) and the
     *   bloom layer (`bloom`).
     * @param {object} config `Portfolio.config.ambient`.
     * @param {{event?: string}} [options] `?event=<name>`: that event comes first, on every visit.
     */
    constructor(sky, config, options = {}) {
      const layer = (canvas, method, trails) => ({ canvas, ctx: canvas.getContext('2d'), method, trails });
      // Events that leave trails (fireworks) fade their own canvases instead of clearing them:
      // on separate canvases, so the others running at the same time are not smeared.
      this.layers = {
        back: layer(sky.fxBack, 'back', false),
        backTrails: layer(sky.fxBackTrails, 'back', true),
        front: layer(sky.fxFront, 'front', false),
        frontTrails: layer(sky.fxFrontTrails, 'front', true),
      };
      this.light = { canvas: sky.flash, ctx: sky.flash.getContext('2d'), list: [], lit: false, last: 0 };
      this.bloom = { canvas: sky.bloom, ctx: sky.bloom.getContext('2d') };
      this.config = config;
      /** Occasion and season events may also come on other days (less often). */
      this.anyDay = config.occasionsAnyDay !== false;
      /** How many events of each tier may run at once. */
      this.max = { major: 3, detail: 3, ...(config.maxEvents || {}) };
      this.requested = registry.find((d) => d.name === options.event) || null;
      this.pending = null;
      this.stage = null;
      this.cal = NO_CAL;
      /** The events running: {def, event, tier, startedAt, variant, live?}. */
      this.active = [];
      this.nextAt = { major: Infinity, detail: Infinity };
      this.recent = [];
      this.lastVariant = {};
      this.liveShown = null;
      this.k = 1;
      this.frame = 0;
      /** Called with (def, tier, caption?) when an event begins (the scene shows a caption). */
      this.onBegin = null;
      // A new canvas is 300x150: start without a backing store, sized when an event needs it.
      [...Object.values(this.layers).map((l) => l.canvas), sky.bloom].forEach((canvas) => {
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
        place: def.place || '',
        tier: tierOf(def),
        rarity: def.rarity || 'common',
        occasion: def.occasion || null,
        group: def.group || 'other',
        manual: !!def.manual,
        variants: def.variants ? def.variants.length : 0,
      }));
    }

    resize(stage) {
      this.stop();
      this.stage = stage;
      /**
       * Lights the sky and the clouds around (x, y) for an instant (a burst, a strike).
       * @param {number} x
       * @param {number} y
       * @param {number} [intensity] 0..1
       * @param {number[]} [rgb]
       * @param {number} [radius] Share of the screen width.
       * @param {number} [decayMs] Time for the light to fall to a third.
       */
      stage.flash = (x, y, intensity = 1, rgb = [255, 255, 255], radius = 0.45, decayMs = 220) => {
        if (this.light.list.length < 24) this.light.list.push({ x, y, i: intensity, rgb, radius, decayMs });
      };
      /**
       * The city's lights, as events want them. `blackout` (0..1): share of the city switched
       * off, in a wave from left to right (Earth Hour); the scene repaints the windows from it.
       */
      stage.city = { blackout: 0 };
    }

    reset(now, look, cal) {
      this.stop();
      this.stage.look = look;
      this.cal = cal || NO_CAL;
      this.stage.cal = this.cal;
      this.pending = this.requested;
      this.liveShown = null;
      const seconds = (range) => rand(range[0], range[1]) * 1000;
      this.nextAt.major = now + seconds(this.config.firstEventSeconds);
      this.nextAt.detail = now + seconds(this.config.firstDetailSeconds);
      if (this.pending) this.nextAt[tierOf(this.pending)] = now + 1500;
    }

    /** Plays an event now, whatever the hour or the date (for trying them out). */
    trigger(name, now) {
      const aliases = {
        shooting_star: 'shootingstar',
        heat_lightning: 'lightning',
        balloon: 'balloons',
        balloon_glow: 'balloonglow',
        plane: 'landing',
        airplane: 'landing',
        jet: 'contrail',
        mai: 'blossoms',
        drone: 'drones',
        laser: 'lasers',
        meteor: 'meteors',
        kite: 'kites',
        bubble: 'bubbles',
        seed: 'seeds',
        swallow: 'swallows',
        bat: 'bats',
        searchlight: 'searchlights',
        countdown: 'tet_countdown',
        heli: 'helipad',
        duet: 'towers_duet',
        lucbinh: 'hyacinth',
        parade: 'boatparade',
        iss: 'satellite',
      };
      const resolved = aliases[name] || name;
      const def = registry.find((d) => d.name === resolved);
      if (!def || !this.stage) return false;
      const live = def.live && this.cal.live && def.live.includes(this.cal.live.kind) ? this.cal.live : null;
      this.begin(def, now, live ? { live } : {}, true);
      return true;
    }

    step(now, k, look, cal) {
      this.k = k;
      this.stage.look = look;
      this.cal = cal || NO_CAL;
      this.stage.cal = this.cal;
      this.followLive(now);
      [...this.active].forEach((slot) => {
        if (!this.active.includes(slot) || slot.event.update(k, now - slot.startedAt)) return;
        this.endSlot(slot);
        // A sequence goes on (the countdown → the fireworks), unless the city's own show takes over.
        const next = this.cal.live ? null : this.next(slot.def);
        if (next) this.begin(next, now, {}, true);
      });
      TIERS.forEach((tier) => {
        if (now < this.nextAt[tier]) return;
        if (this.active.filter((s) => s.tier === tier).length >= this.max[tier]) {
          this.nextAt[tier] = now + 4000; // full: look again in a moment
          return;
        }
        if (this.pending && tierOf(this.pending) === tier) {
          const def = this.pending;
          this.pending = null;
          this.begin(def, now, {}, true);
          this.schedule(tier, now);
          return;
        }
        const def = this.choose(look, tier);
        if (def) {
          this.begin(def, now);
          this.schedule(tier, now);
        } else {
          this.nextAt[tier] = now + 6000; // nothing fits right now; look again soon
        }
      });
    }

    /**
     * Live shows: when Saigon fires its fireworks (or counts down to midnight), the scene
     * plays it then and there, show after show until the city's ends.
     */
    followLive(now) {
      const live = this.cal.live;
      if (!live) return;
      const key = `${live.id}:${live.kind}`;
      if (this.active.some((s) => s.live === key)) return;
      // Fireworks wait for the sky to have turned to night (a short time-lapse).
      if (live.kind === 'fireworks' && this.stage.look.dark < 0.7) return;
      const fits = registry.filter((d) => d.live && d.live.includes(live.kind));
      const def = fits.find((d) => d.occasion === live.id) || fits.find((d) => !d.occasion);
      if (!def) return;
      const first = this.liveShown !== key;
      this.liveShown = key;
      const slot = this.begin(
        def,
        now,
        {
          live,
          caption: first
            ? {
                title: live.label,
                place: live.kind === 'countdown' ? 'Landmark 81 · 23:59' : LIVE_PLACES[live.id],
                ms: 14000,
              }
            : null,
          quiet: !first,
        },
        true,
      );
      slot.live = key;
    }

    /** The event that follows `def` in its sequence, if any. */
    next(def) {
      if (!def.then) return null;
      const name = typeof def.then === 'function' ? def.then(this.cal) : def.then;
      return registry.find((d) => d.name === name) || null;
    }

    /** When the next event of a tier starts (counted from this one's start: they overlap). */
    schedule(tier, now) {
      const [a, b] =
        tier === 'major' ? this.config.eventGapMinutes.map((m) => m * 60) : this.config.detailGapSeconds;
      this.nextAt[tier] = now + rand(a, b) * 1000;
    }

    /** Whether `def` can join the events running now: no zone taken, no rain on a clear-sky event. */
    fitsWithRunning(def) {
      const zones = zonesOf(def);
      for (const z of zones) {
        const used = this.active.filter((s) => zonesOf(s.def).includes(z)).length;
        if (used >= (CAPACITY[z] || 1)) return false;
      }
      return !this.active.some((s) => s.def === def || (def.rain && isDry(s.def)) || (s.def.rain && isDry(def)));
    }

    /** Whether an event can happen now: its date, its season, the hour, the city's lights, what runs. */
    eligible(def, look) {
      const cal = this.cal;
      if (def.manual) return false;
      if (!this.anyDay && def.occasion && !cal.has(def.occasion)) return false;
      if (!this.anyDay && def.season && cal.season !== def.season) return false;
      // The city's lights are off (Earth Hour): no light shows.
      const dark = (cal.live && cal.live.kind === 'earthhour') || this.stage.city.blackout > 0.02;
      if (def.spectacle && dark) return false;
      return this.fitsWithRunning(def) && def.when(look, this.stage, cal);
    }

    /** Weighted pick among the events of a tier that fit, skipping recent ones if possible. */
    choose(look, tier) {
      const fits = registry.filter((d) => tierOf(d) === tier && this.eligible(d, look));
      const fresh = fits.filter((d) => !this.recent.includes(d.name));
      const pool = fresh.length ? fresh : fits;
      const cal = this.cal;
      const weight = (d) =>
        (d.weight || 1) *
        RARITY[d.rarity || 'common'] *
        // It is the day for it: much more likely; another day: now and then.
        (d.occasion ? (cal.has(d.occasion) ? 3 : OFF_DAY) : 1) *
        (d.season && cal.season !== d.season ? OFF_SEASON : 1) *
        (d.boost ? d.boost(cal, look) : 1);
      let r = Math.random() * pool.reduce((sum, d) => sum + weight(d), 0);
      return pool.find((d) => (r -= weight(d)) < 0) || pool[pool.length - 1] || null;
    }

    /** One of the event's versions, weighted, never the one shown last time. */
    pickVariant(def) {
      const list = def.variants;
      if (!list || !list.length) return null;
      const last = this.lastVariant[def.name];
      const pool = list.length > 1 ? list.filter((v) => v.id !== last) : list;
      let r = Math.random() * pool.reduce((sum, v) => sum + (v.weight || 1), 0);
      const variant = pool.find((v) => (r -= v.weight || 1) < 0) || pool[pool.length - 1];
      this.lastVariant[def.name] = variant.id;
      return variant;
    }

    /**
     * Starts an event. `force` (the test lab, a live show, a sequence) makes room for it:
     * whatever it cannot run with is ended first.
     * @returns {object} Its slot.
     */
    begin(def, now, extra = {}, force = false) {
      this.active.filter((s) => s.def === def || (force && clash(def, s.def))).forEach((s) => this.endSlot(s));
      const variant = extra.variant || this.pickVariant(def);
      const event = def.create(this.stage, { cal: this.cal, ...extra, variant });
      const slot = { def, event, tier: tierOf(def), startedAt: now, variant };
      this.active.push(slot);
      this.recent = [def.name, ...this.recent.filter((n) => n !== def.name)].slice(0, RECENT);
      this.syncLayers();
      const caption =
        extra.caption ||
        (def.caption ? def.caption(this.cal) : null) ||
        (variant && (variant.label || variant.place)
          ? { title: variant.label || def.label, place: variant.place ?? def.place }
          : null);
      if (this.onBegin && !extra.quiet) this.onBegin(def, slot.tier, caption);
      return slot;
    }

    endSlot(slot) {
      const i = this.active.indexOf(slot);
      if (i < 0) return;
      this.active.splice(i, 1);
      if (slot.event.end) slot.event.end();
      this.syncLayers();
    }

    /** Ends everything and frees the canvases' memory. */
    stop() {
      [...this.active].forEach((slot) => this.endSlot(slot));
      this.light.list.length = 0;
      this.syncLayers();
    }

    /** The events running now. */
    get running() {
      return this.active.map((slot) => slot.event);
    }

    /** The events drawing on a layer: those with its method, trails or not as the layer is. */
    drawers(layer, events = this.running) {
      return events.filter((e) => e[layer.method] && !!e.trails === layer.trails);
    }

    /** Gives a canvas a backing store only while an event draws on it. */
    syncLayers() {
      const events = this.running;
      Object.values(this.layers).forEach((layer) => {
        const { canvas, ctx } = layer;
        const needed = this.drawers(layer, events).length > 0;
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

    /** What the river reflects: the light on the sky, the shows behind the city, and those in front that glow. */
    mirrors() {
      const list = [this.light.canvas];
      const events = this.running;
      Object.values(this.layers).forEach((layer) => {
        if (!layer.canvas.width) return;
        if (layer.method === 'back' || this.drawers(layer, events).some((e) => e.mirror)) list.push(layer.canvas);
      });
      return list;
    }

    render(now = performance.now()) {
      this.frame++;
      this.renderLight(now);
      const events = this.running;
      if (events.length) {
        const { W, H } = this.stage;
        Object.values(this.layers).forEach((layer) => {
          const { canvas, ctx } = layer;
          if (!canvas.width) return;
          const list = this.drawers(layer, events);
          if (layer.trails) {
            // Persistence: fade the last frame instead of clearing it, so moving lights leave trails.
            // With 8-bit alpha a gentle fade stalls on faint pixels (4/255 x 0.88 rounds back to 4)
            // and leaves ghost glows; a stronger fade every third frame clears them.
            const trails = Math.max(0.01, ...list.map((e) => e.trails));
            let fade = 1 - (1 - trails) ** this.k;
            if (this.frame % 3 === 0) fade = Math.max(fade, 0.26);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';
          } else {
            ctx.clearRect(0, 0, W, H);
          }
          list.forEach((event) => {
            ctx.save();
            event[layer.method](ctx);
            ctx.restore();
          });
        });
      }
      this.renderBloom(events);
    }

    /** The light bursts and strikes throw on the sky: soft radial glows on a 64x36 canvas. */
    renderLight(now) {
      const L = this.light;
      const dt = Math.min(100, now - (L.last || now));
      L.last = now;
      if (!L.list.length) {
        if (L.lit) {
          L.ctx.clearRect(0, 0, L.canvas.width, L.canvas.height);
          L.lit = false;
        }
        return;
      }
      const { W, H } = this.stage;
      const { ctx, canvas } = L;
      const sx = canvas.width / W;
      const sy = canvas.height / H;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      L.list.forEach((f) => {
        const r = f.radius * canvas.width;
        const x = f.x * sx;
        const y = f.y * sy;
        const rgb = f.rgb.join(', ');
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        // A soft, roughly exponential falloff: a glow in the haze, not a disc.
        g.addColorStop(0, `rgba(${rgb}, ${Math.min(1, f.i * 0.75)})`);
        g.addColorStop(0.12, `rgba(${rgb}, ${Math.min(1, f.i * 0.48)})`);
        g.addColorStop(0.3, `rgba(${rgb}, ${Math.min(1, f.i * 0.2)})`);
        g.addColorStop(0.55, `rgba(${rgb}, ${Math.min(1, f.i * 0.06)})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        f.i *= Math.exp(-dt / f.decayMs);
      });
      ctx.globalCompositeOperation = 'source-over';
      fx.compact(L.list, (f) => f.i > 0.01);
      L.lit = true;
    }

    /** Bloom: a quarter-resolution, blurred copy of the shows, screen-blended over the scene (at night). */
    renderBloom(events) {
      const B = this.bloom;
      const strength = events.reduce((m, e) => Math.max(m, e.bloom || 0), 0);
      const dark = this.stage && this.stage.look ? this.stage.look.dark : 1;
      if (!strength || dark < 0.3) {
        if (B.canvas.width) {
          B.canvas.width = 0;
          B.canvas.height = 0;
        }
        return;
      }
      const { W, H } = this.stage;
      if (!B.canvas.width) {
        B.canvas.width = Math.max(1, Math.round(W / 4));
        B.canvas.height = Math.max(1, Math.round(H / 4));
      }
      const { ctx, canvas } = B;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = strength * Math.min(1, (dark - 0.3) / 0.4);
      ctx.filter = 'blur(3px)';
      Object.values(this.layers).forEach(({ canvas: c }) => {
        if (c.width) ctx.drawImage(c, 0, 0, canvas.width, canvas.height);
      });
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    }
  }

  Portfolio.ambientFx = fx;
  Portfolio.AmbientEvents = AmbientEvents;
})((window.Portfolio = window.Portfolio || {}));
