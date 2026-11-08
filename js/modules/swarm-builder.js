/**
 * @file Builder for swarm mode: a multi-agent crew builds the page as it scrolls into view.
 *
 * Original implementation for this site. Buildable elements start hidden
 * ("pending"). When one is on screen, a crew leaves the flock and works through
 * a short script, written as generator "threads" so several agents can work on
 * the same element in parallel:
 *
 *  1. Structure : draw a frame / drag the block in / stretch it from two corners.
 *                 Sometimes the builder gets it slightly wrong (offset, tilt, size).
 *  2. Content   : the text is written character by character behind a caret,
 *                 occasionally with a typo.
 *  3. Review    : other agents fly in and fix the mistakes (layout in parallel
 *                 with the writing, typos once the writer is done).
 *
 * Safety: an element that waits too long, or is scrolled past, is shown at once,
 * and turning the mode off restores everything immediately.
 */
(function (Portfolio) {
  'use strict';

  const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  /** Inline styles the builder may set on an element; cleared when it finishes. */
  const STYLE_KEYS = ['opacity', 'translate', 'rotate', 'scale', 'transition'];
  const SCAN_INTERVAL_MS = 200;
  const SCALE_FROM = 0.6;
  /** Fraction of the remaining distance a scripted cursor covers per 60fps frame (smooth follow). */
  const FOLLOW = 0.4;
  const STATE_COLORS = { error: '#ff4d4f', ok: '#22c55e' };
  const TYPO_LETTERS = 'etaoinshrdlucmfwypvbgk';

  class SwarmBuilder {
    /**
     * @param {Portfolio.SwarmFlock} flock
     * @param {HTMLElement} layer
     * @param {object} config `Portfolio.config.swarm`.
     */
    constructor(flock, layer, config) {
      this.flock = flock;
      this.layer = layer;
      this.config = config.build;
      /** @type {Map<HTMLElement, {verb: string, visibleSince: number}>} */
      this.pending = new Map();
      this.tasks = [];
      this.lastScan = 0;
      this.now = 0;
      /** @type {Map<Element, DOMRect>} Layout reads cached for the current frame. */
      this.rects = new Map();
    }

    /** getBoundingClientRect, cached for the rest of the frame. */
    rect(el) {
      let r = this.rects.get(el);
      if (!r) {
        r = el.getBoundingClientRect();
        this.rects.set(el, r);
      }
      return r;
    }

    /* ======================= Public API ======================= */

    /** Hides every buildable element inside `root` until the crew builds it. */
    markPending(root) {
      if (!root) return;
      this.config.targets.forEach(({ selector, verb }) => {
        root.querySelectorAll(selector).forEach((el) => {
          if (el.closest('.settings, .swarm-switch')) return;
          if (this.tasks.some((t) => t.el === el)) return;
          el.classList.add('swarm-pending', 'swarm-built');
          this.pending.set(el, { verb, visibleSince: 0 });
        });
      });
    }

    /** Shows everything immediately (used when the mode is turned off). */
    revealAll() {
      [...this.tasks].forEach((task) => this.finish(task));
      this.pending.forEach((_, el) => el.classList.remove('swarm-pending'));
      this.pending.clear();
    }

    update(now) {
      // Elapsed time in 60fps frames, for frame-rate independent smoothing.
      this.k = this.now ? Math.min(Math.max((now - this.now) / Portfolio.motion.FRAME_MS, 0), 3) : 1;
      this.now = now;
      this.rects.clear();
      // Read phase: measure everything the scripts need this frame in one go,
      // so their DOM writes don't force a layout per agent (layout thrashing).
      this.tasks.forEach((task) => {
        this.rect(task.el);
        if (task.text.caretSpan) this.rect(task.text.caretSpan);
      });
      if (now - this.lastScan > SCAN_INTERVAL_MS) {
        this.lastScan = now;
        this.scan(now);
      }

      [...this.tasks].forEach((task) => {
        const r = this.rect(task.el);
        if (!task.el.isConnected || r.width === 0) {
          this.finish(task); // its section was hidden mid-build
          return;
        }
        // Threads may start new threads while running (e.g. a reviewer), so step a
        // snapshot and keep anything that was added meanwhile.
        const done = new Set([...task.threads].filter((thread) => thread.next().done));
        task.threads = task.threads.filter((thread) => !done.has(thread));
        if (task.threads.length === 0) this.finish(task);
        else this.syncUi(task);
      });
    }

    /* ======================= Scheduling ======================= */

    scan(now) {
      const viewportBottom = window.innerHeight * 0.92;
      const ready = [];

      this.pending.forEach((info, el) => {
        const r = this.rect(el);
        if (r.width === 0 || r.height === 0 || r.top > viewportBottom) {
          info.visibleSince = 0; // hidden section or still below the fold
          return;
        }
        if (r.bottom < 0) {
          this.revealNow(el); // scrolled past before it was built
          return;
        }
        if (!info.visibleSince) info.visibleSince = now;
        if (now - info.visibleSince > this.config.maxWait) {
          this.revealNow(el); // fail-safe: never leave content hidden for long
          return;
        }
        ready.push({ el, info, r });
      });

      ready.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
      for (const { el, info, r } of ready) {
        if (this.tasks.length >= this.config.maxTasks) break;
        this.start(el, info.verb, r);
      }
    }

    revealNow(el) {
      el.classList.remove('swarm-pending');
      this.pending.delete(el);
    }

    start(el, verb, r) {
      const crew = this.flock.claim(r.left, r.top, verb === 'scale' ? 2 : 1);
      if (crew.length === 0) return;

      this.pending.delete(el);
      // Read the element's natural opacity, then keep it hidden until the crew shows it.
      el.classList.remove('swarm-pending');
      const opacity = parseFloat(getComputedStyle(el).opacity) || 1;
      el.style.transition = 'none';
      el.style.opacity = '0';

      const task = {
        el,
        verb: verb === 'scale' && crew.length < 2 ? 'draw' : verb,
        crew,
        opacity,
        applied: { x: 0, y: 0, rotate: 0, scale: 1 },
        text: this.prepareText(el),
        mistake: null,
        threads: [],
        ui: { frame: null, badge: null, caret: null, box: null, state: '', label: '' },
      };
      // Each cursor remembers its job, so a finished job never releases a cursor
      // that has already been re-hired by another one.
      crew.forEach((a) => {
        a.task = task;
      });
      task.threads.push(this.run(task));
      this.tasks.push(task);
    }

    /* ======================= Script ======================= */

    *run(task) {
      if (task.verb === 'type') {
        task.el.style.opacity = String(task.opacity); // text-only: letters stay hidden until written
        this.ensureFrame(task, task.crew[0].color, 'guide');
      } else {
        yield* this.approach(task.crew, () => this.startPoints(task));
        yield* this.structure(task);
        // A teammate fixes the layout while the writer carries on.
        if (task.mistake) task.threads.push(this.fixLayout(task));
      }

      const writer = task.crew[0];
      if (task.text.chars.length > 0) {
        yield* this.approach([writer], () => [this.charPoint(task.text.chars[0], 'start')]);
        yield* this.write(task, writer);
      }
      this.releaseAgent(writer, task);

      if (task.text.typos.length > 0) yield* this.fixTypos(task);

      // Wait for teammates still working on this element.
      while (task.threads.length > 1) yield;
      yield* this.settle(task);
    }

    /** Draw / drag / stretch the block into place, possibly getting it slightly wrong. */
    *structure(task) {
      const { el, crew } = task;
      const durations = this.config.durations;
      const mistake = Math.random() < this.config.mistakeRate ? this.pickMistake(task.verb) : null;
      this.ensureFrame(task, crew[0].color);

      if (task.verb === 'draw') {
        const b0 = this.baseRect(task);
        const duration = durations.draw + Math.min((b0.width * b0.height) / 1400, 800);
        yield* this.tween(duration, (e) => {
          const b = this.baseRect(task);
          task.ui.box = { left: b.left, top: b.top, width: b.width * e, height: b.height * e };
          task.ui.label = `${Math.round(task.ui.box.width)} × ${Math.round(task.ui.box.height)}`;
          this.place(crew[0], b.left + b.width * e, b.top + b.height * e);
        });
        task.ui.box = null;
        if (mistake) Object.assign(task.applied, mistake.state);
        this.applyTransform(task);
        yield* this.tween(durations.fadeIn, (e) => {
          el.style.opacity = String(task.opacity * e);
        });
      } else if (task.verb === 'move') {
        const side = Math.random() < 0.5 ? -1 : 1;
        const from = { x: side * (60 + Math.random() * 40), y: 36 + Math.random() * 30 };
        const to = mistake ? mistake.state : { x: 0, y: 0, rotate: 0 };
        el.style.opacity = String(task.opacity);
        yield* this.tween(durations.move, (e) => {
          task.applied.x = lerp(from.x, to.x || 0, e);
          task.applied.y = lerp(from.y, to.y || 0, e);
          task.applied.rotate = lerp(0, to.rotate || 0, e);
          this.applyTransform(task);
          const r = this.rect(task.el);
          this.place(crew[0], r.left + 10, r.top + r.height / 2);
        });
      } else {
        // scale: two agents stretch the block from opposite corners.
        const to = mistake ? mistake.state : { scale: 1, rotate: 0 };
        el.style.opacity = String(task.opacity);
        yield* this.tween(durations.scale, (e) => {
          task.applied.scale = lerp(SCALE_FROM, to.scale || 1, e);
          task.applied.rotate = lerp(0, to.rotate || 0, e);
          this.applyTransform(task);
          const r = this.rect(task.el);
          task.ui.label = `${Math.round(r.width)} × ${Math.round(r.height)}`;
          this.place(crew[0], r.left, r.top);
          if (crew[1]) this.place(crew[1], r.right, r.bottom);
        });
        crew.slice(1).forEach((a) => this.releaseAgent(a, task));
      }

      task.ui.label = '';
      task.mistake = mistake;
      if (mistake) {
        task.ui.state = 'error';
        task.ui.label = mistake.label;
      }
    }

    /** A second agent notices the layout mistake and fixes it. */
    *fixLayout(task) {
      yield* this.wait(450); // let the error be seen
      const reviewer = yield* this.hire(task);
      if (reviewer) {
        yield* this.approach([reviewer], () => {
          const r = this.rect(task.el);
          return [{ x: r.right, y: r.bottom }];
        });
      }

      task.ui.label = 'Fixing…';
      const from = { ...task.applied };
      yield* this.tween(this.config.durations.fix, (e) => {
        task.applied.x = lerp(from.x, 0, e);
        task.applied.y = lerp(from.y, 0, e);
        task.applied.rotate = lerp(from.rotate, 0, e);
        task.applied.scale = lerp(from.scale, 1, e);
        this.applyTransform(task);
        if (reviewer) {
          const r = this.rect(task.el);
          this.place(reviewer, r.right, r.bottom);
        }
      });

      task.ui.state = 'ok';
      task.ui.label = '✓ Fixed';
      this.releaseAgent(reviewer, task);
      yield* this.wait(700);
      if (task.ui.state === 'ok') {
        task.ui.state = '';
        task.ui.label = '';
      }
    }

    /** Writes the text character by character behind a caret, sometimes with a typo. */
    *write(task, writer) {
      const { chars } = task.text;
      const { typeCps, maxTypeMs, typoRate, maxTypos } = this.config;
      const cps = Math.max(typeCps, chars.length / (maxTypeMs / 1000));
      const typoAt = Math.random() < typoRate ? this.pickTypoPositions(chars, maxTypos) : new Set();
      this.ensureCaret(task, writer.color);

      let i = 0;
      let nextAt = this.now;
      while (i < chars.length) {
        while (i < chars.length && this.now >= nextAt) {
          const span = chars[i];
          const correct = span.textContent;
          if (typoAt.has(i)) {
            span.dataset.correct = correct;
            span.textContent = this.wrongLetter(correct);
            task.text.typos.push(span);
          }
          span.classList.add('is-typed');
          i++;
          // Human rhythm: jitter, a beat at word ends, a longer pause after punctuation.
          let delay = (1000 / cps) * (0.55 + Math.random() * 0.9);
          if (span.nextSibling?.nodeType === Node.TEXT_NODE) delay *= 1.8;
          if (/[.,!?:;]/.test(correct)) delay *= 3;
          nextAt += delay;
        }
        // Position from the rect prefetched at frame start (at most one character behind),
        // so writing never forces an extra layout mid-frame.
        task.text.caretSpan = chars[Math.max(i - 1, 0)];
        const caret = this.rect(task.text.caretSpan);
        task.ui.caretRect = caret;
        this.place(writer, caret.right + 1, caret.bottom - caret.height * 0.15);
        yield;
      }

      task.ui.caretRect = null;
      task.text.extras.forEach((el) => {
        el.style.visibility = '';
        el.style.transition = '';
      });
    }

    /** Another agent proof-reads the text and corrects each typo. */
    *fixTypos(task) {
      const reviewer = yield* this.hire(task);
      for (const span of task.text.typos) {
        if (reviewer) yield* this.approach([reviewer], () => [this.charPoint(span, 'under')]);
        span.classList.add('swarm-ch--flag');
        yield* this.wait(380);
        span.textContent = span.dataset.correct;
        span.classList.remove('swarm-ch--flag');
        span.classList.add('swarm-ch--fixed');
        yield* this.wait(260);
      }
      task.text.typos = [];
      this.releaseAgent(reviewer, task);
    }

    *settle(task) {
      task.ui.fade = 1;
      yield* this.tween(this.config.durations.settle, (e) => {
        task.ui.fade = 1 - e;
      });
    }

    /* ======================= Script helpers ======================= */

    /** Sends agents to points (re-evaluated every frame), then hands them to the script. */
    *approach(agents, pointsFn) {
      const startedAt = this.now;
      for (;;) {
        const points = pointsFn();
        let arrived = true;
        agents.forEach((a, i) => {
          a.mode = 'travel';
          a.target = points[i];
          if (Math.hypot(a.x - points[i].x, a.y - points[i].y) > 14) arrived = false;
        });
        if (arrived || this.now - startedAt > this.config.approachTimeout) break;
        yield;
      }
      agents.forEach((a) => {
        a.mode = 'work';
        a.el.classList.remove('is-traveling');
        a.el.classList.add('is-working');
      });
    }

    *tween(duration, fn) {
      const startedAt = this.now;
      for (;;) {
        const p = clamp01((this.now - startedAt) / duration);
        fn(easeInOut(p), p);
        if (p >= 1) return;
        yield;
      }
    }

    *wait(ms) {
      const until = this.now + ms;
      while (this.now < until) yield;
    }

    /** Claims a free teammate near the element, waiting briefly if everyone is busy. */
    *hire(task) {
      const startedAt = this.now;
      for (;;) {
        const r = this.rect(task.el);
        const [agent] = this.flock.claim(r.right, r.bottom, 1);
        if (agent) {
          agent.task = task;
          return agent;
        }
        if (this.now - startedAt > 1500) return null; // nobody free: fix it without a cursor
        yield;
      }
    }

    releaseAgent(agent, task) {
      if (agent && agent.task === task) this.flock.release(agent);
    }

    /** Smoothly moves a scripted cursor towards a point. */
    place(agent, x, y) {
      const f = Portfolio.motion.smoothing(FOLLOW, this.k);
      agent.x += (x - agent.x) * f;
      agent.y += (y - agent.y) * f;
      agent.vx = 0;
      agent.vy = 0;
    }

    pickMistake(verb) {
      const sign = () => (Math.random() < 0.5 ? -1 : 1);
      const options = [];
      if (verb !== 'scale') {
        const x = sign() * (10 + Math.random() * 12);
        const y = sign() * (6 + Math.random() * 8);
        options.push({ state: { x, y }, label: `Off by ${Math.round(Math.hypot(x, y))}px` });
      }
      const deg = sign() * (2 + Math.random() * 2);
      options.push({ state: { rotate: deg }, label: `Tilted ${Math.abs(deg).toFixed(1)}°` });
      if (verb === 'scale') {
        const s = Math.random() < 0.5 ? 0.9 : 1.06;
        options.push({ state: { scale: s }, label: `Wrong size ${Math.round(s * 100)}%` });
      }
      return pick(options);
    }

    pickTypoPositions(chars, max) {
      const candidates = [];
      chars.forEach((span, i) => {
        // Inside a word, away from the edges: a believable slip of the finger.
        const inWord =
          span.previousSibling?.classList?.contains('swarm-ch') &&
          span.nextSibling?.classList?.contains('swarm-ch');
        if (i > 2 && i < chars.length - 2 && inWord && /[a-z]/i.test(span.textContent)) candidates.push(i);
      });
      const positions = new Set();
      const count = 1 + Math.floor(Math.random() * max);
      while (positions.size < Math.min(count, candidates.length)) positions.add(pick(candidates));
      return positions;
    }

    wrongLetter(correct) {
      let letter = correct;
      while (letter.toLowerCase() === correct.toLowerCase()) letter = pick(TYPO_LETTERS);
      return correct === correct.toUpperCase() ? letter.toUpperCase() : letter;
    }

    /* ======================= Geometry ======================= */

    /** The element's rect without the translate/scale the builder applied. */
    baseRect(task) {
      const r = this.rect(task.el);
      const { x, y, scale } = task.applied;
      const width = r.width / scale;
      const height = r.height / scale;
      const cx = r.left + r.width / 2 - x;
      const cy = r.top + r.height / 2 - y;
      return { left: cx - width / 2, top: cy - height / 2, width, height };
    }

    startPoints(task) {
      const b = this.baseRect(task);
      if (task.verb === 'scale') {
        const hw = (b.width * SCALE_FROM) / 2;
        const hh = (b.height * SCALE_FROM) / 2;
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        return [
          { x: cx - hw, y: cy - hh },
          { x: cx + hw, y: cy + hh },
        ];
      }
      return [{ x: b.left, y: b.top }];
    }

    charPoint(span, where) {
      const r = this.rect(span);
      return where === 'under'
        ? { x: r.left + r.width / 2, y: r.bottom + 2 }
        : { x: r.left, y: r.bottom - r.height * 0.15 };
    }

    applyTransform(task) {
      const { el, applied } = task;
      el.style.translate = `${applied.x.toFixed(2)}px ${applied.y.toFixed(2)}px`;
      el.style.rotate = `${applied.rotate.toFixed(3)}deg`;
      el.style.scale = applied.scale.toFixed(4);
    }

    /* ======================= Text ======================= */

    /**
     * Wraps every visible character of `el` in a hidden span so it can be written
     * one by one. The original text nodes are kept and put back on finish.
     */
    prepareText(el) {
      const extras = [...el.querySelectorAll('.txt-rotate')]; // animated by its own module
      extras.forEach((x) => {
        // No transition, or `transition: all` (e.g. `.color`) would keep it visible for a moment.
        x.style.transition = 'none';
        x.style.visibility = 'hidden';
      });

      const nodes = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          !node.nodeValue.trim() || node.parentElement.closest('.txt-rotate, script, style')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      });
      while (walker.nextNode()) nodes.push(walker.currentNode);

      const chars = [];
      const wrappers = nodes.map((node) => {
        const wrap = document.createElement('span');
        wrap.className = 'swarm-text';
        node.nodeValue.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            wrap.appendChild(document.createTextNode(part));
            return;
          }
          for (const ch of part) {
            const span = document.createElement('span');
            span.className = 'swarm-ch';
            span.textContent = ch;
            wrap.appendChild(span);
            chars.push(span);
          }
        });
        node.replaceWith(wrap);
        return { wrap, node };
      });

      return { chars, wrappers, extras, typos: [] };
    }

    restoreText(task) {
      task.text.wrappers.forEach(({ wrap, node }) => {
        if (wrap.isConnected) wrap.replaceWith(node);
      });
      task.text.extras.forEach((el) => {
        el.style.visibility = '';
        el.style.transition = '';
      });
    }

    /* ======================= UI (frame, badge, caret) ======================= */

    ensureFrame(task, color, variant) {
      if (task.ui.frame) return;
      task.ui.color = color;
      task.ui.frame = document.createElement('div');
      task.ui.frame.className = `swarm-frame${variant ? ` swarm-frame--${variant}` : ''}`;
      task.ui.badge = document.createElement('div');
      task.ui.badge.className = 'swarm-badge';
      this.layer.append(task.ui.frame, task.ui.badge);
    }

    ensureCaret(task, color) {
      if (task.ui.caret) return;
      task.ui.caret = document.createElement('div');
      task.ui.caret.className = 'swarm-caret';
      task.ui.caret.style.background = color;
      this.layer.appendChild(task.ui.caret);
    }

    /** Positions the frame, badge and caret of a task for this frame. */
    syncUi(task) {
      const { ui } = task;
      if (!ui.frame) return;
      const color = STATE_COLORS[ui.state] || ui.color;
      const box = ui.box || this.rect(task.el);
      const opacity = ui.fade ?? 1;

      ui.frame.style.borderColor = color;
      ui.frame.style.setProperty('--swarm-color', color);
      ui.frame.style.opacity = String(opacity);
      ui.frame.style.transform = `translate3d(${box.left.toFixed(1)}px, ${box.top.toFixed(1)}px, 0)`;
      ui.frame.style.width = `${Math.max(box.width, 1).toFixed(1)}px`;
      ui.frame.style.height = `${Math.max(box.height, 1).toFixed(1)}px`;

      ui.badge.hidden = !ui.label;
      if (ui.label) {
        ui.badge.textContent = ui.label;
        ui.badge.style.background = color;
        ui.badge.style.opacity = String(opacity);
        ui.badge.style.transform = `translate3d(${(box.left + box.width / 2).toFixed(1)}px, ${(box.top + box.height + 8).toFixed(1)}px, 0) translateX(-50%)`;
      }

      if (ui.caret) {
        const c = ui.caretRect;
        ui.caret.hidden = !c;
        if (c) {
          ui.caret.style.height = `${c.height.toFixed(1)}px`;
          ui.caret.style.transform = `translate3d(${(c.right + 1).toFixed(1)}px, ${c.top.toFixed(1)}px, 0)`;
        }
      }
    }

    /* ======================= Cleanup ======================= */

    finish(task) {
      const { el, ui } = task;
      const r = this.rect(el);
      if (r.width > 0 && r.height > 0) {
        this.flock?.addSettle(r, task.crew[0]?.color);
      }
      this.restoreText(task);
      STYLE_KEYS.forEach((key) => {
        el.style[key] = '';
      });
      if (!el.getAttribute('style')) el.removeAttribute('style');
      ui.frame?.remove();
      ui.badge?.remove();
      ui.caret?.remove();
      this.flock.agents.forEach((a) => {
        if (a.task === task) this.flock.release(a);
      });
      this.tasks = this.tasks.filter((t) => t !== task);
    }
  }

  Portfolio.SwarmBuilder = SwarmBuilder;
})((window.Portfolio = window.Portfolio || {}));
