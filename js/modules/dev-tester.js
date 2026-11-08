/**
 * @file Interactive Developer & Tester Hub for Event-Driven VFX and Motion Systems.
 *
 * Provides a comprehensive on-screen control panel and Console API (Portfolio.test) to test:
 *  - ALL 40 Ambient Sky Surprises across 6 distinct categories (Festivals, Fireworks, Astronomy, Weather, Day, Flyby).
 *  - 10 Diurnal solar phases & lighting transitions across 24h.
 *  - Avatar dynamic rim lighting and contextual greeting.
 *  - Saigon tropical seasons (Rainy & Dry seasons).
 *  - Cursor Swarm VFX (Click Ripples, Builder Settle Shimmer, Swarm mode toggle).
 */
(function (Portfolio) {
  'use strict';

  let panelEl = null;
  let pillEl = null;
  let toastEl = null;
  let searchInputEl = null;
  let eventListEl = null;
  let sliderEl = null;
  let hourValueEl = null;
  let periodValueEl = null;
  let lockBtn = null;

  let activeTab = 'events'; // 'events' | 'time' | 'swarm'
  let activeFilter = 'all';

  const CATEGORIES = {
    all: 'Tất cả (40)',
    holiday: '🌸 Lễ Hội (4)',
    light: '🎆 Pháo Hoa & Light (7)',
    sky: '⭐ Thiên Văn & Trời (8)',
    weather: '🌧 Thời Tiết & Khí Hậu (6)',
    day: '🎈 Bầu Trời Ban Ngày (7)',
    flyby: '✈️ Máy Bay & Cánh Chim (8)',
  };

  const ALL_EVENTS = [
    // 1. Calendar & Cultural Holidays
    { id: 'tet', cat: 'holiday', icon: '🌸', label: 'Tết Sài Gòn: Hoa mai vàng & Đèn hoa đăng' },
    { id: 'nationalday', cat: 'holiday', icon: '🇻🇳', label: 'Quốc Khánh 2/9: Cờ Đỏ Sao Vàng rực sáng' },
    { id: 'midautumn', cat: 'holiday', icon: '🥮', label: 'Tết Trung Thu: Đêm Rằm & Đèn Lồng Cá Chép' },
    { id: 'newyear', cat: 'holiday', icon: '🎆', label: 'Đón Năm Mới: Đêm Giao Thừa Sài Gòn' },

    // 2. Fireworks & Light Shows
    { id: 'fireworks', cat: 'light', icon: '🎆', label: 'Pháo hoa trên sông Sài Gòn' },
    { id: 'grandshow', cat: 'light', icon: '🎇', label: 'Đêm đại tiệc pháo hoa' },
    { id: 'lanterns', cat: 'light', icon: '🏮', label: 'Thả đèn trời hoa đăng' },
    { id: 'drones', cat: 'light', icon: '🛸', label: 'Drone show nghệ thuật' },
    { id: 'landmark', cat: 'light', icon: '🏢', label: 'Landmark 81 trình diễn ánh sáng' },
    { id: 'lasers', cat: 'light', icon: '⚡', label: 'Laser show đại nhạc hội' },
    { id: 'searchlights', cat: 'light', icon: '🔦', label: 'Đèn pha quét trời đêm' },

    // 3. Astronomical Sky
    { id: 'shootingstar', cat: 'sky', icon: '⭐', label: 'Sao băng lướt qua' },
    { id: 'meteors', cat: 'sky', icon: '🌠', label: 'Mưa sao băng' },
    { id: 'satellite', cat: 'sky', icon: '🛰', label: 'Vệ tinh bay qua' },
    { id: 'comet', cat: 'sky', icon: '☄️', label: 'Sao chổi' },
    { id: 'eclipse', cat: 'sky', icon: '🌑', label: 'Nguyệt thực toàn phần' },
    { id: 'moonhalo', cat: 'sky', icon: '🌕', label: 'Quầng trăng huyền ảo' },
    { id: 'sundogs', cat: 'sky', icon: '☀️', label: 'Quầng mặt trời & mặt trời giả' },
    { id: 'sunrays', cat: 'sky', icon: '🌤', label: 'Tia nắng xuyên mây' },

    // 4. Weather & Climate
    { id: 'lightning', cat: 'weather', icon: '⚡', label: 'Tia chớp rạch trời' },
    { id: 'storm', cat: 'weather', icon: '⛈', label: 'Giông đêm nhiệt đới' },
    { id: 'shower', cat: 'weather', icon: '🌦', label: 'Mưa rào bất chợt' },
    { id: 'virga', cat: 'weather', icon: '🌧', label: 'Mưa xa cuối trời' },
    { id: 'fog', cat: 'weather', icon: '🌫', label: 'Sương sớm sông Sài Gòn' },
    { id: 'cloudshadows', cat: 'weather', icon: '☁️', label: 'Bóng mây trôi qua thành phố' },

    // 5. Daytime Life
    { id: 'balloons', cat: 'day', icon: '🎈', label: 'Khinh khí cầu ban ngày' },
    { id: 'balloonglow', cat: 'day', icon: '🔥', label: 'Khinh khí cầu thắp lửa' },
    { id: 'kites', cat: 'day', icon: '🪁', label: 'Thả diều trên sân thượng' },
    { id: 'party', cat: 'day', icon: '🎈', label: 'Chùm bóng bay rực rỡ' },
    { id: 'bubbles', cat: 'day', icon: '🫧', label: 'Bong bóng xà phòng ngũ sắc' },
    { id: 'seeds', cat: 'day', icon: '🍂', label: 'Mùa hoa dầu bay xoay tít' },
    { id: 'blossoms', cat: 'day', icon: '🌸', label: 'Hoa mai bay trong gió' },

    // 6. Aviation & Birds (Flyby)
    { id: 'landing', cat: 'flyby', icon: '🛬', label: 'Máy bay hạ cánh Tân Sơn Nhất' },
    { id: 'contrail', cat: 'flyby', icon: '✈️', label: 'Vệt khói máy bay' },
    { id: 'helicopter', cat: 'flyby', icon: '🚁', label: 'Trực thăng' },
    { id: 'banner', cat: 'flyby', icon: '📜', label: 'Máy bay kéo băng rôn' },
    { id: 'paperplane', cat: 'flyby', icon: '✈️', label: 'Máy bay giấy' },
    { id: 'birds', cat: 'flyby', icon: '🦅', label: 'Đàn chim bay chữ V' },
    { id: 'swallows', cat: 'flyby', icon: '🕊', label: 'Chim én lượn đón xuân' },
    { id: 'bats', cat: 'flyby', icon: '🦇', label: 'Dơi bay lúc chạng vạng' },
  ];

  const PERIOD_NAMES = {
    predawn: 'Rạng sáng (Pre-dawn)',
    sunrise: 'Bình minh (Sunrise)',
    morning: 'Buổi sáng (Morning)',
    noon: 'Buổi trưa (Solar Noon)',
    afternoon: 'Buổi chiều (Afternoon)',
    golden: 'Hoàng hôn vàng (Golden Hour)',
    dusk: 'Chập tối (Dusk / Twilight)',
    blue: 'Giờ xanh (Blue Hour)',
    night: 'Đêm (Night)',
    late: 'Đêm muộn (Late Night)',
  };

  function showToast(message, isSuccess = true) {
    if (!toastEl) return;
    toastEl.style.display = 'flex';
    toastEl.style.color = isSuccess ? '#34d399' : '#f87171';
    toastEl.style.background = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    toastEl.style.borderColor = isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    toastEl.innerHTML = `<span>${message}</span><span style="cursor:pointer; opacity:0.7;" onclick="this.parentElement.style.display='none'">✕</span>`;
  }

  function updateLockStatus() {
    if (!lockBtn) return;
    const isLocked = !!Portfolio.ambient?.locked;
    lockBtn.textContent = isLocked ? '🔒 Đã khóa: Rê chuột không thoát' : '🔓 Chưa khóa: Rê chuột sẽ thoát';
    lockBtn.classList.toggle('is-active', isLocked);
  }

  function updateStatusDisplay() {
    if (hourValueEl && periodValueEl) {
      const state = Portfolio.ambientCalendar?.getState();
      if (state) {
        const h = state.hours;
        const m = state.minutes.toString().padStart(2, '0');
        hourValueEl.textContent = `${h}:${m}`;
        periodValueEl.textContent = PERIOD_NAMES[state.period] || state.period;

        if (sliderEl && !document.activeElement?.isSameNode(sliderEl)) {
          sliderEl.value = state.decimalHour.toFixed(2);
        }
      }
    }
    updateLockStatus();
  }

  function renderEventItems() {
    if (!eventListEl) return;
    const query = (searchInputEl?.value || '').trim().toLowerCase();

    const filtered = ALL_EVENTS.filter((ev) => {
      const matchCat = activeFilter === 'all' || ev.cat === activeFilter;
      if (!matchCat) return false;
      if (!query) return true;
      return ev.id.toLowerCase().includes(query) || ev.label.toLowerCase().includes(query);
    });

    if (!filtered.length) {
      eventListEl.innerHTML = `<div style="text-align:center; padding: 20px; color: #94a3b8;">Không tìm thấy sự kiện nào khớp với "${query}"</div>`;
      return;
    }

    eventListEl.innerHTML = filtered
      .map(
        (ev) => `
        <div class="dev-tester-event-item" data-event-id="${ev.id}">
          <div class="dev-tester-event-item__left">
            <span class="dev-tester-event-item__icon">${ev.icon}</span>
            <span class="dev-tester-event-item__label">${ev.label}</span>
          </div>
          <span class="dev-tester-event-item__id">${ev.id}</span>
        </div>`,
      )
      .join('');

    eventListEl.querySelectorAll('[data-event-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.eventId;
        devTester.triggerAmbient(id);
      });
    });
  }

  function renderPanel() {
    if (panelEl) return;

    // 1. Floating pill button (shown when panel is closed)
    pillEl = document.createElement('button');
    pillEl.type = 'button';
    pillEl.className = 'dev-tester-pill';
    pillEl.title = 'Mở bảng điều khiển kiểm thử VFX & Sự kiện (Ctrl+Shift+D hoặc F2)';
    pillEl.innerHTML = '<span>🧪</span><span>Test Lab (40+ Events)</span>';
    pillEl.addEventListener('click', () => devTester.show());
    document.body.appendChild(pillEl);

    // 2. Main control panel
    panelEl = document.createElement('div');
    panelEl.className = 'dev-tester-panel';
    panelEl.hidden = true;
    panelEl.innerHTML = `
      <div class="dev-tester-panel__header">
        <div class="dev-tester-panel__title">
          <span>🧪</span>
          <span>VFX & Event Test Lab</span>
          <span class="dev-tester-panel__badge">40 Events</span>
        </div>
        <div class="dev-tester-panel__actions">
          <button type="button" class="dev-tester-panel__btn-icon" data-action="collapse" title="Thu gọn">−</button>
          <button type="button" class="dev-tester-panel__btn-icon" data-action="close" title="Đóng panel">✕</button>
        </div>
      </div>

      <!-- Toast Feedback Bar -->
      <div class="dev-tester-toast" id="devTesterToast" style="display: none;"></div>

      <!-- Navigation Tabs -->
      <div class="dev-tester-tabs">
        <button type="button" class="dev-tester-tab is-active" data-tab="events">✨ 40+ Sự Kiện</button>
        <button type="button" class="dev-tester-tab" data-tab="time">🌅 Giờ & Ánh Sáng</button>
        <button type="button" class="dev-tester-tab" data-tab="swarm">🖱 Swarm VFX</button>
      </div>

      <div class="dev-tester-panel__body">
        <!-- Persistent Ambient Quick Controls -->
        <div class="dev-tester-quick-bar">
          <button type="button" class="dev-tester-btn dev-tester-btn--primary" data-action="enter-ambient">✨ Vào Ambient</button>
          <button type="button" class="dev-tester-btn" data-action="exit-ambient">🚪 Thoát Ambient</button>
          <button type="button" class="dev-tester-btn" data-action="toggle-lock" id="devTesterLockBtn" style="grid-column: span 2;">🔒 Khóa: Rê chuột không thoát</button>
        </div>

        <!-- TAB 1: ALL 40+ EVENTS -->
        <div class="dev-tester-tab-content" id="devTesterTabEvents">
          <div class="dev-tester-section">
            <div class="dev-tester-section__title">
              <span>Tìm Kiếm & Lọc Sự Kiện</span>
              <button type="button" class="dev-tester-btn dev-tester-btn--primary" style="padding: 2px 8px; font-size: 11px;" data-action="random-event">🎲 Random Event</button>
            </div>
            <div class="dev-tester-search-wrap">
              <input type="text" class="dev-tester-search" id="devTesterSearch" placeholder="🔍 Tìm kiếm sự kiện (vd: pháo hoa, sao băng, tết, chim...)">
            </div>
            <div class="dev-tester-filter-pills">
              ${Object.entries(CATEGORIES)
                .map(
                  ([key, title]) =>
                    `<button type="button" class="dev-tester-filter-pill ${key === 'all' ? 'is-active' : ''}" data-filter="${key}">${title}</button>`,
                )
                .join('')}
            </div>
          </div>

          <div class="dev-tester-section" style="margin-top: 4px;">
            <div class="dev-tester-section__title">
              <span>Danh Sách Sự Kiện (Click để xem ngay)</span>
            </div>
            <div class="dev-tester-event-list" id="devTesterEventList"></div>
          </div>
        </div>

        <!-- TAB 2: TIME OF DAY & ATMOSPHERE -->
        <div class="dev-tester-tab-content" id="devTesterTabTime" style="display: none;">
          <div class="dev-tester-section">
            <div class="dev-tester-section__title">
              <span>🌅 Thời Gian Trong Ngày (0h - 24h)</span>
              <span class="dev-tester-section__value" id="devTesterHourDisplay">17:30</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: -4px;" id="devTesterPeriodDisplay">Hoàng hôn vàng</div>
            <div class="dev-tester-slider-wrap">
              <input type="range" class="dev-tester-slider" id="devTesterSlider" min="0" max="24" step="0.25" value="17.5">
            </div>
            <div class="dev-tester-btn-grid dev-tester-btn-grid--3">
              <button type="button" class="dev-tester-btn" data-hour="5">🌌 05:00</button>
              <button type="button" class="dev-tester-btn" data-hour="6">🌅 06:00</button>
              <button type="button" class="dev-tester-btn" data-hour="9">🌤 09:00</button>
              <button type="button" class="dev-tester-btn" data-hour="12">☀️ 12:00</button>
              <button type="button" class="dev-tester-btn" data-hour="15">🌤 15:00</button>
              <button type="button" class="dev-tester-btn" data-hour="17.5">🌇 17:30</button>
              <button type="button" class="dev-tester-btn" data-hour="18.5">🌆 18:30</button>
              <button type="button" class="dev-tester-btn" data-hour="19.5">🌌 19:30</button>
              <button type="button" class="dev-tester-btn" data-hour="21">🌙 21:00</button>
            </div>
          </div>

          <div class="dev-tester-section">
            <div class="dev-tester-section__title">
              <span>🌧 Mùa & Thời Tiết Sài Gòn</span>
            </div>
            <div class="dev-tester-btn-grid">
              <button type="button" class="dev-tester-btn" data-season="rainy">🌧 Mùa Mưa Sài Gòn</button>
              <button type="button" class="dev-tester-btn" data-season="dry">☀️ Mùa Khô Sài Gòn</button>
              <button type="button" class="dev-tester-btn dev-tester-btn--full" data-action="speed-40">⏩ Tua nhanh 1 ngày trong 60s</button>
            </div>
          </div>
        </div>

        <!-- TAB 3: CURSOR SWARM VFX -->
        <div class="dev-tester-section" id="devTesterTabSwarm" style="display: none;">
          <div class="dev-tester-section__title">
            <span>🖱 Con Trỏ & Hiệu Ứng Swarm</span>
          </div>
          <div class="dev-tester-btn-grid">
            <button type="button" class="dev-tester-btn" data-swarm="ripple">🌊 Click Shockwave Ripple</button>
            <button type="button" class="dev-tester-btn" data-swarm="settle">✨ Builder Settle Shimmer</button>
            <button type="button" class="dev-tester-btn dev-tester-btn--full" data-swarm="toggle">🌀 Bật / Tắt Chế Độ Swarm</button>
          </div>
        </div>

        <!-- Global Reset Button -->
        <button type="button" class="dev-tester-btn dev-tester-btn--danger dev-tester-btn--full" data-action="reset">
          🔄 Khôi Phục 100% Thời Gian Thực
        </button>
      </div>
    `;

    document.body.appendChild(panelEl);

    // Bind elements
    toastEl = panelEl.querySelector('#devTesterToast');
    sliderEl = panelEl.querySelector('#devTesterSlider');
    hourValueEl = panelEl.querySelector('#devTesterHourDisplay');
    periodValueEl = panelEl.querySelector('#devTesterPeriodDisplay');
    searchInputEl = panelEl.querySelector('#devTesterSearch');
    eventListEl = panelEl.querySelector('#devTesterEventList');
    lockBtn = panelEl.querySelector('#devTesterLockBtn');

    // Tab switching
    panelEl.querySelectorAll('[data-tab]').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        activeTab = tabBtn.dataset.tab;
        panelEl.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('is-active'));
        tabBtn.classList.add('is-active');

        panelEl.querySelector('#devTesterTabEvents').style.display =
          activeTab === 'events' ? 'block' : 'none';
        panelEl.querySelector('#devTesterTabTime').style.display = activeTab === 'time' ? 'block' : 'none';
        panelEl.querySelector('#devTesterTabSwarm').style.display = activeTab === 'swarm' ? 'block' : 'none';
      });
    });

    // Category filter pills
    panelEl.querySelectorAll('[data-filter]').forEach((pill) => {
      pill.addEventListener('click', () => {
        activeFilter = pill.dataset.filter;
        panelEl.querySelectorAll('[data-filter]').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        renderEventItems();
      });
    });

    // Search input
    searchInputEl.addEventListener('input', () => {
      renderEventItems();
    });

    // Actions
    panelEl.querySelector('[data-action="close"]').addEventListener('click', () => devTester.hide());
    panelEl.querySelector('[data-action="collapse"]').addEventListener('click', () => {
      panelEl.classList.toggle('is-collapsed');
    });

    panelEl.querySelector('[data-action="enter-ambient"]').addEventListener('click', () => {
      if (Portfolio.ambient) {
        Portfolio.ambient.locked = true;
        Portfolio.ambient.enter();
        showToast('✨ Đã vào Ambient mode (Đã khóa, rê chuột không thoát)');
        updateStatusDisplay();
      }
    });

    panelEl.querySelector('[data-action="exit-ambient"]').addEventListener('click', () => {
      if (Portfolio.ambient) {
        Portfolio.ambient.locked = false;
        Portfolio.ambient.exit();
        showToast('🚪 Đã thoát Ambient mode');
        updateStatusDisplay();
      }
    });

    panelEl.querySelector('[data-action="toggle-lock"]').addEventListener('click', () => {
      if (Portfolio.ambient) {
        Portfolio.ambient.locked = !Portfolio.ambient.locked;
        showToast(
          Portfolio.ambient.locked
            ? '🔒 Đã KHÓA: Di chuyển chuột không thoát màn hình'
            : '🔓 Đã MỞ KHÓA: Di chuyển chuột sẽ thoát màn hình',
        );
        updateStatusDisplay();
      }
    });

    panelEl.querySelector('[data-action="random-event"]').addEventListener('click', () => {
      devTester.randomEvent();
    });

    panelEl.querySelector('[data-action="speed-40"]').addEventListener('click', () => {
      window.location.search = '?ambient&speed=40&locked';
    });

    // Hour slider
    sliderEl.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      devTester.setHour(val);
      updateStatusDisplay();
    });

    panelEl.querySelectorAll('[data-hour]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = parseFloat(btn.dataset.hour);
        devTester.setHour(h);
        updateStatusDisplay();
      });
    });

    panelEl.querySelectorAll('[data-season]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.season;
        devTester.setSeason(s);
        showToast(`Đã chuyển sang ${s === 'rainy' ? '🌧 Mùa Mưa Sài Gòn' : '☀️ Mùa Khô Sài Gòn'}`);
      });
    });

    // Swarm buttons
    panelEl.querySelector('[data-swarm="ripple"]').addEventListener('click', () => {
      devTester.triggerRipple();
      showToast('🌊 Đã phát sóng xung kích (Click Ripple)');
    });

    panelEl.querySelector('[data-swarm="settle"]').addEventListener('click', () => {
      devTester.triggerSettle();
      showToast('✨ Đã phát hiệu ứng hạt lấp lánh (Settle Shimmer)');
    });

    panelEl.querySelector('[data-swarm="toggle"]').addEventListener('click', () => {
      Portfolio.swarm?.toggle();
      showToast('🌀 Đã bật / tắt Swarm con trỏ');
    });

    panelEl.querySelector('[data-action="reset"]').addEventListener('click', () => {
      devTester.reset();
      showToast('🔄 Đã khôi phục 100% thời gian thực');
      updateStatusDisplay();
    });

    renderEventItems();
    updateStatusDisplay();
  }

  const devTester = {
    show() {
      renderPanel();
      panelEl.hidden = false;
      if (pillEl) pillEl.hidden = true;
      updateStatusDisplay();
    },

    hide() {
      if (panelEl) panelEl.hidden = true;
      if (pillEl) pillEl.hidden = false;
    },

    toggle() {
      if (!panelEl || panelEl.hidden) {
        this.show();
      } else {
        this.hide();
      }
    },

    setHour(hour) {
      Portfolio.ambientCalendar?.setOverrideHour(hour);
      updateStatusDisplay();
    },

    setHoliday(holidayId) {
      Portfolio.ambientCalendar?.setOverrideHoliday(holidayId);
      updateStatusDisplay();
    },

    setSeason(season) {
      Portfolio.ambientCalendar?.setOverrideSeason(season);
      updateStatusDisplay();
    },

    reset() {
      Portfolio.ambientCalendar?.resetOverride();
      if (Portfolio.ambient) {
        Portfolio.ambient.locked = false;
      }
      updateStatusDisplay();
    },

    triggerAmbient(name) {
      if (Portfolio.ambient) {
        Portfolio.ambient.locked = true;
        Portfolio.ambient.enter();
      }

      // If it's one of the cultural holidays, also set calendar holiday
      const holidays = ['tet', 'nationalday', 'midautumn', 'newyear'];
      if (holidays.includes(name)) {
        Portfolio.ambientCalendar?.setOverrideHoliday(name);
      }

      const ok = Portfolio.ambient?.trigger(name);
      const ev = ALL_EVENTS.find((e) => e.id === name);
      const title = ev ? `${ev.icon} ${ev.label}` : name;

      if (ok) {
        showToast(`Đang diễn ra: ${title}`);
      } else {
        showToast(`Không thể kích hoạt: ${name}`, false);
      }

      updateStatusDisplay();
      return ok;
    },

    randomEvent() {
      const ev = ALL_EVENTS[Math.floor(Math.random() * ALL_EVENTS.length)];
      return this.triggerAmbient(ev.id);
    },

    triggerRipple(x = window.innerWidth / 2, y = window.innerHeight / 2, strength = 1.2) {
      Portfolio.swarmFlock?.addRipple(x, y, strength);
    },

    triggerSettle(x = window.innerWidth / 2, y = window.innerHeight / 2) {
      Portfolio.swarmFlock?.addSettle(x, y);
    },

    listEvents() {
      console.table(
        ALL_EVENTS.map((ev, index) => ({
          '#': index + 1,
          ID: ev.id,
          'Danh Mục': CATEGORIES[ev.cat] || ev.cat,
          'Tên Sự Kiện': `${ev.icon} ${ev.label}`,
          'Lệnh Console': `Portfolio.test.triggerAmbient('${ev.id}')`,
        })),
      );
      return ALL_EVENTS;
    },

    help() {
      console.log(
        `%c🧪 Portfolio Event & VFX Test Lab (40+ Events)
%cCác lệnh kiểm thử nhanh trong DevTools Console:

1. Kích hoạt bất kỳ sự kiện nào trong 40 sự kiện (Tự động khóa không thoát khi rê chuột):
   Portfolio.test.triggerAmbient('tet')           → Tết Sài Gòn: Hoa mai vàng & Đèn hoa đăng
   Portfolio.test.triggerAmbient('nationalday')   → Quốc Khánh 2/9: Cờ Đỏ Sao Vàng rực sáng
   Portfolio.test.triggerAmbient('midautumn')     → Tết Trung Thu: Trăng Rằm & Đèn Lồng Cá Chép
   Portfolio.test.triggerAmbient('newyear')       → Đêm Giao Thừa & Pháo hoa
   Portfolio.test.triggerAmbient('fireworks')     → Pháo hoa sông Sài Gòn
   Portfolio.test.triggerAmbient('grandshow')     → Đêm đại tiệc pháo hoa
   Portfolio.test.triggerAmbient('drones')        → Drone show nghệ thuật
   Portfolio.test.triggerAmbient('shootingstar')  → Sao băng lướt qua
   Portfolio.test.triggerAmbient('meteors')       → Mưa sao băng
   Portfolio.test.triggerAmbient('lightning')     → Tia chớp rạch trời
   Portfolio.test.triggerAmbient('storm')         → Giông đêm nhiệt đới
   Portfolio.test.triggerAmbient('balloons')      → Khinh khí cầu Thủ Thiêm
   Portfolio.test.triggerAmbient('kites')         → Thả diều sân thượng
   Portfolio.test.triggerAmbient('landing')       → Máy bay hạ cánh Tân Sơn Nhất
   Portfolio.test.listEvents()                    → In bảng danh sách toàn bộ 40 sự kiện

2. Đặt giờ trong ngày (0h - 24h) & ánh sáng màn hình:
   Portfolio.test.setHour(6)                      → Bình minh (06:00)
   Portfolio.test.setHour(12)                     → Buổi trưa (12:00)
   Portfolio.test.setHour(17.5)                   → Hoàng hôn vàng (17:30)
   Portfolio.test.setHour(21)                     → Đêm (21:00)

3. Điều khiển chung:
   Portfolio.test.showPanel()                     → Mở bảng điều khiển UI (Ctrl+Shift+D)
   Portfolio.test.randomEvent()                   → Bật ngẫu nhiên 1 trong 40 sự kiện
   Portfolio.test.reset()                         → Khôi phục 100% thời gian thực
`,
        'font-size: 14px; font-weight: bold; color: #38bdf8;',
        'font-size: 12px; color: #e2e8f0; line-height: 1.6;',
      );
    },

    init() {
      Portfolio.test = devTester;
      Portfolio.devTester = devTester;

      const params = new URLSearchParams(window.location.search);
      const isTestRequested = params.has('test') || params.has('debug');

      renderPanel();

      if (isTestRequested) {
        this.show();
      } else {
        this.hide();
      }

      // Hotkey: Ctrl + Shift + D or F2
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.shiftKey && e.code === 'KeyD') || e.key === 'F2') {
          e.preventDefault();
          this.toggle();
        }
      });

      console.log(
        '%c[Test Lab]%c Có sẵn %c40 sự kiện%c! Gõ %cPortfolio.test.help()%c hoặc bấm nút %c🧪 Test Lab%c (Ctrl+Shift+D) để thử nghiệm!',
        'color: #38bdf8; font-weight: bold;',
        'color: #94a3b8;',
        'color: #34d399; font-weight: bold;',
        'color: #94a3b8;',
        'color: #facc15; font-weight: bold;',
        'color: #94a3b8;',
        'color: #38bdf8; font-weight: bold;',
        'color: #94a3b8;',
      );
    },
  };

  Portfolio.devTester = devTester;
})((window.Portfolio = window.Portfolio || {}));
