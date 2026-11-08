/**
 * @file Flock of cursors for swarm mode: physics (boids), VFX and rendering.
 *
 * Original implementation for this site. Free cursors fly as a flock using
 * Reynolds steering behaviours (separation, alignment, cohesion), dynamic goal
 * seeking (pointer vs. autonomous Lissajous leader), soft edge avoidance, and an
 * orbital swirl. Cursors bank into turns, react to click shockwaves, frame
 * hovered interactive elements, and leave subtle velocity-tapered motion trails.
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
      this.k = 1;
      this.pointer = {
        x: origin.x,
        y: origin.y,
        lastMove: -Infinity,
        isDown: false,
        isInside: true,
      };
      this.hoverTarget = null;
      this.activeBlend = 0; // 0 = leader, 1 = pointer
      this.ripples = [];
      this.settles = [];

      this.setupCanvas();
      this.resize();

      this.agents = config.labels.map((label, i) =>
        this.createAgent(label, config.colors[i % config.colors.length], i, origin),
      );
    }

    setupCanvas() {
      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'swarm-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.ctx = this.canvas.getContext('2d');
      // Place canvas behind agent DOM elements
      this.layer.prepend(this.canvas);
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
        heading: 0,
        wander: Math.random() * TAU,
        mode: 'flock',
        target: null,
        trail: [],
        depth: 0.92 + (index % 5) * 0.04,
      };
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      if (this.canvas && this.ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    setPointer(x, y, now) {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.lastMove = now;
      this.pointer.isInside = true;
    }

    setPointerDown(isDown) {
      this.pointer.isDown = isDown;
      if (!isDown) {
        this.agents.forEach((a) => a.el.classList.remove('is-pressed'));
      }
    }

    setPointerInside(isInside) {
      this.pointer.isInside = isInside;
    }

    setHoverTarget(target) {
      this.hoverTarget = target;
    }

    /** Pushes nearby flying cursors away from a click and spawns an impulse ripple. */
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

      if (this.config.fx?.ripples) {
        this.ripples.push({
          x,
          y,
          startTime: performance.now(),
          duration: this.config.fx.rippleDuration || 420,
          maxRadius: this.config.fx.rippleMaxRadius || 140,
        });
      }
    }

    /** Adds a subtle completion border pulse on an element built by the crew. */
    addSettle(rect, color) {
      if (!this.config.fx?.settleShimmer || !rect || rect.width === 0) return;
      this.settles.push({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        startTime: performance.now(),
        duration: this.config.fx.settleDuration || 400,
        color: color || '#22c55e',
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
        a.el.classList.add('is-traveling');
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
      agent.el.classList.remove('is-working', 'is-traveling', 'is-pressed');
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
     * Classic boids (separation, alignment, cohesion) plus goal, swirl, wander,
     * soft edge avoidance, interactive hover framing, and press repulsion.
     * @param {number} goalSpeed Cruise speed towards the goal.
     */
    flockForce(a, goal, swirlAround, goalSpeed) {
      const f = this.config.flock;
      const w = f.weights;
      const inter = this.config.interaction || {};
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

      // Sustained press / drag interaction: keep a kinetic repulsion bubble around pointer
      if (this.pointer.isDown) {
        const pRadius = inter.pressedRadius || 200;
        const pdx = a.x - this.pointer.x;
        const pdy = a.y - this.pointer.y;
        const pdist = Math.hypot(pdx, pdy) || 1;
        if (pdist < pRadius) {
          const push = (1 - pdist / pRadius) * (inter.pressedRepulsion || 3.5);
          forces.push([this.steer(a, pdx, pdy, f.maxSpeed * 1.4, f.maxForce * push), 2.2]);
          a.el.classList.add('is-pressed');
        } else {
          a.el.classList.remove('is-pressed');
        }
      }

      // Hover over interactive targets: gently frame the element without occluding content
      if (this.hoverTarget) {
        const ht = this.hoverTarget;
        const pad = inter.hoverPadding || 28;
        const hdistX = Math.max(ht.left - pad - a.x, 0, a.x - (ht.right + pad));
        const hdistY = Math.max(ht.top - pad - a.y, 0, a.y - (ht.bottom + pad));
        const hdist = Math.hypot(hdistX, hdistY);
        if (hdist < pad) {
          const hdx = a.x - ht.cx;
          const hdy = a.y - ht.cy;
          const hfactor = (1 - hdist / pad) * (inter.hoverRepulsion || 1.5);
          forces.push([this.steer(a, hdx, hdy, f.maxSpeed, f.maxForce * 2 * hfactor), 1.8]);
        }
      }

      // Random walk: scale by sqrt(time) so the jitter per second is the same at any refresh rate.
      a.wander += (Math.random() - 0.5) * 0.45 * Math.sqrt(Math.max(this.k, 0));
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
      this.k = k;
      const f = this.config.flock;
      const fxConfig = this.config.fx || {};
      const pointerActive = this.pointer.isInside && now - this.pointer.lastMove < f.pointerMemory;

      // Smooth transition between autonomous leader flight and pointer tracking
      const targetBlend = pointerActive ? 1 : 0;
      const blendRate = pointerActive ? 7 : 2.5;
      this.activeBlend = Portfolio.motion.damp(
        this.activeBlend,
        targetBlend,
        blendRate,
        k * Portfolio.motion.FRAME_MS,
      );

      const leaderPos = this.leader(now);
      const goal = {
        x: leaderPos.x * (1 - this.activeBlend) + this.pointer.x * this.activeBlend,
        y: leaderPos.y * (1 - this.activeBlend) + this.pointer.y * this.activeBlend,
      };
      const swirlAround = this.activeBlend > 0.35;

      this.agents.forEach((a) => {
        if (a.mode === 'work') {
          a.trail.length = 0; // workspace stays clean while writing or measuring
          return;
        }

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
          if (this.activeBlend > 0.05) {
            // Catch up: the further behind the pointer, the faster the flock flies (up to 2x).
            const behind = Math.hypot(goal.x - a.x, goal.y - a.y);
            maxSpeed = f.maxSpeed * (1 + Math.min(behind / f.catchUpDistance, 1) * this.activeBlend);
          }
          [ax, ay] = this.flockForce(a, goal, swirlAround, maxSpeed);
          maxForce = f.maxForce * 3;
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

        // Motion trail buffer (records historical tail positions during purposeful motion)
        const currentSpeed = Math.hypot(a.vx, a.vy);
        const shouldTrail =
          fxConfig.trails && (currentSpeed > (fxConfig.trailMinSpeed || 3.2) || a.mode === 'travel');
        if (shouldTrail) {
          const tailX = a.x - (a.vx / currentSpeed) * 9;
          const tailY = a.y - (a.vy / currentSpeed) * 9;
          a.trail.unshift({ x: tailX, y: tailY, time: now, speed: currentSpeed });
          const maxPoints = fxConfig.trailPoints || 5;
          if (a.trail.length > maxPoints) a.trail.length = maxPoints;
        } else if (a.trail.length > 0) {
          a.trail.pop();
        }
      });
    }

    /** Canvas VFX render: aerodynamic motion trails, click ripples, and settle shimmers. */
    renderFx(now) {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      const fxConfig = this.config.fx || {};
      const baseWidth = fxConfig.trailBaseWidth || 2.2;
      const maxAge = fxConfig.trailMaxAge || 180;

      // 1. Motion trails
      if (fxConfig.trails) {
        this.agents.forEach((a) => {
          if (a.trail.length < 2) return;
          // Purge stale positions
          while (a.trail.length > 0 && now - a.trail[a.trail.length - 1].time > maxAge) {
            a.trail.pop();
          }
          if (a.trail.length < 2) return;

          for (let i = 0; i < a.trail.length - 1; i++) {
            const p1 = a.trail[i];
            const p2 = a.trail[i + 1];
            const t = 1 - i / a.trail.length;
            const alpha = t * (a.mode === 'travel' ? 0.38 : 0.24);

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = a.color;
            this.ctx.globalAlpha = Math.max(alpha, 0);
            this.ctx.lineWidth = Math.max(baseWidth * t, 0.6);
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
          }
        });
      }

      // 2. Click / press shockwaves (ripples)
      if (this.ripples.length > 0) {
        const activeRipples = [];
        for (const r of this.ripples) {
          const elapsed = now - r.startTime;
          const progress = Math.min(elapsed / r.duration, 1);
          if (progress < 1) {
            activeRipples.push(r);
            const ease = 1 - Math.pow(1 - progress, 3);
            const radius = 6 + ease * r.maxRadius;
            const alpha = (1 - progress) * 0.45;

            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, radius, 0, TAU);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            this.ctx.globalAlpha = alpha;
            this.ctx.lineWidth = Math.max(0.6, 2 * (1 - progress * 0.7));
            this.ctx.stroke();
          }
        }
        this.ripples = activeRipples;
      }

      // 3. Build settle shimmer
      if (this.settles.length > 0) {
        const activeSettles = [];
        for (const s of this.settles) {
          const elapsed = now - s.startTime;
          const progress = Math.min(elapsed / s.duration, 1);
          if (progress < 1) {
            activeSettles.push(s);
            const ease = 1 - Math.pow(1 - progress, 2);
            const expand = ease * 6;
            const alpha = (1 - progress) * 0.55;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === 'function') {
              this.ctx.roundRect(
                s.left - expand,
                s.top - expand,
                s.width + expand * 2,
                s.height + expand * 2,
                4,
              );
            } else {
              this.ctx.rect(s.left - expand, s.top - expand, s.width + expand * 2, s.height + expand * 2);
            }
            this.ctx.strokeStyle = s.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
          }
        }
        this.settles = activeSettles;
      }

      this.ctx.globalAlpha = 1;
    }

    /** @param {number} k Frame scale (1 = one 60fps frame). */
    render(k, now) {
      this.renderFx(now || performance.now());
      const f = this.config.flock;

      this.agents.forEach((a) => {
        const speed = Math.hypot(a.vx, a.vy);
        if (speed > 0.4) {
          a.heading = (Math.atan2(a.vy, a.vx) * 180) / Math.PI;
        }
        const targetRot = a.mode === 'work' ? 0 : wrapDeg(a.heading - ARROW_HEADING_DEG);
        const ease = Portfolio.motion.smoothing(a.mode === 'work' ? 0.35 : 0.18, k);
        a.rot = wrapDeg(a.rot + wrapDeg(targetRot - a.rot) * ease);

        // Dynamic aerodynamic scaling during high speed / travel
        let sx = 1;
        let sy = 1;
        if (a.mode !== 'work' && speed > f.maxSpeed * 1.1) {
          const stretch = Math.min((speed - f.maxSpeed) / 30, 0.14);
          sx = 1 + stretch;
          sy = 1 / Math.sqrt(sx);
        }

        a.el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) rotate(${a.rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      });
    }

    destroy() {
      if (this.canvas) {
        this.canvas.remove();
        this.canvas = null;
        this.ctx = null;
      }
      this.agents.forEach((a) => a.el.remove());
      this.agents = [];
      this.ripples = [];
      this.settles = [];
    }
  }

  Portfolio.SwarmFlock = SwarmFlock;
})((window.Portfolio = window.Portfolio || {}));
