/**
 * @file Central configuration for the portfolio site.
 *
 * Every tunable value (selectors, timings, third-party keys, particle presets)
 * lives here so feature modules stay free of magic numbers and strings.
 */
(function (Portfolio) {
  'use strict';

  /**
   * Recursively merges `overrides` into a deep copy of `base`.
   * Arrays and primitives in `overrides` replace the base value.
   *
   * @template T
   * @param {T} base
   * @param {Partial<T>} overrides
   * @returns {T}
   */
  function deepMerge(base, overrides) {
    const result = JSON.parse(JSON.stringify(base));
    Object.keys(overrides).forEach((key) => {
      const value = overrides[key];
      const isPlainObject = value && typeof value === 'object' && !Array.isArray(value);
      result[key] = isPlainObject && result[key] ? deepMerge(result[key], value) : value;
    });
    return result;
  }

  /** Default particles.js preset ("Particles" theme, also used on first paint). */
  const BASE_PARTICLES = {
    particles: {
      number: { value: 40, density: { enable: true, value_area: 800 } },
      color: { value: '#ffffff' },
      shape: {
        type: 'circle',
        stroke: { width: 0, color: '#000000' },
        polygon: { nb_sides: 5 },
      },
      opacity: {
        value: 0.5,
        random: false,
        anim: { enable: false, speed: 1, opacity_min: 0.1, sync: false },
      },
      size: {
        value: 3,
        random: true,
        anim: { enable: false, speed: 40, size_min: 0.1, sync: false },
      },
      line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.4, width: 1 },
      move: {
        enable: true,
        speed: 6,
        direction: 'none',
        random: false,
        straight: false,
        out_mode: 'out',
        bounce: false,
        attract: { enable: false, rotateX: 600, rotateY: 1200 },
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'repulse' },
        onclick: { enable: true, mode: 'push' },
        resize: true,
      },
      modes: {
        grab: { distance: 400, line_linked: { opacity: 1 } },
        bubble: { distance: 400, size: 40, duration: 2, opacity: 8, speed: 3 },
        repulse: { distance: 200, duration: 0.4 },
        push: { particles_nb: 4 },
        remove: { particles_nb: 2 },
      },
    },
    retina_detect: true,
  };

  /**
   * Background presets selectable from the theme panel.
   * A `null` preset means "no particles" (Clean theme).
   * @type {Record<string, object|null>}
   */
  const PARTICLE_THEMES = {
    particles: BASE_PARTICLES,
    snow: deepMerge(BASE_PARTICLES, {
      particles: {
        number: { value: 60 },
        color: { value: '#fff' },
        opacity: { random: true },
        size: { value: 7 },
        line_linked: { enable: false, distance: 500, width: 2 },
        move: { speed: 3, direction: 'bottom' },
      },
      interactivity: {
        events: {
          onhover: { mode: 'bubble' },
          onclick: { mode: 'repulse' },
        },
        modes: {
          grab: { line_linked: { opacity: 0.5 } },
          bubble: { size: 4, duration: 0.3, opacity: 1 },
        },
      },
    }),
    dust: deepMerge(BASE_PARTICLES, {
      particles: {
        number: { value: 120 },
        opacity: { anim: { enable: true } },
        size: { anim: { enable: true, speed: 0 } },
        line_linked: {
          enable: false,
          distance: 0,
          opacity: 0.24463576890600452,
          width: 1.2626362266116362,
        },
        move: { speed: 3 },
      },
      interactivity: {
        events: { onhover: { enable: false, mode: 'grab' } },
      },
    }),
    clean: null,
  };

  Portfolio.config = Object.freeze({
    /** Page sections toggled by the fullscreen navigation (link id -> section id). */
    sections: {
      home: 'header',
      about: 'about',
      blog: 'blog',
      portfolio: 'portfolio',
      contact: 'contact',
    },

    /** Animation timings in seconds, preserved from the original design. */
    timings: {
      loaderExit: 1,
      menuSlide: 0.6,
      pageSwap: 0.7,
      breakerStagger: 0.1,
      breakerDuration: 2,
    },

    /** Accent colour palettes; each maps to `css/<id>.css`. */
    colorThemes: ['color-red', 'color-purple', 'color-malt', 'color-green', 'color-blue', 'color-orange'],

    particles: {
      containerId: 'particles',
      defaultTheme: 'particles',
      themes: PARTICLE_THEMES,
    },

    /** EmailJS public credentials (safe to expose; restrict allowed origins in the EmailJS dashboard). */
    emailjs: {
      publicKey: 'oI1rJCbePlclon96Z',
      serviceId: 'service_x1s8rt6',
      templateId: 'template_kyeqvbk',
    },

    /**
     * Swarm mode: a flock of cursors that flies around the pointer and builds the
     * page as it scrolls into view. Labels are the site owner's stack; colours are
     * the site's six palettes.
     */
    swarm: {
      storageKey: 'portfolio.swarm',
      /** On for first-time visitors; an explicit "off" is remembered. */
      defaultOn: true,
      labels: [
        'Angular',
        'Spring Boot',
        'MQTT',
        'RabbitMQ',
        'MongoDB',
        'TypeScript',
        'Java',
        'C#',
        'SQL Server',
        'Kafka',
        'Python',
        'Flask',
        'ASP.NET',
        'AWS S3',
        'Git',
        'JavaScript',
      ],
      colors: ['#c70039', '#481380', '#00909e', '#04A777', '#035aa6', '#dd7631'],

      /** Flock physics, in px per 60fps frame. */
      flock: {
        maxSpeed: 5,
        minSpeed: 2.6,
        maxForce: 0.11,
        perception: 120,
        separation: 30,
        travelSpeed: 8.5,
        travelForce: 0.7,
        pointerMemory: 1500,
        pointerRadius: 170,
        /** Distance (px) behind the pointer at which the flock reaches double speed. */
        catchUpDistance: 320,
        edgeMargin: 80,
        scatterImpulse: 9,
        weights: {
          separation: 1.7,
          alignment: 1.1,
          cohesion: 0.9,
          pointer: 0.9,
          leader: 0.45,
          swirl: 1.3,
          wander: 0.35,
          edges: 1.5,
        },
      },

      /** Build-on-scroll: which elements the swarm builds, and how. */
      build: {
        maxTasks: 5,
        /** A visible element is shown anyway after this long (ms), so nothing stays blank. */
        maxWait: 15000,
        approachTimeout: 2200,
        /** Durations (ms) of the structural moves; slow enough to follow. */
        durations: { draw: 1100, fadeIn: 450, move: 1150, scale: 1300, fix: 750, settle: 400 },
        /** Writing speed (characters/second); long texts speed up to finish within maxTypeMs. */
        typeCps: 24,
        maxTypeMs: 5000,
        /** Chance that the builder gets the layout slightly wrong (a teammate fixes it). */
        mistakeRate: 0.55,
        /** Chance that a text gets 1..maxTypos typos (a teammate proof-reads them). */
        typoRate: 0.5,
        maxTypos: 2,
        targets: [
          { selector: '.firstline, .secondline', verb: 'type' },
          { selector: '.social-media, .contactpic', verb: 'move' },
          { selector: '.about-header, .about-first-line, .about-second-line', verb: 'type' },
          { selector: '.cv, .journey-item, .skill-html', verb: 'move' },
          { selector: '.about-img, .service, .work-media', verb: 'scale' },
          { selector: '.experience-heading, .services-heading, .skills-header', verb: 'type' },
          { selector: '.portfolio-header, .blog-header, .contact-header', verb: 'type' },
          { selector: '.work-panel, .blogs, .contact-form, .contact-info', verb: 'draw' },
        ],
      },
    },
  });
})((window.Portfolio = window.Portfolio || {}));
