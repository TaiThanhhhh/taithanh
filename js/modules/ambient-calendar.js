/**
 * @file Calendar & Astronomical Day Engine: time-of-day phases, solar transitions,
 * seasonal weather patterns, and calendar holidays for Ho Chi Minh City.
 *
 * Provides a single source of truth for:
 *  - Diurnal solar phase (0..1) with continuous, jitter-free midnight rollover.
 *  - Time-of-day periods: predawn, sunrise, morning, noon, afternoon, golden, dusk, blue, night, late.
 *  - Special calendar events: Tết, New Year, National Day, Mid-Autumn, Programmer's Day, Birthday.
 *  - Tropical seasons: Saigon rainy season (May-Nov) vs dry season (Dec-Apr).
 *  - Weekend vs. weekday rhythms.
 */
(function (Portfolio) {
  'use strict';

  const wrap01 = (x) => ((x % 1) + 1) % 1;

  function clamp01(x) {
    return Math.min(1, Math.max(0, x));
  }

  function smoothstep(x) {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  class AmbientCalendar {
    constructor() {
      this.config = null;
      this.cachedNow = 0;
      this.cachedState = null;
      this.overrideDate = null;
      this.overrideHolidayId = null;
      this.overrideSeason = null;
    }

    init() {
      this.config = Portfolio.config.calendar || {};
    }

    /**
     * Resolves the current local date & time components in Ho Chi Minh City / configured timezone.
     * @param {Date} [baseDate]
     * @returns {{date: Date, hours: number, minutes: number, seconds: number, decimalHour: number, month: number, day: number, dayOfWeek: number, dayOfYear: number}}
     */
    getTimeComponents(baseDate) {
      const d = baseDate || this.overrideDate || new Date();
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const seconds = d.getSeconds();
      const ms = d.getMilliseconds();
      const decimalHour = hours + minutes / 60 + seconds / 3600 + ms / 3600000;
      const month = d.getMonth() + 1; // 1..12
      const day = d.getDate();
      const dayOfWeek = d.getDay(); // 0 = Sun .. 6 = Sat
      const dayOfYear = getDayOfYear(d);

      return {
        date: d,
        hours,
        minutes,
        seconds,
        decimalHour,
        month,
        day,
        dayOfWeek,
        dayOfYear,
      };
    }

    /**
     * Computes the continuous diurnal solar phase (0..1) from local clock hour,
     * calibrated for Ho Chi Minh City's tropical solar milestones.
     * Phase 0 = Golden Hour (17:30), Phase 0.63 = Sunrise (06:00), Phase 0.82 = Solar Noon (12:00).
     * @param {number} decimalHour 0..24
     * @returns {number} 0..1 phase
     */
    calculateDiurnalPhase(decimalHour) {
      const milestones = this.config?.solarMilestones || [
        { hour: 5.0, phase: 0.58 },
        { hour: 6.0, phase: 0.63 },
        { hour: 8.5, phase: 0.72 },
        { hour: 12.0, phase: 0.82 },
        { hour: 15.5, phase: 0.93 },
        { hour: 17.5, phase: 0.0 },
        { hour: 18.25, phase: 0.08 },
        { hour: 19.25, phase: 0.15 },
        { hour: 21.0, phase: 0.22 },
        { hour: 25.5, phase: 0.45 },
      ];

      // Shift the 24h cycle so the origin is at 17:30 (phase 0 = golden hour).
      // Normalized time extends continuously from 17.5 to 41.5 across midnight.
      let h = decimalHour;
      if (h < 17.5) h += 24;

      // Find enclosing milestones
      let i = 0;
      while (i < milestones.length - 1 && milestones[i + 1].hour <= h) {
        i++;
      }

      const m1 = milestones[i];
      const m2 = milestones[(i + 1) % milestones.length];

      const h1 = m1.hour;
      let h2 = m2.hour;
      if (h2 < h1) h2 += 24;

      const p1 = m1.phase;
      let p2 = m2.phase;
      if (p2 < p1) p2 += 1;

      const progress = clamp01((h - h1) / (h2 - h1 || 1));
      const smoothed = smoothstep(progress);
      const phase = wrap01(p1 + (p2 - p1) * smoothed);

      return phase;
    }

    /**
     * Identifies active special calendar events based on date / day of year.
     * @param {number} month 1..12
     * @param {number} day 1..31
     * @param {number} dayOfYear 1..366
     * @returns {object[]} Active special events
     */
    detectSpecialEvents(month, day, dayOfYear) {
      if (this.overrideHolidayId) {
        const events = this.config?.specialEvents || [];
        const found = events.find((e) => e.id === this.overrideHolidayId);
        if (found) return [found];
        return [{ id: this.overrideHolidayId, name: this.overrideHolidayId }];
      }

      const events = this.config?.specialEvents || [];
      const active = [];

      for (const ev of events) {
        // Date ranges (e.g. Tết, New Year, National Day)
        if (ev.dates) {
          const match = ev.dates.some((range) => {
            if (range.month !== month) return false;
            return day >= range.dayStart && day <= range.dayEnd;
          });
          if (match) active.push(ev);
        }
        // Specific day of year (e.g. Programmer's Day = 256)
        else if (ev.dayOfYear && ev.dayOfYear === dayOfYear) {
          active.push(ev);
        }
      }

      return active;
    }

    /**
     * Determines current season: Saigon rainy season (May-Nov) vs. dry season (Dec-Apr).
     * @param {number} month 1..12
     * @returns {'rainy'|'dry'}
     */
    detectSeason(month) {
      if (this.overrideSeason) return this.overrideSeason;
      const rainyMonths = this.config?.rainySeasonMonths || [5, 6, 7, 8, 9, 10, 11];
      return rainyMonths.includes(month) ? 'rainy' : 'dry';
    }

    /**
     * Returns full snapshot of current astronomical, diurnal and calendar state.
     * @param {Date} [baseDate]
     * @returns {object}
     */
    getState(baseDate) {
      const time = this.getTimeComponents(baseDate);
      const phase = this.calculateDiurnalPhase(time.decimalHour);
      const season = this.detectSeason(time.month);
      const isWeekend = time.dayOfWeek === 0 || time.dayOfWeek === 6;
      const specialEvents = this.detectSpecialEvents(time.month, time.day, time.dayOfYear);

      // Period name determination
      let period = 'night';
      if (time.decimalHour >= 4.5 && time.decimalHour < 5.75) period = 'predawn';
      else if (time.decimalHour >= 5.75 && time.decimalHour < 7.0) period = 'sunrise';
      else if (time.decimalHour >= 7.0 && time.decimalHour < 11.5) period = 'morning';
      else if (time.decimalHour >= 11.5 && time.decimalHour < 14.0) period = 'noon';
      else if (time.decimalHour >= 14.0 && time.decimalHour < 17.0) period = 'afternoon';
      else if (time.decimalHour >= 17.0 && time.decimalHour < 18.25) period = 'golden';
      else if (time.decimalHour >= 18.25 && time.decimalHour < 19.25) period = 'dusk';
      else if (time.decimalHour >= 19.25 && time.decimalHour < 21.0) period = 'blue';
      else if (time.decimalHour >= 21.0 || time.decimalHour < 1.5) period = 'night';
      else period = 'late';

      // Contextual greeting
      let greetingEn = "Hello, I'm";
      let greetingVi = 'Xin chào, tôi là';
      if (period === 'sunrise' || period === 'morning') {
        greetingEn = "Good morning, I'm";
        greetingVi = 'Chào buổi sáng, tôi là';
      } else if (period === 'noon' || period === 'afternoon') {
        greetingEn = "Good afternoon, I'm";
        greetingVi = 'Chào buổi chiều, tôi là';
      } else if (period === 'golden' || period === 'dusk' || period === 'blue' || period === 'night') {
        greetingEn = "Good evening, I'm";
        greetingVi = 'Chào buổi tối, tôi là';
      }

      return {
        ...time,
        phase,
        period,
        season,
        isWeekend,
        specialEvents,
        activeHoliday: specialEvents[0] || null,
        greetingEn,
        greetingVi,
      };
    }

    setOverrideHour(hour) {
      const d = new Date();
      const h = Math.floor(hour);
      const m = Math.floor((hour - h) * 60);
      d.setHours(h, m, 0, 0);
      this.overrideDate = d;
      Portfolio.screenAtmosphere?.applyAtmosphere(true);
    }

    setOverrideHoliday(holidayId) {
      this.overrideHolidayId = holidayId;
      Portfolio.screenAtmosphere?.applyAtmosphere(true);
    }

    setOverrideSeason(season) {
      this.overrideSeason = season;
      Portfolio.screenAtmosphere?.applyAtmosphere(true);
    }

    resetOverride() {
      this.overrideDate = null;
      this.overrideHolidayId = null;
      this.overrideSeason = null;
      Portfolio.screenAtmosphere?.applyAtmosphere(true);
    }
  }

  Portfolio.ambientCalendar = new AmbientCalendar();
})((window.Portfolio = window.Portfolio || {}));
