/**
 * @file Saigon calendar: the real date in Ho Chi Minh City, its lunar date, the moon,
 * the season and the occasions the city actually celebrates.
 *
 * - Lunar calendar: Ho Ngoc Duc's algorithm (UTC+7), the one Vietnamese calendars use,
 *   so Tết, Rằm tháng Giêng, Phật đản and Trung thu fall on their real days.
 * - Moon: its age follows the lunar day (full on the 15th/16th), waxing or waning.
 * - Seasons: rainy (May–Nov, storms in the afternoon), dry (Dec–Apr: clear, windy
 *   enough for kites, hazy mornings around Tết); April is the month the dầu seeds
 *   spin down from the trees, May the sao seeds.
 * - Occasions, with what Saigon really does: fireworks at 21:00–21:15 on 30/4 and 2/9,
 *   at midnight for New Year and Giao thừa; Noel lights; Earth Hour; the lantern
 *   street in Chợ Lớn before Trung thu; floating lanterns for Phật đản...
 * - Live shows: `live` names the show going on right now (Saigon time), so the
 *   ambient scene can play it at the very minute the city does.
 *
 * Times are Saigon wall-clock time whatever the visitor's time zone.
 */
(function (Portfolio) {
  'use strict';

  const TZ = 7;
  const DAY_MS = 86400000;

  /* ---------- Vietnamese lunar calendar (Ho Ngoc Duc, 2004) ---------- */

  const INT = Math.floor;

  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }

  /** Julian day of the k-th new moon after 1900-01-01 (astronomical algorithms, Meeus). */
  function newMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    c1 = c1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    c1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
    c1 = c1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    c1 = c1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    c1 = c1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    c1 = c1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltaT =
      T < -11
        ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
        : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return jd1 + c1 - deltaT;
  }

  /** Sun longitude at local midnight, as one of 12 sectors (0..11). */
  function sunSector(jdn) {
    const T = (jdn - 0.5 - TZ / 24 - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L -= Math.PI * 2 * INT(L / (Math.PI * 2));
    return INT((L / Math.PI) * 6);
  }

  const newMoonDay = (k) => INT(newMoon(k) + 0.5 + TZ / 24);

  function lunarMonth11(yy) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    const nm = newMoonDay(k);
    return sunSector(nm) >= 9 ? newMoonDay(k - 1) : nm;
  }

  function leapMonthOffset(a11) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let i = 1;
    let arc = sunSector(newMoonDay(k + i));
    let last;
    do {
      last = arc;
      i++;
      arc = sunSector(newMoonDay(k + i));
    } while (arc !== last && i < 14);
    return i - 1;
  }

  /** Solar date → lunar date {day, month, year, leap} (Vietnamese calendar, UTC+7). */
  function solarToLunar(dd, mm, yy) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = newMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = newMoonDay(k);
    let a11 = lunarMonth11(yy);
    let b11 = a11;
    let year;
    if (a11 >= monthStart) {
      year = yy;
      a11 = lunarMonth11(yy - 1);
    } else {
      year = yy + 1;
      b11 = lunarMonth11(yy + 1);
    }
    const day = dayNumber - monthStart + 1;
    const diff = INT((monthStart - a11) / 29);
    let leap = false;
    let month = diff + 11;
    if (b11 - a11 > 365) {
      const leapDiff = leapMonthOffset(a11);
      if (diff >= leapDiff) {
        month = diff + 10;
        if (diff === leapDiff) leap = true;
      }
    }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) year -= 1;
    return { day, month, year, leap };
  }

  /* ---------- Saigon time ---------- */

  /** A Date whose local fields read Saigon's wall clock, whatever the device's time zone. */
  function saigonNow(ms = Date.now()) {
    const d = new Date(ms);
    return new Date(ms + (TZ * 60 + d.getTimezoneOffset()) * 60000);
  }

  const shiftDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
  const lunarOf = (date) => solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());

  /** Peaks of the meteor showers (month, day), with the name the caption uses. */
  const METEOR_SHOWERS = [
    { month: 1, day: 3, name: 'Quadrantids' },
    { month: 4, day: 22, name: 'Lyrids' },
    { month: 5, day: 6, name: 'Eta Aquariids' },
    { month: 8, day: 12, name: 'Perseids' },
    { month: 10, day: 21, name: 'Orionids' },
    { month: 11, day: 17, name: 'Leonids' },
    { month: 12, day: 14, name: 'Geminids' },
  ];

  /** Earth Hour: a Saturday at the end of March, 20:30–21:30. */
  const isEarthHourDay = (date) => date.getMonth() === 2 && date.getDay() === 6 && date.getDate() >= 22;

  /**
   * Occasions of a Saigon day. Each: { id, name, peak?, ... }. `name` is what the home
   * page badge and the captions call it.
   * @param {Date} d Saigon wall-clock date.
   * @param {{day:number, month:number, leap:boolean}} lunar
   * @param {{day:number, month:number, leap:boolean}} lunarTomorrow
   * @param {{month:number, day:number}} [birthday]
   */
  function occasionsOf(d, lunar, lunarTomorrow, birthday) {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const list = [];
    const add = (id, name, extra = {}) => list.push({ id, name, ...extra });
    const lunarIs = (m, from, to = from) =>
      lunar.month === m && !lunar.leap && lunar.day >= from && lunar.day <= to;

    // Lunar New Year: from ông Táo (23 tháng Chạp) to the shops reopening (mùng 7).
    const lastDayOfYear = lunarTomorrow.month === 1 && lunarTomorrow.day === 1 && !lunarTomorrow.leap;
    if (lunarIs(12, 23, 30) || lunarIs(1, 1, 7)) {
      add('tet', 'Tết Nguyên Đán', {
        eve: lastDayOfYear,
        days: lunarIs(1, 1, 3),
        flowers: lunarIs(12, 26, 30) || lunarIs(1, 1, 5), // Nguyễn Huệ flower street, Bến Bình Đông
      });
    }
    if (lunarIs(1, 14, 15)) add('nguyentieu', 'Rằm tháng Giêng');
    if ((month === 12 && day === 31) || (month === 1 && day === 1)) add('newyear', 'Đón năm mới');
    if (month === 12 && day >= 15 && day <= 26) add('christmas', 'Giáng sinh', { peak: day >= 24 });
    if (isEarthHourDay(d)) add('earthhour', 'Giờ Trái Đất');
    if (month === 4 && day >= 29) add('reunification', 'Ngày Thống nhất 30/4', { peak: day === 30 });
    if (lunarIs(4, 14, 15)) add('vesak', 'Đại lễ Phật đản');
    if (month === 9 && day <= 2) add('nationalday', 'Quốc khánh 2/9', { peak: day === 2 });
    if (lunarIs(8, 1, 15)) add('midautumn', 'Tết Trung thu', { peak: lunar.day >= 14 });
    if (birthday && month === birthday.month && day === birthday.day) add('birthday', 'Sinh nhật Thanh Tài');
    const doy = Math.round((d - new Date(d.getFullYear(), 0, 1)) / DAY_MS) + 1;
    if (doy === 256) add('programmersday', 'Ngày Lập trình viên');
    METEOR_SHOWERS.forEach((m) => {
      const peak = new Date(d.getFullYear(), m.month - 1, m.day);
      if (Math.abs(d - peak) <= 1.5 * DAY_MS)
        add('meteorshower', `Mưa sao băng ${m.name}`, { shower: m.name });
    });
    return list;
  }

  /**
   * The show going on right now (Saigon time), if any:
   * { id, kind: 'fireworks'|'countdown'|'earthhour', label, endsAt (epoch ms) }.
   * @param {Date} d Saigon wall-clock date.
   */
  function liveAt(d, overrides) {
    const minutes = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const lunar = lunarOf(d);
    const lunarTomorrow = lunarOf(shiftDays(d, 1));
    const until = (h, m) => Date.now() + (h * 60 + m - minutes) * 60000;
    const forced = (id) => overrides.holiday === id;

    // Midnight shows: New Year (1/1) and Giao thừa (mùng 1 Tết), 00:00–00:15.
    const tetMidnight = lunar.month === 1 && lunar.day === 1 && !lunar.leap;
    if (minutes < 15 && (tetMidnight || (month === 1 && day === 1))) {
      return {
        id: tetMidnight ? 'tet' : 'newyear',
        kind: 'fireworks',
        label: tetMidnight ? 'Giao thừa: pháo hoa đón Tết' : 'Pháo hoa chào năm mới',
        endsAt: until(0, 15),
      };
    }
    // The last minute before them: a countdown on Landmark 81.
    const tetEve = lunarTomorrow.month === 1 && lunarTomorrow.day === 1 && !lunarTomorrow.leap;
    if (minutes >= 23 * 60 + 59 && (tetEve || (month === 12 && day === 31))) {
      return {
        id: tetEve ? 'tet' : 'newyear',
        kind: 'countdown',
        label: tetEve ? 'Đếm ngược giao thừa' : 'Đếm ngược năm mới',
        endsAt: until(24, 0),
      };
    }
    // 30/4 and 2/9: fireworks 21:00–21:15 across the city.
    if (minutes >= 21 * 60 && minutes < 21 * 60 + 15) {
      if ((month === 4 && day === 30) || forced('reunification')) {
        return { id: 'reunification', kind: 'fireworks', label: 'Pháo hoa mừng 30/4', endsAt: until(21, 15) };
      }
      if ((month === 9 && day === 2) || forced('nationalday')) {
        return {
          id: 'nationalday',
          kind: 'fireworks',
          label: 'Pháo hoa mừng Quốc khánh',
          endsAt: until(21, 15),
        };
      }
    }
    if (minutes >= 20 * 60 + 30 && minutes < 21 * 60 + 30 && (isEarthHourDay(d) || forced('earthhour'))) {
      return {
        id: 'earthhour',
        kind: 'earthhour',
        label: 'Giờ Trái Đất: thành phố tắt đèn',
        endsAt: until(21, 30),
      };
    }
    return null;
  }

  /* ---------- Day phases ---------- */

  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smoothstep = (x) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
  };
  const wrap01 = (x) => ((x % 1) + 1) % 1;

  /** Clock hour → phase of the ambient day (ambient-cycle.js keyframes), for the real-time mode. */
  const SOLAR_MILESTONES = [
    { hour: 5.0, phase: 0.58 },
    { hour: 6.0, phase: 0.63 },
    { hour: 8.5, phase: 0.72 },
    { hour: 12.0, phase: 0.82 },
    { hour: 15.5, phase: 0.93 },
    { hour: 17.5, phase: 0.0 },
    { hour: 18.25, phase: 0.08 },
    { hour: 19.25, phase: 0.15 },
    { hour: 21.0, phase: 0.22 },
    { hour: 25.5, phase: 0.45 }, // 01:30 the next day
  ];

  function periodOf(h) {
    if (h >= 4.5 && h < 5.75) return 'predawn';
    if (h >= 5.75 && h < 7) return 'sunrise';
    if (h >= 7 && h < 11.5) return 'morning';
    if (h >= 11.5 && h < 14) return 'noon';
    if (h >= 14 && h < 17) return 'afternoon';
    if (h >= 17 && h < 18.25) return 'golden';
    if (h >= 18.25 && h < 19.25) return 'dusk';
    if (h >= 19.25 && h < 21) return 'blue';
    if (h >= 21 || h < 1.5) return 'night';
    return 'late';
  }

  class AmbientCalendar {
    constructor() {
      this.config = {};
      /** Test lab: offset (ms) of the simulated clock, an occasion forced on, a season. */
      this.override = { offset: 0, holiday: null, season: null };
      this.cache = { key: '', state: null };
    }

    init() {
      this.config = Portfolio.config.calendar || {};
    }

    /** Saigon wall-clock now (shifted by the test lab's simulated clock, if set). */
    now() {
      return new Date(saigonNow().getTime() + this.override.offset);
    }

    getTimeComponents() {
      const d = this.now();
      const decimalHour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
      return {
        date: d,
        hours: d.getHours(),
        minutes: d.getMinutes(),
        seconds: d.getSeconds(),
        decimalHour,
        month: d.getMonth() + 1,
        day: d.getDate(),
        dayOfWeek: d.getDay(),
      };
    }

    /** Phase (0..1) of the ambient day for a clock hour, eased between milestones. */
    calculateDiurnalPhase(decimalHour) {
      const m = SOLAR_MILESTONES;
      const h = decimalHour < 17.5 ? decimalHour + 24 : decimalHour; // origin at golden hour
      let i = 0;
      while (i < m.length - 1 && m[i + 1].hour <= h) i++;
      const a = m[i];
      const b = m[(i + 1) % m.length];
      const h2 = b.hour < a.hour ? b.hour + 24 : b.hour;
      const p2 = b.phase < a.phase ? b.phase + 1 : b.phase;
      return wrap01(a.phase + (p2 - a.phase) * smoothstep((h - a.hour) / (h2 - a.hour || 1)));
    }

    /**
     * Everything about now in Saigon. Cached for a few seconds: the scene asks often,
     * the lunar conversion does not need to run every frame.
     */
    getState() {
      const key = `${Math.floor(Date.now() / 1000)}|${JSON.stringify(this.override)}`;
      if (this.cache.key === key) return this.cache.state;

      const time = this.getTimeComponents();
      const d = time.date;
      const tomorrow = shiftDays(d, 1);
      const lunar = lunarOf(d);
      const lunarTomorrow = lunarOf(tomorrow);
      const month = time.month;
      const birthday = this.config.birthday;

      let occasions = occasionsOf(d, lunar, lunarTomorrow, birthday);
      if (this.override.holiday && !occasions.some((o) => o.id === this.override.holiday)) {
        const probe = OCCASION_NAMES[this.override.holiday];
        occasions = [
          { id: this.override.holiday, name: probe || this.override.holiday, peak: true, forced: true },
          ...occasions,
        ];
      }
      const has = (id) => occasions.some((o) => o.id === id);

      const season = this.override.season || (month >= 5 && month <= 11 ? 'rainy' : 'dry');
      // Moon age in days (0 = new, ~14.8 = full), from the lunar day and the hour.
      const age = (lunar.day - 1 + time.decimalHour / 24 + 0.3) % 29.53;
      const illumination = (1 - Math.cos((age / 29.53) * Math.PI * 2)) / 2;
      const period = periodOf(time.decimalHour);

      const greetings = {
        morning: ["Good morning, I'm", 'Chào buổi sáng, tôi là'],
        afternoon: ["Good afternoon, I'm", 'Chào buổi chiều, tôi là'],
        evening: ["Good evening, I'm", 'Chào buổi tối, tôi là'],
        other: ["Hello, I'm", 'Xin chào, tôi là'],
      };
      const greet =
        period === 'sunrise' || period === 'morning'
          ? greetings.morning
          : period === 'noon' || period === 'afternoon'
            ? greetings.afternoon
            : ['golden', 'dusk', 'blue', 'night'].includes(period)
              ? greetings.evening
              : greetings.other;

      const state = {
        ...time,
        phase: this.calculateDiurnalPhase(time.decimalHour),
        period,
        lunar,
        season,
        /** Dầu seeds spin down in April, sao seeds in May. */
        seeds: month === 4 ? 'dau' : month === 5 ? 'sao' : null,
        /** Hazy, sometimes foggy mornings of the dry season around Tết. */
        haze: month === 12 || month <= 2,
        /** Afternoon wind of the dry season: kites over Thủ Thiêm. */
        windy: season === 'dry',
        isWeekend: time.dayOfWeek === 0 || time.dayOfWeek === 6,
        moon: { age, illumination, waxing: age < 14.77, full: illumination > 0.97 },
        occasions,
        has,
        live: liveAt(d, this.override),
        specialEvents: occasions,
        activeHoliday: occasions.find((o) => o.id !== 'meteorshower') || null,
        greetingEn: greet[0],
        greetingVi: greet[1],
      };
      this.cache = { key, state };
      return state;
    }

    /* ---------- Test lab overrides ---------- */

    applyOverride(patch) {
      Object.assign(this.override, patch);
      this.cache.key = '';
      Portfolio.screenAtmosphere?.applyAtmosphere(true);
    }

    /**
     * Moves the simulated clock to `date`; it then keeps running from there (so 23:59
     * counts down to midnight and the fireworks start, as on the night itself).
     */
    travelTo(date) {
      this.applyOverride({ offset: date.getTime() - saigonNow().getTime() });
    }

    setOverrideHour(hour) {
      const d = this.now();
      const seconds = Math.round(hour * 3600);
      d.setHours(Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60, 0);
      this.travelTo(d);
    }

    /** @param {string|Date|null} date 'YYYY-MM-DD' (Saigon), a Date, or null for today (keeps the hour). */
    setOverrideDate(date) {
      const cur = this.now();
      let d;
      if (date instanceof Date) {
        d = date;
      } else {
        const [y, m, dd] =
          typeof date === 'string'
            ? date.split('-').map(Number)
            : [saigonNow().getFullYear(), saigonNow().getMonth() + 1, saigonNow().getDate()];
        d = new Date(y, m - 1, dd, cur.getHours(), cur.getMinutes(), cur.getSeconds());
      }
      this.travelTo(d);
    }

    setOverrideHoliday(holiday) {
      this.applyOverride({ holiday });
    }

    setOverrideSeason(season) {
      this.applyOverride({ season });
    }

    resetOverride() {
      this.applyOverride({ offset: 0, holiday: null, season: null });
    }
  }

  /** Names for occasions forced from the test lab. */
  const OCCASION_NAMES = {
    tet: 'Tết Nguyên Đán',
    nguyentieu: 'Rằm tháng Giêng',
    newyear: 'Đón năm mới',
    christmas: 'Giáng sinh',
    earthhour: 'Giờ Trái Đất',
    reunification: 'Ngày Thống nhất 30/4',
    vesak: 'Đại lễ Phật đản',
    nationalday: 'Quốc khánh 2/9',
    midautumn: 'Tết Trung thu',
    birthday: 'Sinh nhật Thanh Tài',
    programmersday: 'Ngày Lập trình viên',
    meteorshower: 'Mưa sao băng',
  };

  AmbientCalendar.solarToLunar = solarToLunar;
  AmbientCalendar.occasionNames = OCCASION_NAMES;
  Portfolio.AmbientCalendar = AmbientCalendar;
  Portfolio.ambientCalendar = new AmbientCalendar();
})((window.Portfolio = window.Portfolio || {}));
