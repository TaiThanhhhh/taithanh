/**
 * @file Interactive Developer & Tester Hub for Event-Driven VFX and Motion Systems.
 *
 * Provides a comprehensive on-screen control panel and Console API (Portfolio.test) to test:
 *  - ALL 139 Ambient Sky Surprises across 7 distinct categories (Festivals, Fireworks, Astronomy, Weather, Day, Flyby, Cascades).
 *  - 250 Distinct Effect Variations across 10 physical and atmospheric domains.
 *  - 25 Formally defined Object-to-Object Physical & Optical Interactions.
 *  - Dynamic Wind Engine (speed, gust, turbulence) and Atmospheric Illumination Bus.
 *  - 10 Diurnal solar phases & lighting transitions across 24h.
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
  let varSearchInputEl = null;
  let varListEl = null;
  let sliderEl = null;
  let hourValueEl = null;
  let periodValueEl = null;
  let lockBtn = null;
  let windSliderEl = null;
  let windSpeedValueEl = null;

  let activeTab = 'events'; // 'events' | 'variations' | 'interactions' | 'time' | 'swarm'
  let activeFilter = 'all';
  let activeVarDomain = 'all';

  const CATEGORIES = {
    all: 'Tất cả (139)',
    holiday: '🌸 Lễ Hội & Văn Hóa (22)',
    cascade: '⚡ Chuỗi Đa Tầng (7)',
    light: '🎆 Pháo Hoa & Trình Diễn (26)',
    sky: '⭐ Thiên Văn & Khí Quyển (20)',
    weather: '🌧 Thời Tiết & Giông (20)',
    day: '🎈 Bầu Trời Ban Ngày (21)',
    flyby: '✈️ Cánh Bay & Sinh Vật (23)',
  };

  const VAR_DOMAINS = {
    all: 'Tất cả (250)',
    clouds: '☁️ Mây (25)',
    birds: '🦅 Chim & Boids (25)',
    fireworks: '🎆 Pháo Hoa (25)',
    aircraft: '✈️ Máy Bay (25)',
    paperplanes: '📄 Máy Bay Giấy (25)',
    falling_organics: '🍂 Rơi & Hoa Lá (25)',
    lightning: '⚡ Sét & Chớp (25)',
    celestial: '⭐ Thiên Văn (25)',
    kites_balloons: '🪁 Diều & Khí Cầu (25)',
    light_shows: '🔦 Ánh Sáng & Laser (25)',
  };

  // Complete registry of all 139 distinct, independently triggerable events
  const ALL_EVENTS = [
    { id: 'tet', cat: 'holiday', icon: '🌸', label: 'Tết Sài Gòn: Hoa mai vàng & Đèn hoa đăng' },
    { id: 'nationalday', cat: 'holiday', icon: '🇻🇳', label: 'Quốc Khánh 2/9: Cờ Đỏ Sao Vàng rực sáng' },
    { id: 'midautumn', cat: 'holiday', icon: '🥮', label: 'Tết Trung Thu: Đêm Rằm & Đèn Lồng Cá Chép' },
    { id: 'newyear', cat: 'holiday', icon: '🎆', label: 'Đón Năm Mới: Đêm Giao Thừa Sài Gòn' },
    { id: 'tet_countdown', cat: 'holiday', icon: '⏳', label: 'Đêm 30 Tết: Đếm ngược Giao Thừa Sài Gòn' },
    { id: 'tet_lion_dance', cat: 'holiday', icon: '🦁', label: 'Múa Lân Sư Rồng Phố Người Hoa Chợ Lớn' },
    { id: 'tet_calligraphy', cat: 'holiday', icon: '📜', label: 'Phố Ông Đồ: Mực Tàu & Giấy Đỏ Ngày Xuân' },
    {
      id: 'tet_flower_boat',
      cat: 'holiday',
      icon: '💐',
      label: 'Bến Bình Đông: Chợ Hoa Xuân Trên Bến Dưới Thuyền',
    },
    {
      id: 'nationalday_parade',
      cat: 'holiday',
      icon: '🚁',
      label: 'Quốc Khánh: Trực Thăng Kéo Cờ Đỏ Sao Vàng',
    },
    {
      id: 'nationalday_fireworks',
      cat: 'holiday',
      icon: '🎇',
      label: 'Quốc Khánh: Pháo Hoa Tầm Cao Hầm Thủ Thiêm',
    },
    {
      id: 'midautumn_mooncake',
      cat: 'holiday',
      icon: '🥮',
      label: 'Trung Thu: Đêm Hội Trăng Rằm Rước Đèn Ông Sao',
    },
    {
      id: 'midautumn_lantern_river',
      cat: 'holiday',
      icon: '🏮',
      label: 'Bến Bạch Đằng: Thả Hoa Đăng Sông Sài Gòn',
    },
    {
      id: 'newyear_river_lights',
      cat: 'holiday',
      icon: '🚢',
      label: 'Giao Thừa: Thuyền Hoa Rực Sáng Sông Sài Gòn',
    },
    { id: 'vesak', cat: 'holiday', icon: '🪷', label: 'Đại Lễ Phật Đản: Hoa Sen Nở Rộ Kênh Nhiêu Lộc' },
    {
      id: 'southern_fruit',
      cat: 'holiday',
      icon: '🍉',
      label: 'Lễ Hội Trái Cây Nam Bộ: Sắc Màu Phù Sa Sài Gòn',
    },
    {
      id: 'ao_dai_festival',
      cat: 'holiday',
      icon: '👘',
      label: 'Lễ Hội Áo Dài: Phố Đi Bộ Nguyễn Huệ Rực Rỡ',
    },
    {
      id: 'saigon_street_food',
      cat: 'holiday',
      icon: '🍲',
      label: 'Chợ Đêm Bến Thành: Khói Thơm & Ánh Đèn Vàng',
    },
    {
      id: 'vietnam_teachers_day',
      cat: 'holiday',
      icon: '💐',
      label: 'Ngày Nhà Giáo 20/11: Hoa Điểm 10 & Tri Ân',
    },
    {
      id: 'programmers_day',
      cat: 'holiday',
      icon: '💻',
      label: 'Ngày Lập Trình Viên (Ngày 256): Dòng Code Ma Trận',
    },
    { id: 'weekend_kite', cat: 'holiday', icon: '🪁', label: 'Cuối Tuần: Lộng Gió Thả Diều Thủ Thiêm' },
    {
      id: 'weekend_acoustic',
      cat: 'holiday',
      icon: '🎸',
      label: 'Cuối Tuần: Đêm Nhạc Acoustic Bờ Sông Sài Gòn',
    },
    {
      id: 'independence_day_april',
      cat: 'holiday',
      icon: '🕊️',
      label: 'Kỷ Niệm 30/4: Non Sông Liền Một Dải Sài Gòn',
    },
    {
      id: 'cascade_thunderstorm',
      cat: 'cascade',
      isCascade: true,
      icon: '⛈️',
      label: 'Chuỗi Giông Bão Đa Tầng: Mây Đen → Gió Giật → Chớp → Mưa Rào → Cầu Vồng',
    },
    {
      id: 'cascade_newyear_eve',
      cat: 'cascade',
      isCascade: true,
      icon: '🎆',
      label: 'Chuỗi Đại Tiệc Giao Thừa: Đếm Ngược → Pháo Hoa → Liễu Rủ → Đèn Trời',
    },
    {
      id: 'cascade_tet_morning',
      cat: 'cascade',
      isCascade: true,
      icon: '🌸',
      label: 'Chuỗi Sáng Mùng 1 Tết: Nắng Vàng → Hoa Mai Bay → Én Lượn → Đèn Hoa Đăng',
    },
    {
      id: 'cascade_twilight_flight',
      cat: 'cascade',
      isCascade: true,
      icon: '🌇',
      label: 'Chuỗi Hoàng Hôn Sông Sài Gòn: Mặt Trời Lặn → Tia Nắng → Diều Bay → Dơi → Đèn Phố',
    },
    {
      id: 'cascade_drone_laser',
      cat: 'cascade',
      isCascade: true,
      icon: '🛸',
      label: 'Chuỗi Đại Nhạc Hội Ánh Sáng: Đèn Pha → Laser Đa Sắc → Drone Show Nghệ Thuật',
    },
    {
      id: 'cascade_national_celebration',
      cat: 'cascade',
      isCascade: true,
      icon: '🇻🇳',
      label: 'Chuỗi Quốc Khánh 2/9: Trực Thăng Kéo Cờ → Landmark 81 Cờ Đỏ → Pháo Hoa',
    },
    { id: 'fireworks', cat: 'light', icon: '🎆', label: 'Pháo hoa trên sông Sài Gòn' },
    { id: 'grandshow', cat: 'light', icon: '🎇', label: 'Đêm pháo hoa lớn' },
    { id: 'lanterns', cat: 'light', icon: '🏮', label: 'Thả đèn trời' },
    { id: 'drones', cat: 'light', icon: '🛸', label: 'Drone show' },
    { id: 'landmark', cat: 'light', icon: '🏢', label: 'Landmark 81 trình diễn ánh sáng' },
    { id: 'lasers', cat: 'light', icon: '⚡', label: 'Laser show' },
    { id: 'searchlights', cat: 'light', icon: '🔦', label: 'Đèn pha quét trời' },
    { id: 'fireworks_willow', cat: 'light', icon: '🌿', label: 'Pháo Hoa Liễu Rủ Vàng Kim (Kamuro Willow)' },
    { id: 'fireworks_palm', cat: 'light', icon: '🌴', label: 'Pháo Hoa Cành Cọ Nam Bộ (Palm Tree Burst)' },
    {
      id: 'fireworks_crossette',
      cat: 'light',
      icon: '✚',
      label: 'Pháo Hoa Tách Nhánh Chữ Thập (Crossette Split)',
    },
    {
      id: 'fireworks_ring',
      cat: 'light',
      icon: '⭕',
      label: 'Pháo Hoa Vòng Tròn Đồng Tâm Kép (Ring in Ring)',
    },
    {
      id: 'fireworks_heart',
      cat: 'light',
      icon: '💖',
      label: 'Pháo Hoa Trái Tim Tình Yêu Sài Gòn (Heart Shell)',
    },
    {
      id: 'fireworks_water',
      cat: 'light',
      icon: '🌊',
      label: 'Pháo Hoa Mặt Nước Sông Sài Gòn (Aquatic Cakes)',
    },
    {
      id: 'fireworks_comet_tails',
      cat: 'light',
      icon: '☄️',
      label: 'Loạt Pháo Sao Chổi Đuôi Vàng Rực Sáng (Comet Tails)',
    },
    {
      id: 'fireworks_whistle',
      cat: 'light',
      icon: '🚀',
      label: 'Pháo Tên Lửa Rít Gió Xoắn Ốc (Whistling Rockets)',
    },
    {
      id: 'fireworks_brocade',
      cat: 'light',
      icon: '✨',
      label: 'Pháo Hoa Gấm Thêu Hoàng Gia (Brocade Crown)',
    },
    {
      id: 'fireworks_waterfall',
      cat: 'light',
      icon: '🌊',
      label: 'Thác Nước Ánh Sáng Cầu Ba Son (Niagara Falls)',
    },
    {
      id: 'lantern_flotilla',
      cat: 'light',
      icon: '🏮',
      label: 'Đoàn Hoa Đăng Trôi Dạt Sông Sài Gòn (Flotilla)',
    },
    { id: 'drones_vietnam', cat: 'light', icon: '🇻🇳', label: 'Drone Show: Bản Đồ Việt Nam & Cờ Đỏ Sao Vàng' },
    { id: 'drones_lotus', cat: 'light', icon: '🪷', label: 'Drone Show: Đóa Hoa Sen Khổng Lồ Phát Sáng' },
    {
      id: 'drones_code',
      cat: 'light',
      icon: '💻',
      label: 'Drone Show: Dòng Lệnh Lập Trình </> Thắp Sáng Trời Đêm',
    },
    {
      id: 'landmark_equalizer',
      cat: 'light',
      icon: '📊',
      label: 'Landmark 81: Dải Sóng Âm Nhạc Sống Động (Audio Equalizer)',
    },
    {
      id: 'landmark_waterfall',
      cat: 'light',
      icon: '💧',
      label: 'Landmark 81: Thác Nước Ánh Sáng Xanh Ngọc Đổ Xuống',
    },
    { id: 'laser_cross', cat: 'light', icon: '❌', label: 'Laser Show: Chùm Laser Đan Chéo Bầu Trời Đêm' },
    {
      id: 'searchlights_skyline',
      cat: 'light',
      icon: '🔦',
      label: 'Dàn Đèn Pha 6 Luồng Quét Đồng Nhịp Chân Trời',
    },
    {
      id: 'bitexco_light',
      cat: 'light',
      icon: '🗼',
      label: 'Tòa Tháp Bitexco: Búp Sen Thắp Sáng Sân Đỗ Trực Thăng',
    },
    { id: 'meteors', cat: 'sky', icon: '🌠', label: 'Mưa sao băng' },
    { id: 'shootingstar', cat: 'sky', icon: '⭐', label: 'Sao băng' },
    { id: 'satellite', cat: 'sky', icon: '🛰️', label: 'Vệ tinh bay qua' },
    { id: 'comet', cat: 'sky', icon: '☄️', label: 'Sao chổi' },
    { id: 'eclipse', cat: 'sky', icon: '🌑', label: 'Nguyệt thực toàn phần' },
    { id: 'moonhalo', cat: 'sky', icon: '🌕', label: 'Quầng trăng' },
    { id: 'sundogs', cat: 'sky', icon: '☀️', label: 'Quầng mặt trời và mặt trời giả' },
    { id: 'sunrays', cat: 'sky', icon: '🌤️', label: 'Tia nắng xuyên mây' },
    {
      id: 'bolide_fireball',
      cat: 'sky',
      icon: '💥',
      label: 'Cầu Lửa Thiên Thạch Bùng Nổ Trên Không (Bolide)',
    },
    { id: 'iss_pass', cat: 'sky', icon: '🛰️', label: 'Trạm Vũ Trụ Quốc Tế ISS Bay Qua Bầu Trời Sài Gòn' },
    { id: 'starlink_train', cat: 'sky', icon: '🚂', label: 'Chuỗi Vệ Tinh Starlink Nối Đuôi Bay Thẳng Hàng' },
    { id: 'comet_twin', cat: 'sky', icon: '☄️', label: 'Sao Chổi Đuôi Kép: Khí Ion Xanh & Bụi Vàng' },
    {
      id: 'solar_eclipse',
      cat: 'sky',
      icon: '🌑',
      label: 'Nhật Thực Hình Khuyên: Vòng Tròn Lửa (Ring of Fire)',
    },
    {
      id: 'anticrepuscular',
      cat: 'sky',
      icon: '🌤️',
      label: 'Tia Nắng Ngược Đối Nhật (Anticrepuscular Rays)',
    },
    {
      id: 'belt_of_venus',
      cat: 'sky',
      icon: '🌄',
      label: 'Vành Đai Sao Kim Hồng Tím Hoàng Hôn (Belt of Venus)',
    },
    { id: 'green_flash', cat: 'sky', icon: '💚', label: 'Tia Chớp Xanh Lục Hoàng Hôn Sài Gòn (Green Flash)' },
    { id: 'milkyway_rise', cat: 'sky', icon: '🌌', label: 'Dải Ngân Hà Tuyệt Mỹ Đêm Sài Gòn (Milky Way)' },
    {
      id: 'zodiacal_light',
      cat: 'sky',
      icon: '📐',
      label: 'Ánh Sáng Hoàng Đạo Hình Tháp Rạng Đông (Zodiacal Light)',
    },
    { id: 'supermoon', cat: 'sky', icon: '🌕', label: 'Siêu Trăng Tròn Khổng Lồ Mọc Trên Sông Sài Gòn' },
    {
      id: 'aurora_equator',
      cat: 'sky',
      icon: '🌌',
      label: 'Hiện Tượng Cực Quang Bão Từ Huyền Ảo (Aurora Borealis)',
    },
    { id: 'lightning', cat: 'weather', icon: '⚡', label: 'Chớp xa' },
    { id: 'storm', cat: 'weather', icon: '⛈️', label: 'Giông đêm' },
    { id: 'shower', cat: 'weather', icon: '🌦️', label: 'Mưa rào bất chợt' },
    { id: 'virga', cat: 'weather', icon: '🌧️', label: 'Mưa xa cuối trời' },
    { id: 'fog', cat: 'weather', icon: '🌫️', label: 'Sương sớm' },
    { id: 'cloudshadows', cat: 'weather', icon: '☁️', label: 'Bóng mây trôi qua thành phố' },
    {
      id: 'lightning_fork',
      cat: 'weather',
      icon: '⚡',
      label: 'Tia Sét Phân Nhánh Rễ Cây Đa Tầng (Forked Lightning)',
    },
    {
      id: 'lightning_sheet',
      cat: 'weather',
      icon: '💡',
      label: 'Chớp Nội Bộ Tán Mây Rực Sáng (Sheet Lightning)',
    },
    {
      id: 'heavy_rain',
      cat: 'weather',
      icon: '🌧️',
      label: 'Cơn Mưa Rào Xối Xả Mùa Mưa Sài Gòn (Heavy Downpour)',
    },
    { id: 'drizzle', cat: 'weather', icon: '🌦️', label: 'Mưa Phùn Bay Lất Phất Se Lạnh (Saigon Drizzle)' },
    { id: 'sun_shower', cat: 'weather', icon: '🌦️', label: 'Mưa Bóng Mây Nắng Vàng Rực Rỡ (Sun Shower)' },
    { id: 'rainbow', cat: 'weather', icon: '🌈', label: 'Cầu Vồng 7 Sắc Rực Rỡ Sau Mưa (42deg Rainbow Arc)' },
    {
      id: 'double_rainbow',
      cat: 'weather',
      icon: '🌈',
      label: 'Hiện Tượng Cầu Vồng Đôi Hiếm Gặp (Double Rainbow)',
    },
    {
      id: 'river_mist',
      cat: 'weather',
      icon: '🌫️',
      label: 'Làn Sương Giăng Nhẹ Mặt Nước Sông Sài Gòn (River Mist)',
    },
    {
      id: 'heat_haze',
      cat: 'weather',
      icon: '♨️',
      label: 'Ảo Ảnh Không Khí Nắng Nóng Bốc Hơi (Heat Haze Mirage)',
    },
    {
      id: 'cumulonimbus',
      cat: 'weather',
      icon: '🌩️',
      label: 'Đám Mây Vũ Tích Khổng Lồ Hình Đe (Cumulonimbus Anvil)',
    },
    {
      id: 'mammatus',
      cat: 'weather',
      icon: '☁️',
      label: 'Đám Mây Dạng Túi Vú Kỳ Vĩ (Mammatus Cloud Pouches)',
    },
    {
      id: 'golden_clouds',
      cat: 'weather',
      icon: '🌤️',
      label: 'Mây Ngũ Sắc Tán Xạ Ánh Nắng Hoàng Hôn (Golden Clouds)',
    },
    {
      id: 'twilight_haze',
      cat: 'weather',
      icon: '🌁',
      label: 'Màn Khói Sương Lam Chiều Hoàng Hôn (Twilight Haze)',
    },
    { id: 'gust_wind', cat: 'weather', icon: '💨', label: 'Đợt Gió Giật Xào Xạc Mùa Mưa (Sudden Wind Gust)' },
    {
      id: 'storm_cascade',
      cat: 'cascade',
      isCascade: true,
      icon: '⛈️',
      label: 'Chuỗi Giông Bão: Gió Giật → Mây Đen → Sét Đánh → Mưa Rào',
    },
    { id: 'balloons', cat: 'day', icon: '🎈', label: 'Khinh khí cầu' },
    { id: 'balloonglow', cat: 'day', icon: '🔥', label: 'Khinh khí cầu thắp lửa' },
    { id: 'kites', cat: 'day', icon: '🪁', label: 'Thả diều trên sân thượng' },
    { id: 'party', cat: 'day', icon: '🎈', label: 'Chùm bóng bay' },
    { id: 'bubbles', cat: 'day', icon: '🫧', label: 'Bong bóng xà phòng' },
    { id: 'seeds', cat: 'day', icon: '🍂', label: 'Mùa hoa dầu bay' },
    { id: 'blossoms', cat: 'day', icon: '🌸', label: 'Hoa mai bay trong gió' },
    { id: 'balloon_fleet', cat: 'day', icon: '🎈', label: 'Đội Khinh Khí Cầu 3 Chiếc Bay Thủ Thiêm' },
    { id: 'kite_flute', cat: 'day', icon: '🪁', label: 'Diều Sáo Truyền Thống Ngân Vang Chiều Sài Gòn' },
    { id: 'kite_led', cat: 'day', icon: '🪁', label: 'Cánh Diều LED Rực Rỡ Đêm Công Viên Thủ Thiêm' },
    { id: 'heart_balloons', cat: 'day', icon: '💖', label: 'Chùm Bóng Bay Trái Tim Đỏ Bay Lên Trời' },
    { id: 'giant_bubble', cat: 'day', icon: '🫧', label: 'Bong Bóng Khổng Lồ Biến Dạng Trong Gió' },
    {
      id: 'seed_whirlwind',
      cat: 'day',
      icon: '🌪️',
      label: 'Cơn Lốc Cuốn Hoa Dầu Xoay Tròn (Seed Whirlwind)',
    },
    { id: 'peach_blossoms', cat: 'day', icon: '🌸', label: 'Cánh Hoa Đào Hồng Phai Bay Lượn Ngày Tết' },
    { id: 'bougainvillea', cat: 'day', icon: '🌺', label: 'Cánh Hoa Giấy Rụng Bay La Đà Mái Hiên Sài Gòn' },
    { id: 'autumn_leaves', cat: 'day', icon: '🍁', label: 'Lá Vàng Rơi Xào Xạc Đường Trương Định Sài Gòn' },
    { id: 'water_taxi', cat: 'day', icon: '🚤', label: 'Tàu Buýt Sông Sài Gòn (Saigon Waterbus) Rẽ Sóng' },
    { id: 'fireflies', cat: 'day', icon: '💫', label: 'Đàn Đom Đóm Lập Lòe Bờ Sông Thanh Đa Sài Gòn' },
    { id: 'pigeons_park', cat: 'day', icon: '🕊️', label: 'Đàn Bồ Câu Tung Cánh Công Viên Nhà Thờ Đức Bà' },
    { id: 'street_lanterns', cat: 'day', icon: '🏮', label: 'Phố Lồng Đèn Lương Nhữ Học Bừng Sáng Chợ Lớn' },
    { id: 'wind_chimes', cat: 'day', icon: '🎐', label: 'Tiếng Chuông Gió Đung Đưa Ban Công Buổi Sáng' },
    { id: 'contrail', cat: 'flyby', icon: '✈️', label: 'Vệt khói máy bay' },
    { id: 'birds', cat: 'flyby', icon: '🦅', label: 'Đàn chim bay chữ V' },
    { id: 'landing', cat: 'flyby', icon: '🛬', label: 'Máy bay hạ cánh Tân Sơn Nhất' },
    { id: 'helicopter', cat: 'flyby', icon: '🚁', label: 'Trực thăng' },
    { id: 'bats', cat: 'flyby', icon: '🦇', label: 'Dơi bay lúc chạng vạng' },
    { id: 'swallows', cat: 'flyby', icon: '🕊️', label: 'Chim én lượn' },
    { id: 'paperplane', cat: 'flyby', icon: '✈️', label: 'Máy bay giấy' },
    { id: 'banner', cat: 'flyby', icon: '📜', label: 'Máy bay kéo băng rôn' },
    { id: 'takeoff', cat: 'flyby', icon: '🛫', label: 'Máy Bay Cất Cánh Tân Sơn Nhất Lên Tầng Mây' },
    { id: 'widebody', cat: 'flyby', icon: '✈️', label: 'Máy Bay Thân Rộng Airbus A350 Lướt Qua Bầu Trời' },
    {
      id: 'night_flight',
      cat: 'flyby',
      icon: '🔴',
      label: 'Chuyến Bay Đêm Đèn Nhấp Nháy Định Vị Xuyên Màn Đêm',
    },
    {
      id: 'contrail_sunset',
      cat: 'flyby',
      icon: '🌇',
      label: 'Vệt Khói Phản Lực Nhuộm Vàng Cam Lúc Hoàng Hôn',
    },
    { id: 'contrail_cross', cat: 'flyby', icon: '✖️', label: 'Hai Vệt Khói Máy Bay Giao Nhau Hình Chữ X' },
    {
      id: 'helicopter_searchlight',
      cat: 'flyby',
      icon: '🔦',
      label: 'Trực Thăng Rọi Đèn Pha Tuần Tra Đêm Trên Sông Sài Gòn',
    },
    { id: 'banner_custom', cat: 'flyby', icon: '📜', label: 'banner_custom' },
    {
      id: 'paperplane_loop',
      cat: 'flyby',
      icon: '🔄',
      label: 'Máy Bay Giấy Nhào Lộn Vòng Cung Điệu Nghệ (Loop-the-Loop)',
    },
    {
      id: 'paperplane_trio',
      cat: 'flyby',
      icon: '✈️',
      label: 'Bộ Ba Máy Bay Giấy Tuổi Thơ Đua Nhau Bay Lượn',
    },
    { id: 'birds_glide', cat: 'flyby', icon: '🦅', label: 'Đàn Chim Chao Liệng Cánh Đón Luồng Gió Chiều' },
    { id: 'birds_scatter', cat: 'flyby', icon: '💥', label: 'Đàn Chim Giật Mình Tản Mác Khi Có Tiếng Động' },
    { id: 'swallows_dive', cat: 'flyby', icon: '⚡', label: 'Chim Én Sà Sát Mặt Nước Bắt Mồi Chiều Muộn' },
    {
      id: 'bats_swarm',
      cat: 'flyby',
      icon: '🦇',
      label: 'Đàn Dơi Đông Đúc Bay Tỏa Khắp Bầu Trời Chạng Vạng',
    },
    { id: 'sparrow_perch', cat: 'flyby', icon: '🐦', label: 'Đàn Chim Sẻ Ríu Rít Sà Xuống Mái Phố' },
    { id: 'sea_eagle', cat: 'flyby', icon: '🦅', label: 'Đại Bàng Biển Dang Rộng Cánh Xoay Vòng Trên Sông' },
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

    if (windSpeedValueEl && Portfolio.ambientEnvironment?.wind) {
      const w = Portfolio.ambientEnvironment.wind.currentSpeed;
      windSpeedValueEl.textContent = `${w >= 0 ? '+' : ''}${w.toFixed(2)} px/f`;
    }

    updateLockStatus();
  }

  function renderEventItems() {
    if (!eventListEl) return;
    const query = (searchInputEl?.value || '').trim().toLowerCase();

    const filtered = ALL_EVENTS.filter((ev) => {
      const matchCat =
        activeFilter === 'all' || ev.cat === activeFilter || (activeFilter === 'cascade' && ev.isCascade);
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

  function renderVariationItems() {
    if (!varListEl) return;
    const catalog = Portfolio.ambientEnvironment?.variationsCatalog || [];
    const query = (varSearchInputEl?.value || '').trim().toLowerCase();

    const filtered = catalog.filter((v) => {
      const matchDomain = activeVarDomain === 'all' || v.cat === activeVarDomain;
      if (!matchDomain) return false;
      if (!query) return true;
      return (
        v.id.toLowerCase().includes(query) ||
        v.name.toLowerCase().includes(query) ||
        v.object.toLowerCase().includes(query) ||
        v.behavior.toLowerCase().includes(query)
      );
    });

    if (!filtered.length) {
      varListEl.innerHTML = `<div style="text-align:center; padding: 20px; color: #94a3b8;">Không tìm thấy biến thể nào khớp với "${query}"</div>`;
      return;
    }

    varListEl.innerHTML = filtered
      .map(
        (v) => `
        <div class="dev-tester-var-card">
          <div class="dev-tester-var-header">
            <span class="dev-tester-var-title">${v.name}</span>
            <span class="dev-tester-tag">${v.id}</span>
          </div>
          <div style="font-size: 11px; color: #38bdf8; font-weight: 500;">Đối tượng gốc: ${v.object}</div>
          <div class="dev-tester-var-desc">${v.behavior}</div>
        </div>`,
      )
      .join('');
  }

  function renderInteractions() {
    const listEl = panelEl?.querySelector('#devTesterInteractionsList');
    if (!listEl) return;
    const matrix = Portfolio.ambientEnvironment?.interactionMatrix || [];

    listEl.innerHTML = matrix
      .map(
        (int, idx) => `
        <div class="dev-tester-interaction-card">
          <div class="dev-tester-interaction-header">
            <div class="dev-tester-interaction-flow">
              <span>${int.source}</span>
              <span class="dev-tester-flow-arrow">➔</span>
              <span>${int.target}</span>
            </div>
            <span class="dev-tester-tag">#${idx + 1}</span>
          </div>
          <div class="dev-tester-interaction-desc">${int.description}</div>
        </div>`,
      )
      .join('');
  }

  function renderPanel() {
    if (panelEl) return;

    // 1. Floating pill button (shown when panel is closed)
    pillEl = document.createElement('button');
    pillEl.type = 'button';
    pillEl.className = 'dev-tester-pill';
    pillEl.title = 'Mở bảng điều khiển kiểm thử VFX & Sự kiện (Ctrl+Shift+D hoặc F2)';
    pillEl.innerHTML = '<span>🧪</span><span>Test Lab (139 Events)</span>';
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
          <span class="dev-tester-panel__badge">139 Events</span>
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
        <button type="button" class="dev-tester-tab is-active" data-tab="events">✨ 139 Sự Kiện</button>
        <button type="button" class="dev-tester-tab" data-tab="variations">🎨 250 Biến Thể</button>
        <button type="button" class="dev-tester-tab" data-tab="interactions">⚡ Tương Tác & Bus</button>
        <button type="button" class="dev-tester-tab" data-tab="time">🌅 Giờ & Mùa</button>
        <button type="button" class="dev-tester-tab" data-tab="swarm">🖱 Swarm VFX</button>
      </div>

      <div class="dev-tester-panel__body">
        <!-- Persistent Ambient Quick Controls -->
        <div class="dev-tester-quick-bar">
          <button type="button" class="dev-tester-btn dev-tester-btn--primary" data-action="enter-ambient">✨ Vào Ambient</button>
          <button type="button" class="dev-tester-btn" data-action="exit-ambient">🚪 Thoát Ambient</button>
          <button type="button" class="dev-tester-btn" data-action="toggle-lock" id="devTesterLockBtn" style="grid-column: span 2;">🔒 Khóa: Rê chuột không thoát</button>
        </div>

        <!-- TAB 1: ALL 139 EVENTS -->
        <div class="dev-tester-tab-content" id="devTesterTabEvents">
          <div class="dev-tester-section">
            <div class="dev-tester-section__title">
              <span>Tìm Kiếm & Lọc 139 Sự Kiện</span>
              <button type="button" class="dev-tester-btn dev-tester-btn--primary" style="padding: 2px 8px; font-size: 11px;" data-action="random-event">🎲 Random Event</button>
            </div>
            <div class="dev-tester-search-wrap">
              <input type="text" class="dev-tester-search" id="devTesterSearch" placeholder="🔍 Tìm sự kiện (pháo hoa, sấm sét, máy bay, én, cascade...)">
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
              <span>Danh Sách Sự Kiện (Click để kích hoạt ngay)</span>
            </div>
            <div class="dev-tester-event-list" id="devTesterEventList"></div>
          </div>
        </div>

        <!-- TAB 2: 250 EFFECT VARIATIONS -->
        <div class="dev-tester-tab-content" id="devTesterTabVariations" style="display: none;">
          <div class="dev-tester-section">
            <div class="dev-tester-section__title">
              <span>🎨 Danh Mục 250 Biến Thể Hiệu Ứng</span>
            </div>
            <div class="dev-tester-search-wrap">
              <input type="text" class="dev-tester-search" id="devTesterVarSearch" placeholder="🔍 Tìm biến thể (cúc, liễu, máy bay, chớp, diều...)">
            </div>
            <div class="dev-tester-filter-pills">
              ${Object.entries(VAR_DOMAINS)
                .map(
                  ([key, title]) =>
                    `<button type="button" class="dev-tester-filter-pill ${key === 'all' ? 'is-active' : ''}" data-var-domain="${key}">${title}</button>`,
                )
                .join('')}
            </div>
          </div>

          <div class="dev-tester-section" style="margin-top: 4px;">
            <div class="dev-tester-var-list" id="devTesterVarList"></div>
          </div>
        </div>

        <!-- TAB 3: OBJECT INTERACTIONS & PHYSICAL BUS -->
        <div class="dev-tester-tab-content" id="devTesterTabInteractions" style="display: none;">
          <div class="dev-tester-section">
            <div class="dev-tester-section__title">
              <span>💨 Dynamic Wind Vector Engine</span>
              <span class="dev-tester-section__value" id="devTesterWindSpeedValue">+0.60 px/f</span>
            </div>
            <div class="dev-tester-slider-wrap">
              <input type="range" class="dev-tester-slider" id="devTesterWindSlider" min="-2.0" max="2.0" step="0.1" value="0.6">
            </div>
            <div class="dev-tester-btn-grid">
              <button type="button" class="dev-tester-btn dev-tester-btn--primary" data-action="trigger-gust">💨 Gió Giật (+1.8 Gust)</button>
              <button type="button" class="dev-tester-btn" data-action="reset-wind">🔄 Đặt Lại Gió Chuẩn</button>
            </div>
          </div>

          <div class="dev-tester-section" style="margin-top: 8px;">
            <div class="dev-tester-section__title">
              <span>⚡ Atmospheric Illumination Bus</span>
            </div>
            <div class="dev-tester-btn-grid">
              <button type="button" class="dev-tester-btn" data-action="trigger-lightning-flash">⚡ Chớp Sáng (Lightning 1.0)</button>
              <button type="button" class="dev-tester-btn" data-action="trigger-firework-flash">🎆 Chớp Pháo Hoa (Amber 0.8)</button>
              <button type="button" class="dev-tester-btn dev-tester-btn--full" data-action="trigger-startle">💥 Gây Hoảng Loạn Đàn Chim / Dơi (Startle)</button>
            </div>
          </div>

          <div class="dev-tester-section" style="margin-top: 8px;">
            <div class="dev-tester-section__title">
              <span>🔗 25 Tương Tác Vật Lý & Môi Trường</span>
            </div>
            <div class="dev-tester-interaction-list" id="devTesterInteractionsList"></div>
          </div>
        </div>

        <!-- TAB 4: TIME OF DAY & SEASONS -->
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

        <!-- TAB 5: CURSOR SWARM VFX -->
        <div class="dev-tester-tab-content" id="devTesterTabSwarm" style="display: none;">
          <div class="dev-tester-section">
            <div class="dev-tester-section__title">
              <span>🖱 Con Trỏ & Hiệu Ứng Swarm</span>
            </div>
            <div class="dev-tester-btn-grid">
              <button type="button" class="dev-tester-btn" data-swarm="ripple">🌊 Click Shockwave Ripple</button>
              <button type="button" class="dev-tester-btn" data-swarm="settle">✨ Builder Settle Shimmer</button>
              <button type="button" class="dev-tester-btn dev-tester-btn--full" data-swarm="toggle">🌀 Bật / Tắt Chế Độ Swarm</button>
            </div>
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
    varSearchInputEl = panelEl.querySelector('#devTesterVarSearch');
    varListEl = panelEl.querySelector('#devTesterVarList');
    lockBtn = panelEl.querySelector('#devTesterLockBtn');
    windSliderEl = panelEl.querySelector('#devTesterWindSlider');
    windSpeedValueEl = panelEl.querySelector('#devTesterWindSpeedValue');

    // Tab switching
    panelEl.querySelectorAll('[data-tab]').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        activeTab = tabBtn.dataset.tab;
        panelEl.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('is-active'));
        tabBtn.classList.add('is-active');

        panelEl.querySelector('#devTesterTabEvents').style.display =
          activeTab === 'events' ? 'block' : 'none';
        panelEl.querySelector('#devTesterTabVariations').style.display =
          activeTab === 'variations' ? 'block' : 'none';
        panelEl.querySelector('#devTesterTabInteractions').style.display =
          activeTab === 'interactions' ? 'block' : 'none';
        panelEl.querySelector('#devTesterTabTime').style.display = activeTab === 'time' ? 'block' : 'none';
        panelEl.querySelector('#devTesterTabSwarm').style.display = activeTab === 'swarm' ? 'block' : 'none';

        if (activeTab === 'variations') renderVariationItems();
        if (activeTab === 'interactions') renderInteractions();
      });
    });

    // Event category filter pills
    panelEl.querySelectorAll('[data-filter]').forEach((pill) => {
      pill.addEventListener('click', () => {
        activeFilter = pill.dataset.filter;
        panelEl.querySelectorAll('[data-filter]').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        renderEventItems();
      });
    });

    // Variation domain filter pills
    panelEl.querySelectorAll('[data-var-domain]').forEach((pill) => {
      pill.addEventListener('click', () => {
        activeVarDomain = pill.dataset.varDomain;
        panelEl.querySelectorAll('[data-var-domain]').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        renderVariationItems();
      });
    });

    // Search inputs
    searchInputEl?.addEventListener('input', () => renderEventItems());
    varSearchInputEl?.addEventListener('input', () => renderVariationItems());

    // Wind slider & triggers
    windSliderEl?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      Portfolio.ambientEnvironment?.wind?.setWind(val, val);
      updateStatusDisplay();
    });

    panelEl.querySelector('[data-action="trigger-gust"]')?.addEventListener('click', () => {
      devTester.triggerGust(1.8);
      showToast('💨 Đã thổi gió giật mạnh (+1.8 Gust)!');
    });

    panelEl.querySelector('[data-action="reset-wind"]')?.addEventListener('click', () => {
      Portfolio.ambientEnvironment?.wind?.reset();
      if (windSliderEl) windSliderEl.value = '0.6';
      updateStatusDisplay();
      showToast('🔄 Đã đặt lại gió chuẩn (+0.60 px/f)');
    });

    panelEl.querySelector('[data-action="trigger-lightning-flash"]')?.addEventListener('click', () => {
      devTester.triggerFlash(1.0, [255, 255, 255]);
      showToast('⚡ Chớp sáng rực bầu trời & skyline!');
    });

    panelEl.querySelector('[data-action="trigger-firework-flash"]')?.addEventListener('click', () => {
      devTester.triggerFlash(0.8, [255, 210, 140]);
      showToast('🎆 Chớp pháo hoa màu hổ phách bừng sáng!');
    });

    panelEl.querySelector('[data-action="trigger-startle"]')?.addEventListener('click', () => {
      devTester.triggerStartle();
      showToast('💥 Đã phát chấn động làm đàn chim / dơi hoảng loạn!');
    });

    // Header actions
    panelEl.querySelector('[data-action="close"]').addEventListener('click', () => devTester.hide());
    panelEl.querySelector('[data-action="collapse"]').addEventListener('click', () => {
      panelEl.classList.toggle('is-collapsed');
    });

    // Ambient Quick Controls
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

    // Hour slider & shortcuts
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

    // Global Reset
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
      Portfolio.ambientEnvironment?.wind?.reset();
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

      // Check if it's a multi-stage cascade sequence
      if (name.startsWith('cascade_') && Portfolio.ambientEnvironment?.cascades?.[name]) {
        Portfolio.ambientEnvironment.triggerCascade(name);
        const ev = ALL_EVENTS.find((e) => e.id === name);
        showToast(`⚡ Đang phát Chuỗi Đa Tầng: ${ev ? ev.label : name}`);
        updateStatusDisplay();
        return true;
      }

      // If it's one of the cultural holidays, also set calendar holiday
      const holidays = [
        'tet',
        'nationalday',
        'midautumn',
        'newyear',
        'hungkings',
        'liberation',
        'buddha',
        'christmas',
      ];
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

    triggerCascade(name) {
      return this.triggerAmbient(name);
    },

    triggerGust(strength = 1.8) {
      Portfolio.ambientEnvironment?.wind?.triggerGust(strength);
      updateStatusDisplay();
    },

    triggerFlash(intensity = 1.0, color = [255, 255, 255]) {
      Portfolio.ambientEnvironment?.illumination?.flash(intensity, color);
    },

    triggerStartle(x = window.innerWidth / 2, y = window.innerHeight / 2, radius = 250) {
      Portfolio.ambientEvents?.startle?.(x, y, radius);
      showToast('💥 Đã phát chấn động gây giật mình cho boids!');
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

    listEvents(category = 'all') {
      const filtered = ALL_EVENTS.filter((ev) => category === 'all' || ev.cat === category);
      console.table(
        filtered.map((ev, index) => ({
          '#': index + 1,
          ID: ev.id,
          'Danh Mục': CATEGORIES[ev.cat] || ev.cat,
          'Tên Sự Kiện': `${ev.icon} ${ev.label}`,
          'Lệnh Console': `Portfolio.test.triggerAmbient('${ev.id}')`,
        })),
      );
      return filtered;
    },

    listVariations(domain = 'all') {
      const catalog = Portfolio.ambientEnvironment?.variationsCatalog || [];
      const filtered = catalog.filter((v) => domain === 'all' || v.cat === domain);
      console.table(
        filtered.map((v, index) => ({
          '#': index + 1,
          ID: v.id,
          Nhóm: VAR_DOMAINS[v.cat] || v.cat,
          'Tên Biến Thể': v.name,
          'Đối Tượng Gốc': v.object,
          'Mô Tả Khác Biệt Hành Vi / Hình Ảnh': v.behavior,
        })),
      );
      return filtered;
    },

    listInteractions() {
      const matrix = Portfolio.ambientEnvironment?.interactionMatrix || [];
      console.table(
        matrix.map((int, index) => ({
          '#': index + 1,
          ID: int.id,
          'Nguồn Gốc (Source)': int.source,
          'Đối Tượng Tác Động (Target)': int.target,
          'Quy Luật Tương Tác Vật Lý / Quang Học': int.description,
        })),
      );
      return matrix;
    },

    help() {
      console.log(
        `%c🧪 Portfolio Event, Variation & VFX Test Lab (139 Events & 250 Variations)
%cCác lệnh kiểm thử nhanh trong DevTools Console:

1. Kích hoạt bất kỳ sự kiện nào trong 139 sự kiện (Tự động khóa không thoát khi rê chuột):
   Portfolio.test.triggerAmbient('tet')           → Tết Sài Gòn: Hoa mai vàng & Đèn hoa đăng
   Portfolio.test.triggerAmbient('fireworks_willow') → Pháo hoa liễu rủ
   Portfolio.test.triggerAmbient('bolide')        → Cầu lửa Bolide nổ sáng
   Portfolio.test.triggerAmbient('lightning_forked') → Sét rễ cây phân nhánh
   Portfolio.test.triggerAmbient('widebody_a350') → Máy bay A350 lướt ngang
   Portfolio.test.triggerAmbient('cascade_thunderstorm') → Chuỗi giông bão đa tầng
   Portfolio.test.listEvents()                    → In bảng danh sách toàn bộ 139 sự kiện

2. Tra cứu 250 Biến thể hiệu ứng & 25 Tương tác vật lý:
   Portfolio.test.listVariations('fireworks')     → Xem 25 biến thể pháo hoa
   Portfolio.test.listVariations('clouds')        → Xem 25 biến thể mây
   Portfolio.test.listInteractions()              → Xem bảng 25 quy luật tương tác vật lý

3. Điều khiển Môi Trường, Gió & Ánh Sáng:
   Portfolio.test.triggerGust(2.0)                → Thổi luồng gió giật mạnh
   Portfolio.test.triggerFlash(1.0)               → Chớp sáng toàn bộ bầu trời & skyline
   Portfolio.test.triggerStartle()                → Làm đàn chim/dơi tản loạn
   Portfolio.test.setHour(17.5)                   → Đặt giờ hoàng hôn vàng (17:30)

4. Bảng điều khiển trực quan:
   Portfolio.test.show()                          → Mở bảng điều khiển UI (Ctrl+Shift+D hoặc F2)
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
        '%c[Test Lab]%c Đã sẵn sàng %c139 sự kiện%c, %c250 biến thể%c & %c25 tương tác vật lý%c! Gõ %cPortfolio.test.help()%c hoặc bấm nút %c🧪 Test Lab%c (Ctrl+Shift+D) để thử nghiệm!',
        'color: #38bdf8; font-weight: bold;',
        'color: #94a3b8;',
        'color: #34d399; font-weight: bold;',
        'color: #94a3b8;',
        'color: #facc15; font-weight: bold;',
        'color: #94a3b8;',
        'color: #a78bfa; font-weight: bold;',
        'color: #94a3b8;',
        'color: #38bdf8; font-weight: bold;',
        'color: #94a3b8;',
        'color: #38bdf8; font-weight: bold;',
        'color: #94a3b8;',
      );
    },
  };

  Portfolio.devTester = devTester;
})((window.Portfolio = window.Portfolio || {}));
