/**
 * @file Cursor murmuration in 3D over the night skyline.
 *
 * The site's cursor swarm, scaled up: hundreds of small luminous cursor arrows
 * flock like starlings, led by the 16 named, coloured cursors of swarm mode.
 *
 * Grounded in field studies of starling flocks:
 *  - Topological interaction (Ballerini et al., PNAS 2008): each bird follows its
 *    ~7 nearest neighbours whatever their distance, which keeps the flock
 *    cohesive while its density changes.
 *  - Agitation waves (Procaccini et al. 2011; Hemelrijk et al. 2019): when a
 *    falcon attacks, nearby birds zig-zag away and the change of *orientation*
 *    ripples through the flock as dark bands.
 * The flock lives in 3D and is drawn with perspective, so it thickens when it
 * turns edge-on and thins when it faces the viewer, the look of a real murmuration.
 *
 * Data is kept in typed arrays and neighbours are found through a uniform grid
 * (counting sort), so ~1.5k birds simulate in a few milliseconds. If a machine
 * can't keep up, the flock shrinks itself until it fits the frame budget.
 */
(function (Portfolio) {
  'use strict';

  const K = 7; // topological neighbours
  const NEAR_Z = -300; // depth range of the flock (camera focal length is 900)
  const FAR_Z = 420;
  const P = {
    cruise: 3.0, // world units per 60fps frame
    minSpeed: 2.0,
    maxSpeed: 5.4,
    maxForce: 0.12,
    separation: 8,
    cell: 20,
    weights: { align: 1.0, cohesion: 0.5, separation: 2.4, roost: 1.0, speed: 0.06, flee: 3.2 },
    focal: 900,
  };

  const rand = (a, b) => a + Math.random() * (b - a);

  class Murmuration {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} count Maximum number of birds.
     */
    constructor(canvas, count, budgetMs = 4) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.capacity = count;
      this.budgetMs = budgetMs; // per-frame budget before the flock sheds cursors (leave room for games)
      this.n = count;
      const f = () => new Float32Array(count);
      this.px = f();
      this.py = f();
      this.pz = f();
      this.vx = f();
      this.vy = f();
      this.vz = f();
      this.phase = f();
      this.skitter = f(); // remaining zig-zag time after a scare
      this.release = new Float64Array(count); // when each cursor leaves the pointer
      this.cellOf = new Int32Array(count);
      this.order = new Int32Array(count);
      this.bestD = new Float32Array(K);
      this.bestJ = new Int32Array(K);
      this.counts = new Int32Array(1);
      this.starts = new Int32Array(1);
      this.costMs = 0;
      this.acc = new Float64Array(3);
      this.u = new Float64Array(3);
      this.predator = { active: false, nextAt: 0 };
      this.limit = count; // upper bound from eco mode
      this.adaptiveN = count; // upper bound from the frame budget
      this.mode = 'flock'; // 'flock' | 'gather' (collapsing into the pointer on exit)
      this.gatherTo = null;
      this.leaders = [];
      this.label = null;
      this.ink = '206, 218, 255';
      this.inkGlow = 1;
      this.scare = null;
    }

    /**
     * A sudden bang (a firework, thunder) at a screen point: the birds near it flinch
     * away and zig-zag, and the orientation wave spreads through the flock as after a
     * falcon attack.
     * @param {number} x Screen px.
     * @param {number} y Screen px.
     * @param {number} radius Screen px.
     * @param {number} now
     */
    startle(x, y, radius, now) {
      this.scare = { x: x - this.cx, y: y - this.cy, r2: radius * radius, until: now + 400 };
    }

    /**
     * Colour of the small cursors, from the hour: light that glows where the flock is
     * dense at night (additive), dark silhouettes against a bright sky by day.
     * @param {number[]} rgb
     * @param {number} glow 1 = light at night .. 0 = silhouettes by day.
     */
    setInk(rgb, glow) {
      this.ink = rgb.map(Math.round).join(', ');
      this.inkGlow = glow;
    }

    /**
     * The first birds are the swarm's named cursors (colour + label).
     * @param {string[]} labels
     * @param {string[]} colors
     */
    setLeaders(labels, colors) {
      this.leaders = labels
        .slice(0, this.capacity)
        .map((label, i) => ({ label, color: colors[i % colors.length] }));
    }

    /** Eco mode (window not focused, e.g. while gaming): fewer cursors. */
    setEco(eco) {
      this.limit = eco ? Math.max(400, Math.floor(this.capacity * 0.55)) : this.capacity;
      this.n = Math.min(this.limit, this.adaptiveN);
    }

    resize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cx = width / 2;
      this.cy = height * 0.4;
    }

    /** Wandering roost point the flock circles around (above the skyline). */
    roost(now) {
      const W = this.width;
      const H = this.height;
      return {
        x: Math.sin(now * 0.00009) * W * 0.24 + Math.sin(now * 0.00023 + 1.7) * W * 0.06,
        y: Math.sin(now * 0.00017 + 0.6) * H * 0.06,
        z: Math.sin(now * 0.00011 + 2.1) * 220,
      };
    }

    /**
     * Starts the flock as a burst out of `origin` (screen px): the pointer turns into the swarm.
     * @param {number} now
     * @param {{x: number, y: number}} origin
     */
    reset(now, origin) {
      const ox = origin.x - this.cx;
      const oy = origin.y - this.cy;
      // Take off like a flock leaving a branch: one general heading (up and towards
      // the open sky), a narrow cone around it, and cursors leaving one after another.
      const towardsCentre = ox > 0 ? Math.PI : 0;
      const heading = towardsCentre + (ox > 0 ? 0.55 : -0.55); // and a little upwards
      for (let i = 0; i < this.capacity; i++) {
        const spread = rand(-0.45, 0.45);
        const lift = rand(-0.35, 0.15);
        const speed = rand(3.4, 5.2);
        this.px[i] = ox;
        this.py[i] = oy;
        this.pz[i] = rand(-4, 4);
        this.vx[i] = Math.cos(heading + spread) * speed;
        this.vy[i] = Math.sin(heading + spread) * speed * 0.35 + lift * speed - 1.2;
        this.vz[i] = rand(-1.2, 1.2) * speed * 0.4;
        this.phase[i] = rand(0, Math.PI * 2);
        this.skitter[i] = 0;
        // Ease-in over ~0.9 s: a trickle that quickly becomes a stream.
        this.release[i] = now + Math.sqrt(i / this.capacity) * 900;
      }
      this.mode = 'flock';
      this.gatherTo = null;
      this.predator = { active: false, nextAt: now + rand(20000, 32000) };
      this.scare = null;
      this.label = { index: -1, until: now + 7000 };
    }

    /** Exit: every cursor rushes back into `point` (screen px). */
    gather(point) {
      this.mode = 'gather';
      this.gatherTo = { x: point.x - this.cx, y: point.y - this.cy, z: 0 };
    }

    /* ---------- Neighbour grid ---------- */

    buildGrid(now) {
      const n = this.n;
      const release = this.release;
      let minX = Infinity;
      let minY = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let maxZ = -Infinity;
      for (let i = 0; i < n; i++) {
        if (release[i] > now) continue;
        const x = this.px[i];
        const y = this.py[i];
        const z = this.pz[i];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      let cell = P.cell;
      let nx;
      let ny;
      let nz;
      // Grow the cell if the flock is very spread out, to bound memory.
      for (;;) {
        nx = Math.floor((maxX - minX) / cell) + 1;
        ny = Math.floor((maxY - minY) / cell) + 1;
        nz = Math.floor((maxZ - minZ) / cell) + 1;
        if (nx * ny * nz <= 160000) break;
        cell *= 1.4;
      }
      const cells = nx * ny * nz;
      if (this.counts.length < cells + 1) {
        this.counts = new Int32Array(cells + 1);
        this.starts = new Int32Array(cells + 1);
      } else {
        this.counts.fill(0, 0, cells + 1);
      }
      if (minX === Infinity) {
        minX = minY = minZ = 0;
        maxX = maxY = maxZ = 0;
      }
      for (let i = 0; i < n; i++) {
        if (release[i] > now) {
          this.cellOf[i] = -1;
          continue;
        }
        const c =
          Math.floor((this.px[i] - minX) / cell) +
          nx * (Math.floor((this.py[i] - minY) / cell) + ny * Math.floor((this.pz[i] - minZ) / cell));
        this.cellOf[i] = c;
        this.counts[c]++;
      }
      let sum = 0;
      for (let c = 0; c < cells; c++) {
        this.starts[c] = sum;
        sum += this.counts[c];
        this.counts[c] = 0;
      }
      this.starts[cells] = sum;
      for (let i = 0; i < n; i++) {
        const c = this.cellOf[i];
        if (c < 0) continue;
        this.order[this.starts[c] + this.counts[c]++] = i;
      }
      this.grid = { minX, minY, minZ, cell, nx, ny, nz };
    }

    /* ---------- Simulation ---------- */

    updatePredator(now) {
      const p = this.predator;
      if (!p.active && now >= p.nextAt) {
        // A falcon dives through the flock from one side.
        let sx = 0;
        let sy = 0;
        let sz = 0;
        for (let i = 0; i < this.n; i += 7) {
          sx += this.px[i];
          sy += this.py[i];
          sz += this.pz[i];
        }
        const m = Math.ceil(this.n / 7);
        const target = { x: sx / m, y: sy / m, z: sz / m };
        const side = Math.random() < 0.5 ? -1 : 1;
        p.x = target.x + side * this.width * 0.7;
        p.y = target.y - this.height * rand(0.1, 0.35);
        p.z = target.z + rand(-150, 150);
        const dx = target.x - p.x + rand(-60, 60);
        const dy = target.y - p.y + rand(-40, 40);
        const dz = target.z - p.z;
        const d = Math.hypot(dx, dy, dz);
        const speed = 9.5;
        p.vx = (dx / d) * speed;
        p.vy = (dy / d) * speed;
        p.vz = (dz / d) * speed;
        p.active = true;
        p.until = now + 6000;
      }
      if (p.active && now > p.until) {
        p.active = false;
        p.nextAt = now + rand(25000, 45000);
      }
    }

    step(now, k) {
      const t0 = performance.now();
      if (this.mode === 'gather') {
        this.stepGather(k);
        this.costMs = performance.now() - t0;
        return;
      }
      this.updatePredator(now);
      this.buildGrid(now);
      const { minX, minY, minZ, cell, nx, ny, nz } = this.grid;
      const roost = this.roost(now);
      const pred = this.predator;
      if (pred.active) {
        pred.x += pred.vx * k;
        pred.y += pred.vy * k;
        pred.z += pred.vz * k;
      }
      const w = P.weights;
      const sep2 = P.separation * P.separation;
      const flee2 = 95 * 95;
      const scare = this.scare && this.scare.until > now ? this.scare : null;
      const { px, py, pz, vx, vy, vz, bestD, bestJ } = this;

      // One steering helper per frame writing into shared buffers (no per-bird closures -> no GC churn).
      const acc = this.acc;
      const u = this.u;
      const steer = (dx, dy, dz, weight, force) => {
        const m = Math.hypot(dx, dy, dz);
        if (m === 0) return;
        let fx = (dx / m) * P.cruise - u[0];
        let fy = (dy / m) * P.cruise - u[1];
        let fz = (dz / m) * P.cruise - u[2];
        const fm = Math.hypot(fx, fy, fz);
        if (fm > force) {
          fx = (fx / fm) * force;
          fy = (fy / fm) * force;
          fz = (fz / fm) * force;
        }
        acc[0] += fx * weight;
        acc[1] += fy * weight;
        acc[2] += fz * weight;
      };

      const release = this.release;
      const margin = this.width * 0.06; // screen px
      const top = this.height * 0.08;
      const bottom = this.height * 0.52; // above the tallest towers
      for (let i = 0; i < this.n; i++) {
        if (release[i] > now) continue; // still inside the pointer
        const x = px[i];
        const y = py[i];
        const z = pz[i];
        const gx = Math.floor((x - minX) / cell);
        const gy = Math.floor((y - minY) / cell);
        const gz = Math.floor((z - minZ) / cell);
        let found = 0;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        // K nearest neighbours from the 27 surrounding cells.
        for (let oz = -1; oz <= 1; oz++) {
          const cz = gz + oz;
          if (cz < 0 || cz >= nz) continue;
          for (let oy = -1; oy <= 1; oy++) {
            const cy = gy + oy;
            if (cy < 0 || cy >= ny) continue;
            for (let ox = -1; ox <= 1; ox++) {
              const cx = gx + ox;
              if (cx < 0 || cx >= nx) continue;
              const c = cx + nx * (cy + ny * cz);
              for (let s = this.starts[c], e = this.starts[c + 1]; s < e; s++) {
                const j = this.order[s];
                if (j === i) continue;
                const dx = x - px[j];
                const dy = y - py[j];
                const dz = z - pz[j];
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < sep2 && d2 > 0) {
                  sx += dx / d2;
                  sy += dy / d2;
                  sz += dz / d2;
                }
                if (found < K) {
                  let p = found++;
                  while (p > 0 && bestD[p - 1] > d2) {
                    bestD[p] = bestD[p - 1];
                    bestJ[p] = bestJ[p - 1];
                    p--;
                  }
                  bestD[p] = d2;
                  bestJ[p] = j;
                } else if (d2 < bestD[K - 1]) {
                  let p = K - 1;
                  while (p > 0 && bestD[p - 1] > d2) {
                    bestD[p] = bestD[p - 1];
                    bestJ[p] = bestJ[p - 1];
                    p--;
                  }
                  bestD[p] = d2;
                  bestJ[p] = j;
                }
              }
            }
          }
        }

        const ux = vx[i];
        const uy = vy[i];
        const uz = vz[i];
        u[0] = ux;
        u[1] = uy;
        u[2] = uz;
        acc[0] = 0;
        acc[1] = 0;
        acc[2] = 0;

        if (found > 0) {
          let mx = 0;
          let my = 0;
          let mz = 0;
          let cx = 0;
          let cy = 0;
          let cz = 0;
          for (let q = 0; q < found; q++) {
            const j = bestJ[q];
            mx += vx[j];
            my += vy[j];
            mz += vz[j];
            cx += px[j];
            cy += py[j];
            cz += pz[j];
          }
          steer(mx, my, mz, w.align, P.maxForce);
          steer(cx / found - x, cy / found - y, cz / found - z, w.cohesion, P.maxForce);
        }
        if (sx || sy || sz) steer(sx, sy, sz, w.separation, P.maxForce * 1.5);

        // Roost: a soft spring that grows with distance, keeping the flock on screen.
        const rx = roost.x - x;
        const ry = roost.y - y;
        const rz = roost.z - z;
        const rd = Math.hypot(rx, ry, rz);
        if (rd > 60) steer(rx, ry, rz, w.roost * Math.min((rd - 60) / 260, 1.6), P.maxForce);

        // Soft walls, measured on screen (after perspective): stay in frame and above the skyline.
        const ps = P.focal / (P.focal + z);
        const screenX = this.cx + x * ps;
        const screenY = this.cy + y * ps;
        if (screenX < margin) acc[0] += ((margin - screenX) / ps) * 0.004;
        else if (screenX > this.width - margin) acc[0] -= ((screenX - this.width + margin) / ps) * 0.004;
        if (screenY < top) acc[1] += ((top - screenY) / ps) * 0.004;
        else if (screenY > bottom) acc[1] -= ((screenY - bottom) / ps) * 0.004;
        // Depth limits: never close enough to blow up, never too far to vanish.
        if (z < NEAR_Z) acc[2] += (NEAR_Z - z) * 0.004;
        else if (z > FAR_Z) acc[2] -= (z - FAR_Z) * 0.004;

        // Falcon: flee, then zig-zag for a moment (the orientation wave spreads through alignment).
        if (pred.active) {
          const fx = x - pred.x;
          const fy = y - pred.y;
          const fz = z - pred.z;
          const fd2 = fx * fx + fy * fy + fz * fz;
          if (fd2 < flee2) {
            steer(fx, fy, fz, w.flee, P.maxForce * 3);
            this.skitter[i] = 26;
          }
        }
        // A bang nearby: same reflex.
        if (scare) {
          const sx = x - scare.x;
          const sy = y - scare.y;
          if (sx * sx + sy * sy < scare.r2) {
            steer(sx, sy, z, w.flee, P.maxForce * 3);
            this.skitter[i] = 26;
          }
        }
        if (this.skitter[i] > 0) {
          this.skitter[i] -= k;
          const side = Math.sin(now * 0.025 + i) > 0 ? 1 : -1;
          acc[0] += -uz * 0.05 * side;
          acc[2] += ux * 0.05 * side;
        }

        // Cruise-speed regulation.
        const sp = Math.hypot(ux, uy, uz) || 1;
        const dv = (P.cruise - sp) * w.speed;
        acc[0] += (ux / sp) * dv;
        acc[1] += (uy / sp) * dv;
        acc[2] += (uz / sp) * dv;

        let nvx = ux + acc[0] * k;
        let nvy = uy + acc[1] * k;
        let nvz = uz + acc[2] * k;
        const ns = Math.hypot(nvx, nvy, nvz) || 1;
        const clamped = Math.min(Math.max(ns, P.minSpeed), P.maxSpeed);
        nvx = (nvx / ns) * clamped;
        nvy = (nvy / ns) * clamped;
        nvz = (nvz / ns) * clamped;
        vx[i] = nvx;
        vy[i] = nvy;
        vz[i] = nvz;
        px[i] = x + nvx * k;
        py[i] = y + nvy * k;
        pz[i] = z + nvz * k;
        this.phase[i] += (0.32 + (ns - P.cruise) * 0.04) * k;
      }
      this.costMs = performance.now() - t0;
    }

    stepGather(k) {
      const g = this.gatherTo;
      const pull = Math.min(1, 0.18 * k);
      for (let i = 0; i < this.n; i++) {
        const dx = g.x - this.px[i];
        const dy = g.y - this.py[i];
        const dz = g.z - this.pz[i];
        const d = Math.hypot(dx, dy, dz) || 1;
        const speed = Math.min(18, 4 + d * 0.06);
        this.vx[i] += ((dx / d) * speed - this.vx[i]) * pull;
        this.vy[i] += ((dy / d) * speed - this.vy[i]) * pull;
        this.vz[i] += ((dz / d) * speed - this.vz[i]) * pull;
        this.px[i] += this.vx[i] * k;
        this.py[i] += this.vy[i] * k;
        this.pz[i] += this.vz[i] * k;
      }
    }

    /* ---------- Drawing ---------- */

    /**
     * @param {number} now
     * @param {number} presence 0..1 overall opacity (used by transitions).
     */
    render(now, presence = 1) {
      const t0 = performance.now();
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      if (presence <= 0.01) return;
      const f = P.focal;
      const lead = Math.min(this.leaders.length, this.n);

      // Small cursor arrows. At night additive: where the flock is dense it glows brighter;
      // by day dark and layered: where it is dense it gets darker. Either way the density
      // and orientation waves read at a glance. The opacity dips where the two modes
      // meet (dusk, dawn), so the switch from one to the other is not visible.
      const glow = this.inkGlow;
      ctx.globalCompositeOperation = glow >= 0.5 ? 'lighter' : 'source-over';
      const ink = presence * (0.3 + 0.7 * Math.abs(glow * 2 - 1));
      const bands = [
        { maxS: 0.95, alpha: 0.42, size: 2.2 },
        { maxS: 1.2, alpha: 0.6, size: 2.7 },
        { maxS: Infinity, alpha: 0.8, size: 3.2 },
      ];
      bands.forEach((band, bi) => {
        const minS = bi === 0 ? 0 : bands[bi - 1].maxS;
        ctx.fillStyle = `rgba(${this.ink}, ${band.alpha * ink})`;
        ctx.beginPath();
        for (let i = lead; i < this.n; i++) {
          if (this.release[i] > now) continue;
          const s = f / (f + this.pz[i]);
          if (s <= minS || s > band.maxS || s <= 0) continue;
          const sx = this.cx + this.px[i] * s;
          const sy = this.cy + this.py[i] * s;
          let dx = this.vx[i];
          let dy = this.vy[i];
          const dm = Math.hypot(dx, dy) || 1;
          dx /= dm;
          dy /= dm;
          const len = band.size * s;
          // Arrowhead: tip ahead, notch behind (a cursor seen in flight).
          ctx.moveTo(sx + dx * len, sy + dy * len);
          ctx.lineTo(sx - dx * len * 0.7 - dy * len * 0.55, sy - dy * len * 0.7 + dx * len * 0.55);
          ctx.lineTo(sx - dx * len * 0.35, sy - dy * len * 0.35);
          ctx.lineTo(sx - dx * len * 0.7 + dy * len * 0.55, sy - dy * len * 0.7 - dx * len * 0.55);
          ctx.closePath();
        }
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      // The named swarm cursors fly inside the flock; one of them shows its name now and then.
      if (lead) this.renderLeaders(now, presence, lead);

      // Adaptive quality: shed cursors if simulation + drawing overruns the budget.
      const frameCost = this.costMs + (performance.now() - t0);
      this.avgCost = this.avgCost === undefined ? frameCost : this.avgCost * 0.97 + frameCost * 0.03;
      if (this.mode === 'flock' && this.avgCost > this.budgetMs && this.n > 400) {
        this.adaptiveN = Math.max(400, Math.floor(this.n * 0.85));
        this.n = Math.min(this.limit, this.adaptiveN);
        this.avgCost = this.budgetMs * 0.8;
      }
    }

    renderLeaders(now, presence, count) {
      const ctx = this.ctx;
      const f = P.focal;
      if (this.label && now > this.label.until) {
        this.label = { index: Math.floor(Math.random() * count), from: now, until: now + 22000 };
      }
      for (let i = 0; i < count; i++) {
        if (this.release[i] > now) continue;
        const s = f / (f + this.pz[i]);
        if (s <= 0) continue;
        const sx = this.cx + this.px[i] * s;
        const sy = this.cy + this.py[i] * s;
        // The pointer arrow's tip points up-left at rest; turn it to the flight direction.
        const angle = Math.atan2(this.vy[i], this.vx[i]) + (Math.PI * 3) / 4;
        const scale = 0.5 * s;
        ctx.save();
        ctx.globalAlpha = presence;
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.beginPath(); // same pointer arrow as swarm mode, tip at the origin
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 15.2);
        ctx.lineTo(4.1, 11.3);
        ctx.lineTo(6.8, 17.5);
        ctx.lineTo(9.4, 16.4);
        ctx.lineTo(6.7, 10.3);
        ctx.lineTo(12.2, 10.3);
        ctx.closePath();
        ctx.fillStyle = this.leaders[i].color;
        ctx.fill();
        ctx.lineWidth = 1.2 / scale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.stroke();
        ctx.restore();

        // Name tag: fades in, stays a few seconds, fades out (a collaborator passing by).
        const l = this.label;
        if (l && l.index === i && now - l.from < 4200) {
          const t = (now - l.from) / 4200;
          const alpha = presence * Math.min(1, t * 6, (1 - t) * 4);
          if (alpha > 0) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = '500 11px Poppins, "Segoe UI", sans-serif';
            const text = this.leaders[i].label;
            const w = ctx.measureText(text).width + 12;
            const x = sx + 9;
            const y = sy + 12;
            ctx.fillStyle = this.leaders[i].color;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, 18, 4);
            else ctx.rect(x, y, w, 18);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x + 6, y + 13);
            ctx.restore();
          }
        }
      }
    }
  }

  Portfolio.Murmuration = Murmuration;
})((window.Portfolio = window.Portfolio || {}));
