/**
 * @file Static Screen Environmental Atmosphere & Diurnal VFX.
 *
 * Infuses the portfolio homepage screen (#header) with life through context-aware
 * environmental visual effects, dynamic solar lighting, and calendar awareness:
 *  - Real-time lighting & color temperature transitions across 10 diurnal periods.
 *  - Dynamic rim lighting on the avatar silhouette (.header-image img) matching the sun's trajectory.
 *  - Subtle atmospheric particles (morning mist, sunlit golden dust, starlight, seasonal petals).
 *  - Contextual time-of-day greeting and cultural calendar tags.
 *  - Zero CPU/GPU waste: auto-freezes when scrolled out of view or when ambient mode takes over.
 */
(function (Portfolio) {
  'use strict';

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  // Atmospheric lighting presets per diurnal period
  const PERIOD_ATMOSPHERE = {
    predawn: {
      glowColor: 'rgba(150, 100, 180, 0.12)',
      glowX: '35%',
      glowY: '88%',
      opacity: 0.6,
      rimColor: 'rgba(180, 130, 200, 0.22)',
      rimOffset: '4px',
      particleType: 'mist',
    },
    sunrise: {
      glowColor: 'rgba(255, 140, 90, 0.22)',
      glowX: '38%',
      glowY: '82%',
      opacity: 0.85,
      rimColor: 'rgba(255, 170, 110, 0.35)',
      rimOffset: '6px',
      particleType: 'dawn_dust',
    },
    morning: {
      glowColor: 'rgba(180, 220, 255, 0.14)',
      glowX: '45%',
      glowY: '60%',
      opacity: 0.7,
      rimColor: 'rgba(200, 230, 255, 0.25)',
      rimOffset: '4px',
      particleType: 'sunlight',
    },
    noon: {
      glowColor: 'rgba(220, 240, 255, 0.12)',
      glowX: '55%',
      glowY: '30%',
      opacity: 0.65,
      rimColor: 'rgba(255, 255, 255, 0.2)',
      rimOffset: '0px',
      particleType: 'sunlight',
    },
    afternoon: {
      glowColor: 'rgba(255, 200, 130, 0.16)',
      glowX: '65%',
      glowY: '65%',
      opacity: 0.75,
      rimColor: 'rgba(255, 190, 120, 0.3)',
      rimOffset: '-4px',
      particleType: 'golden_dust',
    },
    golden: {
      glowColor: 'rgba(255, 150, 60, 0.26)',
      glowX: '72%',
      glowY: '80%',
      opacity: 0.95,
      rimColor: 'rgba(255, 145, 50, 0.42)',
      rimOffset: '-8px',
      particleType: 'golden_dust',
    },
    dusk: {
      glowColor: 'rgba(220, 100, 110, 0.2)',
      glowX: '70%',
      glowY: '88%',
      opacity: 0.85,
      rimColor: 'rgba(240, 120, 120, 0.3)',
      rimOffset: '-6px',
      particleType: 'dusk_motes',
    },
    blue: {
      glowColor: 'rgba(80, 90, 180, 0.16)',
      glowX: '60%',
      glowY: '90%',
      opacity: 0.75,
      rimColor: 'rgba(120, 140, 240, 0.25)',
      rimOffset: '-3px',
      particleType: 'starlight',
    },
    night: {
      glowColor: 'rgba(40, 60, 120, 0.12)',
      glowX: '50%',
      glowY: '92%',
      opacity: 0.6,
      rimColor: 'rgba(80, 110, 200, 0.2)',
      rimOffset: '0px',
      particleType: 'starlight',
    },
    late: {
      glowColor: 'rgba(20, 30, 70, 0.08)',
      glowX: '50%',
      glowY: '95%',
      opacity: 0.5,
      rimColor: 'rgba(60, 80, 150, 0.15)',
      rimOffset: '0px',
      particleType: 'starlight',
    },
  };

  class ScreenAtmosphere {
    constructor() {
      this.config = null;
      this.header = null;
      this.container = null;
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.rafId = 0;
      this.lastTime = 0;
      this.isVisible = true;
      this.lastAtmosphereCheck = 0;
      this.currentPeriod = '';
      this.greetingEl = null;
      this.pillEl = null;
      this.pacer = null;
    }

    init() {
      this.config = Portfolio.config.screenAtmosphere || {};
      if (!this.config.enabled) return;

      this.header = document.getElementById(Portfolio.config.sections?.home || 'header');
      if (!this.header) return;

      this.pacer = Portfolio.motion?.createPacer ? Portfolio.motion.createPacer(30) : () => true;

      this.setupDOM();
      this.setupObserver();
      this.applyAtmosphere(true);

      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reducedMotion && this.config.particles) {
        this.initParticles();
        this.startLoop();
      }

      window.addEventListener('resize', () => this.resize(), { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stopLoop();
        else {
          this.applyAtmosphere(true);
          if (this.isVisible && !reducedMotion) this.startLoop();
        }
      });
    }

    setupDOM() {
      this.container = document.createElement('div');
      this.container.className = 'screen-atmosphere';
      this.container.setAttribute('aria-hidden', 'true');

      const glow = document.createElement('div');
      glow.className = 'screen-atmosphere__glow';

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'screen-atmosphere__canvas';
      this.ctx = this.canvas.getContext('2d');

      this.container.append(glow, this.canvas);
      this.header.prepend(this.container);

      // Adaptive greeting setup
      this.greetingEl = this.header.querySelector('.firstline .color');
      this.boxEl = this.header.querySelector('.header-content-box');

      this.resize();
    }

    setupObserver() {
      if (typeof IntersectionObserver !== 'function') return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            this.isVisible = entry.isIntersecting;
            if (this.isVisible) {
              this.applyAtmosphere(false);
              this.startLoop();
            } else {
              this.stopLoop();
            }
          });
        },
        { threshold: 0.1 },
      );
      observer.observe(this.header);
    }

    resize() {
      if (!this.canvas || !this.header) return;
      const w = this.header.clientWidth || window.innerWidth;
      const h = this.header.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = w;
      this.height = h;
    }

    applyAtmosphere(force = false) {
      const now = performance.now();
      if (!force && now - this.lastAtmosphereCheck < 4000) return;
      this.lastAtmosphereCheck = now;

      const state = Portfolio.ambientCalendar?.getState();
      if (!state) return;

      const period = state.period;
      const preset = PERIOD_ATMOSPHERE[period] || PERIOD_ATMOSPHERE.night;

      // Update CSS variables on header
      this.header.style.setProperty('--ambient-glow-color', preset.glowColor);
      this.header.style.setProperty('--ambient-glow-x', preset.glowX);
      this.header.style.setProperty('--ambient-glow-y', preset.glowY);
      this.header.style.setProperty('--ambient-glow-opacity', String(preset.opacity));

      // Avatar rim light
      if (this.config.rimLighting) {
        const rimShadow = `${preset.rimOffset} 6px 28px ${preset.rimColor}`;
        this.header.style.setProperty('--ambient-rim-shadow', rimShadow);
      }

      // Adaptive greeting
      if (this.config.adaptiveGreeting && this.greetingEl && (force || period !== this.currentPeriod)) {
        this.greetingEl.textContent = state.greetingEn;
        this.currentPeriod = period;
      }

      // Calendar holiday indicator badge
      if (state.activeHoliday && this.boxEl) {
        if (!this.pillEl) {
          this.pillEl = document.createElement('div');
          this.pillEl.className = 'screen-atmosphere__pill';
          this.boxEl.prepend(this.pillEl);
        }
        this.pillEl.textContent = `✨ ${state.activeHoliday.name}`;
      } else if (!state.activeHoliday && this.pillEl) {
        this.pillEl.remove();
        this.pillEl = null;
      }
    }

    initParticles() {
      const count = this.config.maxParticles || 35;
      this.particles = [];
      const w = this.width || window.innerWidth;
      const h = this.height || window.innerHeight;

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: rand(0, w),
          y: rand(0, h),
          size: rand(1.2, 2.8),
          vx: rand(-0.25, 0.25),
          vy: rand(-0.45, -0.15),
          alpha: rand(0.2, 0.7),
          pulse: rand(0, TAU),
          pulseSpeed: rand(0.015, 0.035),
        });
      }
    }

    startLoop() {
      if (this.rafId || !this.isVisible || document.hidden) return;
      this.lastTime = performance.now();
      const tick = (now) => {
        this.rafId = window.requestAnimationFrame(tick);
        if (this.pacer && !this.pacer(now)) return;
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.step(dt);
        this.render();
      };
      this.rafId = window.requestAnimationFrame(tick);
    }

    stopLoop() {
      if (this.rafId) {
        window.cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
    }

    onAtmosphericFlash(intensity, color = [255, 255, 255]) {
      if (!this.header) return;
      const rgb = color.join(',');
      this.header.style.setProperty('--ambient-glow-color', `rgba(${rgb}, ${(intensity * 0.45).toFixed(3)})`);
      setTimeout(() => {
        this.applyAtmosphere(true);
      }, 350);
    }

    step(dt) {
      this.applyAtmosphere(false);
      const state = Portfolio.ambientCalendar?.getState();
      const isRainy = state?.season === 'rainy';
      const holiday = state?.activeHoliday?.id;
      const isTet = holiday === 'tet';
      const isMidAutumn = holiday === 'midautumn';

      const w = this.width;
      const h = this.height;
      const wind = Portfolio.ambientEnvironment?.wind.sample(0.6) || 0.4;

      this.particles.forEach((p) => {
        p.pulse += p.pulseSpeed;

        if (isTet) {
          // Drifting Mai blossom motion (tumble down-right with wind influence)
          p.x += (wind + Math.sin(p.pulse) * 0.4) * 50 * dt;
          p.y += (0.9 + Math.cos(p.pulse * 0.7) * 0.25) * 55 * dt;
        } else if (isMidAutumn) {
          // Gentle floating fireflies (buoyant sinusoidal wandering)
          p.x += (Math.sin(p.pulse * 0.8) * 0.6 + wind * 0.2) * 50 * dt;
          p.y += (p.vy - 0.2 + Math.cos(p.pulse) * 0.4) * 45 * dt;
        } else if (isRainy && (state.period === 'afternoon' || state.period === 'dusk')) {
          // Gentle ambient rain streak responsive to wind
          p.x += (wind * 1.8 - 0.4) * 60 * dt;
          p.y += 2.4 * 60 * dt;
        } else {
          // Ambient buoyant dust motes carrying with ambient wind
          p.x += (p.vx + wind * 0.4 + Math.sin(p.pulse) * 0.15) * 55 * dt;
          p.y += p.vy * 55 * dt;
        }

        // Boundary wrap
        if (p.x < -20) p.x = w + 20;
        else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        else if (p.y > h + 20) p.y = -20;
      });
    }

    render() {
      if (!this.ctx || !this.width) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      const state = Portfolio.ambientCalendar?.getState();
      const period = state?.period || 'night';
      const holiday = state?.activeHoliday?.id;

      let particleColor = '255, 255, 255';
      if (holiday === 'tet') {
        particleColor = '251, 191, 36'; // golden Mai petals
      } else if (holiday === 'midautumn') {
        particleColor = '254, 240, 138'; // gentle lantern warm glow
      } else if (period === 'golden' || period === 'afternoon') {
        particleColor = '255, 185, 100'; // warm golden dust
      } else if (period === 'sunrise' || period === 'morning') {
        particleColor = '230, 240, 255'; // morning light motes
      } else if (period === 'dusk') {
        particleColor = '255, 150, 140'; // twilight rose
      }

      this.particles.forEach((p) => {
        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        this.ctx.fillStyle = `rgba(${particleColor}, ${a.toFixed(3)})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, TAU);
        this.ctx.fill();
      });
    }
  }

  Portfolio.screenAtmosphere = new ScreenAtmosphere();
})((window.Portfolio = window.Portfolio || {}));
