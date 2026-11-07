/**
 * @file Flock of cursors for swarm mode: physics (boids) and rendering.
 *
 * Original implementation for this site. Free cursors fly as a flock using the
 * classic steering behaviours (Reynolds 1987): separation, alignment, cohesion,
 * plus wander, edge avoidance and a swirl around the pointer. Cursors bank in
 * their direction of travel.
 *
 * Agent modes:
 *  - 'flock'  : flies with the flock.
 *  - 'travel' : flies to `agent.target` (assigned by the builder).
 *  - 'work'   : position is scripted by the builder; physics is skipped.
 */
(function (Portfolio) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  /** Pointer arrow, 14x20 viewBox, tip at the top-left. */
  const ARROW_PATH = 'M1.5 1.5v15.2l4.1-3.9 2.7 6.2 2.6-1.1-2.7-6.1h5.5z';
  /** Direction the unrotated arrow points to (up-left), in degrees. */
  const ARROW_HEADING_DEG = 225;
  const TAU = Math.PI * 2;

  const wrapDeg = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

  function limit(x, y, max) {
    const m = Math.hypot(x, y);
    return m > max ? [(x / m) * max, (y / m) * max] : [x, y];
  }

  class SwarmFlock {
    /**
     * @param {HTMLElement} layer Fixed full-screen layer that hosts the cursors.
     * @param {object} config `Portfolio.config.swarm`.
     * @param {{x: number, y: number}} origin Where the flock takes off from.
     */
    constructor(layer, config, origin) {
      this.layer = layer;
      this.config = config;
      this.pointer = { x: origin.x, y: origin.y, lastMove: -Infinity };

      this.resize();

      this.agents = config.labels.map((label, i) =>
        this.createAgent(label, config.colors[i % config.colors.length], i, origin),
      );
    }

    createAgent(label, color, index, origin) {
      const el = document.createElement('div');
      el.className = 'swarm-agent';

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 14 20');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', ARROW_PATH);
      path.setAttribute('fill', color);
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', '1.2');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);

      const tag = document.createElement('span');
      tag.className = 'swarm-agent__label';
      tag.textContent = label;
      tag.style.background = color;

      el.append(svg, tag);
      this.layer.appendChild(el);

      // Take off from the origin in a burst, like a flock leaving a tree.
      const angle = (index / this.config.labels.length) * TAU + Math.random() * 0.4;
      const speed = 3 + Math.random() * 3;
      return {
        el,
        color,
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: 0,
        wander: Math.random() * TAU,
        mode: 'flock',
        target: null,
      };
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    }

    setPointer(x, y, now) {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.lastMove = now;
    }

    /** Pushes nearby flying cursors away from a click. */
    scatter(x, y) {
      const { scatterImpulse } = this.config.flock;
      this.agents.forEach((a) => {
        if (a.mode === 'work') return;
        const dx = a.x - x;
        const dy = a.y - y;
        const dist = Math.hypot(dx, dy) || 1;
        const falloff = Math.max(0, 1 - dist / 320);
        a.vx += (dx / dist) * scatterImpulse * falloff;
        a.vy += (dy / dist) * scatterImpulse * falloff;
      });
    }

    /**
     * Reserves up to `count` free cursors closest to a point.
     * @returns {object[]} The claimed agents (now in 'travel' mode).
     */
    claim(x, y, count) {
      const crew = this.agents
        .filter((a) => a.mode === 'flock')
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
        .slice(0, count);
      crew.forEach((a) => {
        a.mode = 'travel';
      });
      return crew;
    }

    /** Returns a cursor to the flock, with a little upward kick. */
    release(agent) {
      agent.mode = 'flock';
      agent.target = null;
      agent.task = null;
      agent.vx += (Math.random() - 0.5) * 4;
      agent.vy -= 2 + Math.random() * 2;
      agent.el.classList.remove('is-working');
    }

    /**
     * Invisible leader the flock follows while the pointer rests: a slow
     * Lissajous curve across the screen, so the flock sweeps in wide arcs.
     */
    leader(now) {
      const mx = Math.max(this.width / 2 - 160, 60);
      const my = Math.max(this.height / 2 - 140, 60);
      return {
        x: this.width / 2 + mx * Math.sin(now * 0.00021),
        y: this.height / 2 + my * Math.sin(now * 0.00034 + 1.3),
      };
    }

    /** Steering towards a desired velocity, limited to maxForce. */
    steer(a, dx, dy, speed, force) {
      const m = Math.hypot(dx, dy);
      if (m === 0) return [0, 0];
      return limit((dx / m) * speed - a.vx, (dy / m) * speed - a.vy, force);
    }

    /**
     * Classic boids (separation, alignment, cohesion) plus goal, swirl, wander and walls.
     * @param {number} goalSpeed Cruise speed towards the goal (raised while catching up).
     */
    flockForce(a, goal, swirlAround, goalSpeed) {
      const f = this.config.flock;
      const w = f.weights;
      let sepX = 0;
      let sepY = 0;
      let aliX = 0;
      let aliY = 0;
      let cohX = 0;
      let cohY = 0;
      let n = 0;

      this.agents.forEach((b) => {
        if (b === a || b.mode !== 'flock') return;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < f.separation) {
          sepX += dx / d / d;
          sepY += dy / d / d;
        }
        if (d < f.perception) {
          aliX += b.vx;
          aliY += b.vy;
          cohX += b.x;
          cohY += b.y;
          n++;
        }
      });

      const forces = [];
      if (sepX || sepY) forces.push([this.steer(a, sepX, sepY, f.maxSpeed, f.maxForce * 1.5), w.separation]);
      if (n > 0) {
        forces.push([this.steer(a, aliX / n, aliY / n, f.maxSpeed, f.maxForce), w.alignment]);
        forces.push([this.steer(a, cohX / n - a.x, cohY / n - a.y, f.maxSpeed, f.maxForce), w.cohesion]);
      }

      const gx = goal.x - a.x;
      const gy = goal.y - a.y;
      const gd = Math.hypot(gx, gy) || 1;
      forces.push([this.steer(a, gx, gy, goalSpeed, f.maxForce * 1.5), swirlAround ? w.pointer : w.leader]);
      if (swirlAround && gd < f.pointerRadius) {
        // Tangent to the pointer: the flock circles it like birds around a tree.
        const strength = 1 - gd / f.pointerRadius;
        forces.push([this.steer(a, -gy, gx, f.maxSpeed, f.maxForce), w.swirl * strength]);
      }

      a.wander += (Math.random() - 0.5) * 0.45;
      forces.push([[Math.cos(a.wander) * f.maxForce, Math.sin(a.wander) * f.maxForce], w.wander]);

      // Soft walls: turn back before leaving the screen.
      const m = f.edgeMargin;
      let ex = 0;
      let ey = 0;
      if (a.x < m) ex = 1;
      else if (a.x > this.width - m) ex = -1;
      if (a.y < m) ey = 1;
      else if (a.y > this.height - m) ey = -1;
      if (ex || ey) forces.push([this.steer(a, ex, ey, f.maxSpeed, f.maxForce * 2), w.edges]);

      return forces.reduce(([sx, sy], [[fx, fy], weight]) => [sx + fx * weight, sy + fy * weight], [0, 0]);
    }

    /** @param {number} k Frame scale (1 = one 60fps frame). */
    update(k, now) {
      const f = this.config.flock;
      const pointerActive = now - this.pointer.lastMove < f.pointerMemory;

      this.agents.forEach((a) => {
        if (a.mode === 'work') return;
        let ax = 0;
        let ay = 0;
        let maxSpeed = f.maxSpeed;
        let maxForce = f.maxForce;

        if (a.mode === 'travel' && a.target) {
          // Seek the job's start point, slowing down on arrival.
          const dx = a.target.x - a.x;
          const dy = a.target.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          maxSpeed = f.travelSpeed;
          maxForce = f.travelForce;
          const desired = dist < 90 ? (maxSpeed * dist) / 90 : maxSpeed;
          ax = (dx / dist) * desired - a.vx;
          ay = (dy / dist) * desired - a.vy;
        } else {
          const goal = pointerActive ? this.pointer : this.leader(now);
          if (pointerActive) {
            // Catch up: the further behind the pointer, the faster the flock flies (up to 2x).
            const behind = Math.hypot(goal.x - a.x, goal.y - a.y);
            maxSpeed = f.maxSpeed * (1 + Math.min(behind / f.catchUpDistance, 1));
          }
          [ax, ay] = this.flockForce(a, goal, pointerActive, maxSpeed);
          maxForce = f.maxForce * 3; // sum of weighted, individually-limited steering forces
        }

        [ax, ay] = limit(ax, ay, maxForce);
        a.vx += ax * k;
        a.vy += ay * k;
        const speed = Math.hypot(a.vx, a.vy) || 1;
        if (speed > maxSpeed) {
          a.vx = (a.vx / speed) * maxSpeed;
          a.vy = (a.vy / speed) * maxSpeed;
        } else if (a.mode === 'flock' && speed < f.minSpeed) {
          // Birds never hover: keep a minimum cruising speed.
          a.vx = (a.vx / speed) * f.minSpeed;
          a.vy = (a.vy / speed) * f.minSpeed;
        }
        a.x += a.vx * k;
        a.y += a.vy * k;
      });
    }

    render() {
      this.agents.forEach((a) => {
        // Bank towards the direction of travel; straighten up while working.
        const heading = (Math.atan2(a.vy, a.vx) * 180) / Math.PI;
        const targetRot = a.mode === 'work' ? 0 : wrapDeg(heading - ARROW_HEADING_DEG);
        a.rot = wrapDeg(a.rot + wrapDeg(targetRot - a.rot) * (a.mode === 'work' ? 0.35 : 0.18));
        a.el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) rotate(${a.rot.toFixed(1)}deg)`;
      });
    }
  }

  Portfolio.SwarmFlock = SwarmFlock;
})((window.Portfolio = window.Portfolio || {}));
