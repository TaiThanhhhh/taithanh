/**
 * @file Test lab: try every ambient event, any date and any hour, from a panel or the console.
 *
 * - Events: the list comes from the registry (ambient-events.js), grouped like the
 *   files they live in; click one to play it now (ambient mode opens, locked so the
 *   pointer does not close it). Occasion events normally happen only on their day.
 * - Date & time: pick a date (Tết, 2/9, Trung thu...) and an hour; the calendar then
 *   behaves as if it were that moment in Saigon: occasions, lunar date, moon, live
 *   shows (e.g. 2026-09-02 at 21:00 plays the fireworks live).
 * - Swarm: the cursor swarm's effects.
 *
 * Opens with Ctrl+Shift+D / F2, the Test Lab button in the settings panel, or `?test`
 * (the floating button only shows then). Console: `Portfolio.test.help()`.
 */
(function (Portfolio) {
  'use strict';

  const GROUPS = {
    all: 'Tất cả',
    occasion: 'Lễ & dịp',
    night: 'Đêm',
    sky: 'Thiên văn',
    weather: 'Thời tiết',
    day: 'Ban ngày',
    flyby: 'Bay ngang',
  };

  /** Dates worth trying, with the hour their show happens (Saigon time). */
  const PRESETS = [
    { label: 'Giao thừa Tết Đinh Mùi', date: '2027-02-05', hour: 23.985 },
    { label: 'Mùng 1 Tết (sáng)', date: '2027-02-06', hour: 9 },
    { label: 'Giao thừa dương lịch', date: '2026-12-31', hour: 23.985 },
    { label: 'Noel', date: '2026-12-24', hour: 20 },
    { label: 'Quốc khánh 2/9 · 21:00', date: '2026-09-02', hour: 21.01 },
    { label: '30/4 · 21:00', date: '2027-04-30', hour: 21.01 },
    { label: 'Trung thu (rằm tháng 8)', date: '2026-09-25', hour: 20 },
    { label: 'Phật đản (rằm tháng 4)', date: '2027-05-20', hour: 20 },
    { label: 'Giờ Trái Đất', date: '2027-03-27', hour: 20.6 },
    { label: 'Mùa dầu bay (tháng 4)', date: '2027-04-12', hour: 10 },
    { label: 'Sương mù sáng mùa khô', date: '2027-01-10', hour: 6 },
    { label: 'Mưa sao băng Leonids', date: '2026-11-17', hour: 2 },
  ];

  const state = { panel: null, pill: null, toast: null, filter: 'all', tab: 'events', toastTimer: 0 };

  const esc = (text) =>
    String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function defs() {
    return Portfolio.AmbientEvents ? Portfolio.AmbientEvents.allDefs : [];
  }

  function toast(message, ok = true) {
    const el = state.toast;
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    el.style.color = ok ? '#34d399' : '#f87171';
    el.style.borderColor = ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    el.style.background = ok ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.style.display = 'none';
    }, 4000);
  }

  /* ---------- Rendering ---------- */

  function renderEvents() {
    const list = state.panel.querySelector('[data-list]');
    const query = state.panel.querySelector('[data-search]').value.trim().toLowerCase();
    const items = defs().filter(
      (d) =>
        (state.filter === 'all' || d.group === state.filter) &&
        (!query || d.name.includes(query) || d.label.toLowerCase().includes(query)),
    );
    list.innerHTML = items.length
      ? items
          .map(
            (d) => `
        <button type="button" class="dev-tester-event-item" data-event="${esc(d.name)}">
          <span class="dev-tester-event-item__left">
            <span class="dev-tester-event-item__label">${esc(d.label)}</span>
          </span>
          <span class="dev-tester-event-item__id">${esc(d.name)}${d.tier === 'detail' ? ' · nhỏ' : ''}${
            d.occasion ? ` · ${esc(d.occasion)}` : ''
          }</span>
        </button>`,
          )
          .join('')
      : `<div class="dev-tester-empty">Không có sự kiện nào khớp “${esc(query)}”.</div>`;
  }

  /** What the calendar says about the moment being simulated. */
  function renderStatus() {
    const el = state.panel && state.panel.querySelector('[data-status]');
    const cal = Portfolio.ambientCalendar;
    if (!el || !cal) return;
    const s = cal.getState();
    const pad = (n) => String(n).padStart(2, '0');
    const rows = [
      ['Giờ Sài Gòn', `${pad(s.hours)}:${pad(s.minutes)} · ${s.day}/${s.month}/${s.date.getFullYear()}`],
      [
        'Âm lịch',
        `${s.lunar.day}/${s.lunar.month}${s.lunar.leap ? ' (nhuận)' : ''} năm ${Portfolio.ambientFx?.canChi?.(s.lunar.year) || s.lunar.year}`,
      ],
      [
        'Trăng',
        `${Math.round(s.moon.illumination * 100)}% · ${s.moon.waxing ? 'trăng non → rằm' : 'sau rằm'}`,
      ],
      ['Mùa', s.season === 'rainy' ? 'Mùa mưa' : 'Mùa khô'],
      ['Dịp', s.occasions.map((o) => o.name).join(', ') || '—'],
      ['Đang diễn ra', s.live ? s.live.label : '—'],
    ];
    el.innerHTML = rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
    const lock = state.panel.querySelector('[data-action="lock"]');
    if (lock)
      lock.textContent = Portfolio.ambient?.locked ? '🔒 Khóa: rê chuột không thoát' : '🔓 Rê chuột sẽ thoát';
  }

  function render() {
    if (state.panel) return;
    state.pill = document.createElement('button');
    state.pill.type = 'button';
    state.pill.className = 'dev-tester-pill';
    state.pill.textContent = '🧪 Test Lab';
    state.pill.hidden = true;
    state.pill.addEventListener('click', () => api.show());
    document.body.appendChild(state.pill);

    const panel = document.createElement('div');
    panel.className = 'dev-tester-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="dev-tester-panel__header">
        <div class="dev-tester-panel__title"><span>🧪</span><span>Ambient Test Lab</span>
          <span class="dev-tester-panel__badge">${defs().length} sự kiện</span></div>
        <div class="dev-tester-panel__actions">
          <button type="button" class="dev-tester-panel__btn-icon" data-action="collapse" title="Thu gọn">−</button>
          <button type="button" class="dev-tester-panel__btn-icon" data-action="close" title="Đóng">✕</button>
        </div>
      </div>
      <div class="dev-tester-toast" style="display:none"></div>
      <div class="dev-tester-tabs">
        <button type="button" class="dev-tester-tab is-active" data-tab="events">Sự kiện</button>
        <button type="button" class="dev-tester-tab" data-tab="time">Ngày & giờ</button>
        <button type="button" class="dev-tester-tab" data-tab="swarm">Swarm</button>
      </div>
      <div class="dev-tester-panel__body">
        <div class="dev-tester-quick-bar">
          <button type="button" class="dev-tester-btn dev-tester-btn--primary" data-action="enter">Vào Ambient</button>
          <button type="button" class="dev-tester-btn" data-action="exit">Thoát Ambient</button>
          <button type="button" class="dev-tester-btn dev-tester-btn--full" data-action="lock"></button>
        </div>

        <div class="dev-tester-tab-content" data-content="events">
          <div class="dev-tester-section">
            <div class="dev-tester-section__title"><span>Chọn để phát ngay</span>
              <button type="button" class="dev-tester-btn dev-tester-btn--primary" data-action="random">Ngẫu nhiên</button></div>
            <div class="dev-tester-search-wrap">
              <input type="text" class="dev-tester-search" data-search placeholder="Tìm: pháo hoa, drone, sét, Tết...">
            </div>
            <div class="dev-tester-filter-pills">
              ${Object.entries(GROUPS)
                .map(
                  ([key, label]) =>
                    `<button type="button" class="dev-tester-filter-pill${key === 'all' ? ' is-active' : ''}" data-filter="${key}">${label}</button>`,
                )
                .join('')}
            </div>
          </div>
          <div class="dev-tester-event-list" data-list></div>
        </div>

        <div class="dev-tester-tab-content" data-content="time" hidden>
          <div class="dev-tester-section">
            <div class="dev-tester-section__title"><span>Lịch Sài Gòn đang mô phỏng</span></div>
            <div class="dev-tester-status" data-status></div>
          </div>
          <div class="dev-tester-section">
            <div class="dev-tester-section__title"><span>Ngày (dịp lễ theo ngày này)</span></div>
            <div class="dev-tester-btn-grid">
              <input type="date" class="dev-tester-search" data-date>
              <button type="button" class="dev-tester-btn" data-action="today">Hôm nay</button>
            </div>
            <div class="dev-tester-preset-list">
              ${PRESETS.map((p, i) => `<button type="button" class="dev-tester-btn" data-preset="${i}">${esc(p.label)}</button>`).join('')}
            </div>
          </div>
          <div class="dev-tester-section">
            <div class="dev-tester-section__title"><span>Giờ</span><span class="dev-tester-section__value" data-hour-value>—</span></div>
            <div class="dev-tester-slider-wrap">
              <input type="range" class="dev-tester-slider" data-hour min="0" max="23.99" step="0.05" value="12">
            </div>
            <div class="dev-tester-btn-grid dev-tester-btn-grid--3">
              ${[5.5, 6.2, 9, 12, 15.5, 17.5, 18.6, 19.6, 21]
                .map(
                  (h) =>
                    `<button type="button" class="dev-tester-btn" data-hour-preset="${h}">${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}</button>`,
                )
                .join('')}
            </div>
            <p class="dev-tester-note">Giờ chỉ đổi bầu trời khi bật <code>useRealTime</code>; còn không, ngày rút gọn tự chạy, nhưng dịp lễ và show trực tiếp vẫn theo ngày/giờ chọn ở đây.</p>
          </div>
          <div class="dev-tester-section">
            <div class="dev-tester-section__title"><span>Mùa</span></div>
            <div class="dev-tester-btn-grid">
              <button type="button" class="dev-tester-btn" data-season="rainy">Mùa mưa</button>
              <button type="button" class="dev-tester-btn" data-season="dry">Mùa khô</button>
            </div>
          </div>
          <button type="button" class="dev-tester-btn dev-tester-btn--danger dev-tester-btn--full" data-action="reset">Về thời gian thực</button>
        </div>

        <div class="dev-tester-tab-content" data-content="swarm" hidden>
          <div class="dev-tester-section">
            <div class="dev-tester-btn-grid">
              <button type="button" class="dev-tester-btn" data-swarm="ripple">Sóng click</button>
              <button type="button" class="dev-tester-btn" data-swarm="settle">Lấp lánh khi dựng xong</button>
              <button type="button" class="dev-tester-btn dev-tester-btn--full" data-swarm="toggle">Bật / tắt Swarm</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(panel);
    state.panel = panel;
    state.toast = panel.querySelector('.dev-tester-toast');

    panel.addEventListener('click', onClick);
    panel.querySelector('[data-search]').addEventListener('input', renderEvents);
    panel.querySelector('[data-hour]').addEventListener('input', (e) => api.setHour(Number(e.target.value)));
    panel
      .querySelector('[data-date]')
      .addEventListener('change', (e) => e.target.value && api.setDate(e.target.value));
    renderEvents();
    renderStatus();
  }

  function onClick(e) {
    const el = e.target.closest('button');
    if (!el) return;
    const { dataset } = el;
    if (dataset.tab) {
      state.tab = dataset.tab;
      state.panel.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b === el));
      state.panel.querySelectorAll('[data-content]').forEach((c) => {
        c.hidden = c.dataset.content !== state.tab;
      });
      renderStatus();
    } else if (dataset.filter) {
      state.filter = dataset.filter;
      state.panel.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('is-active', b === el));
      renderEvents();
    } else if (dataset.event) {
      api.trigger(dataset.event);
    } else if (dataset.preset) {
      const p = PRESETS[Number(dataset.preset)];
      api.setDate(p.date);
      api.setHour(p.hour);
      toast(`Đang mô phỏng: ${p.label}`);
    } else if (dataset.hourPreset) {
      api.setHour(Number(dataset.hourPreset));
    } else if (dataset.season) {
      Portfolio.ambientCalendar?.setOverrideSeason(dataset.season);
      toast(dataset.season === 'rainy' ? 'Mùa mưa' : 'Mùa khô');
    } else if (dataset.swarm === 'ripple') {
      Portfolio.swarmFlock?.addRipple?.(window.innerWidth / 2, window.innerHeight / 2, 1.2);
    } else if (dataset.swarm === 'settle') {
      Portfolio.swarmFlock?.addSettle?.(window.innerWidth / 2, window.innerHeight / 2);
    } else if (dataset.swarm === 'toggle') {
      Portfolio.swarm?.toggle?.();
    } else {
      const actions = {
        close: () => api.hide(),
        collapse: () => state.panel.classList.toggle('is-collapsed'),
        enter: () => {
          if (!Portfolio.ambient) return;
          Portfolio.ambient.locked = true;
          Portfolio.ambient.enter();
        },
        exit: () => {
          if (!Portfolio.ambient) return;
          Portfolio.ambient.locked = false;
          Portfolio.ambient.exit();
        },
        lock: () => {
          if (Portfolio.ambient) Portfolio.ambient.locked = !Portfolio.ambient.locked;
        },
        random: () => {
          const list = defs();
          api.trigger(list[Math.floor(Math.random() * list.length)].name);
        },
        today: () => {
          Portfolio.ambientCalendar?.setOverrideDate(null);
          toast('Hôm nay');
        },
        reset: () => api.reset(),
      };
      actions[dataset.action]?.();
    }
    renderStatus();
  }

  /* ---------- API (also Portfolio.test in the console) ---------- */

  const api = {
    show() {
      render();
      state.panel.hidden = false;
      state.pill.hidden = true;
      renderStatus();
    },

    hide() {
      if (!state.panel) return;
      state.panel.hidden = true;
      if (new URLSearchParams(window.location.search).has('test')) state.pill.hidden = false;
    },

    toggle() {
      if (!state.panel || state.panel.hidden) this.show();
      else this.hide();
    },

    /** Plays an event now (ambient mode opens, locked). */
    trigger(name) {
      const def = defs().find((d) => d.name === name);
      const ok = !!Portfolio.ambient?.trigger(name);
      toast(ok ? `Đang phát: ${def ? def.label : name}` : `Không phát được: ${name}`, ok);
      renderStatus();
      return ok;
    },

    /** @param {string|null} date 'YYYY-MM-DD' (Saigon), or null for today. */
    setDate(date) {
      Portfolio.ambientCalendar?.setOverrideDate(date);
      const input = state.panel?.querySelector('[data-date]');
      if (input && date) input.value = date;
      renderStatus();
    },

    setHour(hour) {
      Portfolio.ambientCalendar?.setOverrideHour(hour);
      const value = state.panel?.querySelector('[data-hour-value]');
      if (value)
        value.textContent = `${Math.floor(hour)}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;
      renderStatus();
    },

    /** Makes an occasion active today (e.g. 'tet', 'midautumn', 'nationalday'). */
    setOccasion(id) {
      Portfolio.ambientCalendar?.setOverrideHoliday(id);
      renderStatus();
    },

    reset() {
      Portfolio.ambientCalendar?.resetOverride();
      if (Portfolio.ambient) Portfolio.ambient.locked = false;
      const input = state.panel?.querySelector('[data-date]');
      if (input) input.value = '';
      toast('Đã về thời gian thực');
      renderStatus();
    },

    list(group = 'all') {
      const rows = defs().filter((d) => group === 'all' || d.group === group);
      console.table(
        rows.map((d) => ({
          name: d.name,
          label: d.label,
          group: d.group,
          tier: d.tier,
          occasion: d.occasion || '',
        })),
      );
      return rows;
    },

    help() {
      console.log(
        [
          'Portfolio.test.trigger("fireworks")      phát một sự kiện ngay',
          'Portfolio.test.list("occasion")          liệt kê sự kiện (all, occasion, night, sky, weather, day, flyby)',
          'Portfolio.test.setDate("2027-02-05")     mô phỏng một ngày (Saigon)',
          'Portfolio.test.setHour(23.985)           ...và một giờ (23:59 → đếm ngược giao thừa)',
          'Portfolio.test.setOccasion("midautumn")  bật một dịp hôm nay',
          'Portfolio.test.reset()                   về thời gian thực',
          'Portfolio.test.show()                    mở panel (Ctrl+Shift+D / F2)',
        ].join('\n'),
      );
    },

    init() {
      Portfolio.test = api;
      if (new URLSearchParams(window.location.search).has('test')) {
        render();
        this.show();
      }
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.shiftKey && e.code === 'KeyD') || e.key === 'F2') {
          e.preventDefault();
          this.toggle();
        }
      });
    },
  };

  // Names kept from the previous console API.
  api.triggerAmbient = api.trigger;
  api.listEvents = api.list;

  Portfolio.devTester = api;
})((window.Portfolio = window.Portfolio || {}));
