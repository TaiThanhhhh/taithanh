/**
 * @file Ambient river: the Saigon river in front of the skyline, seen from Thủ Thiêm.
 *
 * What the water shows, painted at half resolution:
 * - the sky, mirrored (the bright horizon near the far bank, the deeper sky towards
 *   the viewer), mixed with the river's own olive-brown: the Saigon river is silty;
 * - the skyline, mirrored and darkened, and at night its window lights and the lamps
 *   of the far bank, smeared into broken vertical streaks;
 * - whatever lights up the sky (fireworks, drones, lasers, lightning), squeezed into
 *   the band of water and blurred, like the glow a show throws on the river;
 * - a glitter path under a low sun or the moon, and by day light catching the ripples.
 * The picture is cut into thin rows shifted by two travelling sine waves (ripples that
 * grow towards the viewer) and fades into the plain colour of the water near the
 * viewer (CSS mask), as reflections do.
 *
 * Cost: ~35 drawImage calls on a small canvas, at most 30 times a second; the still part
 * (sky, skyline, windows) is recomposed only when the lights are re-rolled or the
 * colours change.
 */
(function (Portfolio) {
  'use strict';

  const { css, mix } = Portfolio.AmbientCycle;
  /** Share of the screen height the river takes, at the bottom. */
  const RIVER = 0.12;
  const FRAME_MS = 1000 / 30;
  const ROW = 2; // px per ripple row, at half resolution
  const MUD = [86, 80, 58]; // the Saigon river is olive-brown, not blue
  /** The skyline mirrored in the water spans this many river heights. */
  const DEPTH = 2.2;

  /** Cheap stable hash → 0..1. */
  const hash = (n) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };

  class AmbientRiver {
    /**
     * @param {HTMLElement} root
     * @param {HTMLElement} before Inserted just before this element (the front events layer).
     */
    constructor(root, before) {
      this.water = document.createElement('div');
      this.water.className = 'ambient__river';
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'ambient__river-fx';
      root.insertBefore(this.water, before);
      root.insertBefore(this.canvas, before);
      this.ctx = this.canvas.getContext('2d');
      this.still = document.createElement('canvas'); // sky, skyline and lights mirrored
      this.source = document.createElement('canvas'); // still + reflected shows, each frame
      this.look = null;
      this.last = 0;
      this.dirty = true;
      this.moonLight = 1;
    }

    static get share() {
      return RIVER;
    }

    resize(W, H) {
      this.W = W;
      this.H = H;
      this.top = H * (1 - RIVER);
      const w = Math.max(1, Math.round(W / 2));
      const h = Math.max(1, Math.round((H * RIVER) / 2));
      [this.canvas, this.still, this.source].forEach((c) => {
        c.width = w;
        c.height = h;
      });
      this.dirty = true;
    }

    /** Colour of the water's body (what shows where it reflects little: near the viewer). */
    apply(look) {
      this.look = look;
      const near = mix(mix(look.sky[1], MUD, 0.6), [0, 0, 0], 0.25 + 0.5 * look.dark);
      const far = mix(mix(look.sky[4], MUD, 0.4), [0, 0, 0], 0.1 + 0.4 * look.dark);
      this.water.style.setProperty('--river-far', css(far));
      this.water.style.setProperty('--river-near', css(near));
      this.dirty = true;
    }

    /**
     * Recomposes what does not move: the mirrored sky, skyline, windows and bank lamps.
     * @param {HTMLCanvasElement} skyline The buildings (ambient-sky.js), base at its bottom.
     * @param {HTMLCanvasElement} lights Their window lights, same frame.
     */
    paintStill(skyline, lights) {
      const look = this.look;
      if (!look) return;
      const ctx = this.still.getContext('2d');
      const { width: w, height: h } = this.still;
      const depth = h * DEPTH;
      const night = look.dark;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // The sky, mirrored: the horizon's light near the far bank, deeper sky towards the viewer,
      // all of it muddied by the silty water.
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, css(mix(look.sky[4], MUD, 0.3)));
      sky.addColorStop(0.5, css(mix(look.sky[3], MUD, 0.42)));
      sky.addColorStop(1, css(mix(look.sky[2], MUD, 0.55)));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.scale(1, -1);
      // The buildings, upside down and a little darker (water reflects less than a mirror).
      if (skyline && skyline.width) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(skyline, 0, 0, skyline.width, skyline.height, 0, -depth, w, depth);
      }
      // Their windows at night, smeared downwards in fading passes: ripples stretch a
      // point of light into a streak.
      if (lights && lights.width && look.lit > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        [
          [0, 0.55],
          [2, 0.32],
          [4, 0.2],
          [7, 0.12],
          [11, 0.07],
        ].forEach(([dy, a]) => {
          ctx.globalAlpha = a * (0.45 + 0.4 * night);
          ctx.drawImage(lights, 0, 0, lights.width, lights.height, 0, -depth - dy, w, depth);
        });
      }
      ctx.restore();

      // A veil of the water's own colour over the reflections.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.18 + 0.1 * (1 - night);
      ctx.fillStyle = css(mix(MUD, [0, 0, 0], night * 0.7));
      ctx.fillRect(0, 0, w, h);

      // Lamps along the far bank (Tôn Đức Thắng), unevenly spaced: each a broken column of
      // dashes, brightest at the bank, fading and thinning towards the viewer.
      // Earth Hour switches off the promenade's decorative lamps too.
      const lamp = look.lamp * Math.min(1, look.lit * 4) * (1 - 0.85 * (look.blackout || 0));
      if (lamp > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgb(255, 196, 128)';
        for (let i = 0; i < 26; i++) {
          const x = hash(i * 1.37 + 0.5) * w;
          const reach = 0.3 + hash(i + 9) * 0.45;
          for (let j = 0; j < 7; j++) {
            const d = j / 7;
            if (d > reach) break;
            ctx.globalAlpha = 0.55 * lamp * (1 - d / reach) * (0.6 + 0.4 * hash(i * 7 + j));
            ctx.fillRect(x + (hash(i + j * 3.1) - 0.5) * 2, d * h, 1, 1 + hash(i * 3 + j) * 3);
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      this.dirty = false;
    }

    /**
     * One frame of the river.
     * @param {number} now
     * @param {HTMLCanvasElement[]} shows Event canvases to reflect (only those with a backing store).
     */
    frame(now, shows) {
      if (now - this.last < FRAME_MS || !this.look) return;
      this.last = now;
      const { width: w, height: h } = this.canvas;
      const src = this.source.getContext('2d');
      src.globalCompositeOperation = 'copy';
      src.drawImage(this.still, 0, 0);
      src.globalCompositeOperation = 'lighter';

      // Shows in the sky: the whole sky squeezed into the water, soft and dimmer.
      shows.forEach((c) => {
        if (!c.width) return;
        src.save();
        src.globalAlpha = 0.5;
        src.filter = 'blur(1.5px)';
        src.scale(1, -1);
        src.drawImage(c, 0, 0, c.width, (c.height * this.top) / this.H, 0, -h * 1.05, w, h * 1.05);
        src.restore();
      });

      this.glitter(src, now, w, h);
      src.globalCompositeOperation = 'source-over';

      // Ripples: rows shifted by two travelling waves, stronger near the viewer.
      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);
      const t = now * 0.001;
      for (let y = 0; y < h; y += ROW) {
        const d = y / h; // 0 at the far bank .. 1 at the bottom of the screen
        const amp = 0.4 + d * d * 6;
        const dx =
          Math.sin(y * 0.55 + t * 1.7) * amp * 0.6 +
          Math.sin(y * 0.13 - t * 0.9 + Math.sin(t * 0.3) * 2) * amp;
        const sy = Math.min(h - ROW, Math.max(0, y + Math.sin(y * 0.9 + t * 2.3) * (0.5 + d * 2)));
        ctx.drawImage(this.source, 0, sy, w, ROW, dx, y, w, ROW);
      }
    }

    /** A glitter path under a low sun or the moon; by day, light catching the ripples everywhere. */
    glitter(ctx, now, w, h) {
      const look = this.look;
      const t = now * 0.001;
      const day = 1 - look.dark;
      if (day > 0.3) {
        // Sky light on the crests of the ripples: short, wide dashes that come and go.
        ctx.fillStyle = 'rgb(255, 255, 250)';
        for (let i = 0; i < 70; i++) {
          const d = hash(i * 2.3) ** 0.8;
          const twinkle = Math.max(0, Math.sin(t * (0.6 + hash(i) * 1.4) + i * 2.1));
          ctx.globalAlpha = 0.12 * day * twinkle * twinkle;
          ctx.fillRect(hash(i * 5.7) * w + Math.sin(t * 0.4 + i) * 6, d * h, 3 + d * 14, 1);
        }
      }
      let x;
      let rgb;
      let strength;
      if (look.sun && look.sun.altitude < 0.45) {
        x = look.sun.x * w;
        rgb = look.sun.core.map(Math.round).join(', ');
        strength = 0.9 * (1 - look.sun.altitude / 0.45);
      } else if (look.moon && look.moon.alpha > 0.3) {
        x = look.moon.x * w;
        rgb = '215, 225, 245';
        strength = 0.45 * look.moon.alpha * this.moonLight;
      } else {
        ctx.globalAlpha = 1;
        return;
      }
      ctx.fillStyle = `rgb(${rgb})`;
      for (let i = 0; i < 90; i++) {
        const d = hash(i * 3.1) ** 0.7; // more sparkles near the far bank
        const spread = (6 + d * 46) * (0.5 + strength * 0.5);
        const sx = x + (hash(i * 7.7) - 0.5) * 2 * spread;
        const twinkle = Math.max(0, Math.sin(t * (2 + hash(i) * 5) + i * 1.7));
        const a = strength * twinkle ** 3;
        if (a < 0.03) continue;
        ctx.globalAlpha = a;
        ctx.fillRect(sx, d * h, 1 + d * 5, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  Portfolio.AmbientRiver = AmbientRiver;
})((window.Portfolio = window.Portfolio || {}));
