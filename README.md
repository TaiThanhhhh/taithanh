# Thanh Tai Nguyen — Personal Website

Trang web cá nhân / portfolio của Tài Thành. Site tĩnh, không cần build: HTML + CSS + vanilla JavaScript.

## Chạy local

```bash
npm install     # chỉ cần cho dev tooling (lint, format, dev server)
npm start       # http://localhost:3000
```

Hoặc mở trực tiếp `index.html` bằng trình duyệt.

## Scripts

| Lệnh                   | Mô tả                                      |
| ---------------------- | ------------------------------------------ |
| `npm start`            | Chạy static server ở cổng 3000             |
| `npm run lint`         | ESLint cho toàn bộ `js/` (bỏ qua `vendor`) |
| `npm run format`       | Format code bằng Prettier                  |
| `npm run format:check` | Kiểm tra format (dùng cho CI)              |

## Cấu trúc thư mục

```
.
├── index.html                 # Toàn bộ markup (single page, nhiều section)
├── css/
│   ├── index.css              # Stylesheet chính + responsive
│   ├── about.css              # Bổ sung cho trang About (mục Experience, thanh skill theo `--level`, fix ảnh/nút CV)
│   ├── portfolio.css          # Trang Portfolio: lưới zig-zag, ảnh 16:10, nút viền quét màu
│   ├── settings.css           # Panel cài đặt gộp
│   ├── swarm.css              # Con trỏ, khung dựng, chữ đang viết và công tắc Swarm
│   ├── ambient.css            # Cảnh Ambient + chuyển cảnh trang <-> cảnh
│   ├── dev-tester.css         # Panel kiểm thử trực quan VFX & sự kiện
│   └── color-*.css            # Bảng màu accent, nạp động khi người dùng chọn
├── js/
│   ├── config.js              # Cấu hình tập trung: section, timing, EmailJS, preset particles
│   ├── main.js                # Entry point, khởi tạo các module theo thứ tự
│   ├── modules/
│   │   ├── motion.js          # Tiện ích animation không phụ thuộc tần số quét (60/75/144/240 Hz)
│   │   ├── loader.js          # Màn hình intro
│   │   ├── navigation.js      # Menu fullscreen + chuyển section kèm hiệu ứng wipe
│   │   ├── settings.js        # Panel cài đặt duy nhất (bánh răng): Colors + Background, dùng chung mọi trang
│   │   ├── color-switcher.js  # Áp dụng bảng màu accent (nạp css/color-*.css)
│   │   ├── theme-switcher.js  # Áp dụng nền particles cho Home (Particles / Clean / Snow / Dust)
│   │   ├── typewriter.js      # Hiệu ứng gõ chữ cho `.txt-rotate`
│   │   ├── cursor.js          # Con trỏ chuột tuỳ chỉnh
│   │   ├── swarm-flock.js     # Swarm mode: vật lý đàn chim (boids) + vẽ con trỏ
│   │   ├── swarm-builder.js   # Swarm mode: hàng đợi việc + 4 động tác dựng trang khi cuộn
│   │   ├── swarm.js           # Swarm mode: bật/tắt, input, vòng lặp animation
│   │   ├── ambient-calendar.js # Lịch thiên văn: chu kỳ nhật dạ thời gian thực Sài Gòn, mùa & lễ hội
│   │   ├── ambient-cycle.js   # Ambient mode: một ngày rút gọn hoặc đồng bộ giờ thực (màu trời, mặt trời, mặt trăng)
│   │   ├── ambient-sky.js     # Ambient mode: trời, sao, mặt trời/trăng, mây, đường chân trời, đèn cửa sổ
│   │   ├── ambient-events.js  # Ambient mode: điều phối sự kiện (2 tầng, độ hiếm, chú thích) + tiện ích vẽ
│   │   ├── ambient-events-calendar.js # Sự kiện lịch đặc biệt: Tết Nguyên Đán, Quốc Khánh 2/9, Giao Thừa, Trung Thu
│   │   ├── ambient-events-night.js   # Pháo hoa, đêm pháo hoa lớn, đèn trời, drone show, LED + laser Landmark 81, đèn pha
│   │   ├── ambient-events-sky.js     # Sao băng, vệ tinh, sao chổi, nguyệt thực, quầng trăng, mặt trời giả, tia nắng
│   │   ├── ambient-events-weather.js # Chớp, giông đêm, mưa rào + cầu vồng, mưa xa, sương sớm, bóng mây
│   │   ├── ambient-events-day.js     # Khinh khí cầu (cả ban đêm), diều, bóng bay, bong bóng, hoa dầu, hoa mai
│   │   ├── ambient-events-flyby.js   # Vệt khói, chim chữ V, máy bay hạ cánh, trực thăng, dơi, én, máy bay giấy, băng rôn
│   │   ├── ambient-murmuration.js # Ambient mode: đàn con trỏ 3D (boids topo, sóng kích động, chuyển cảnh)
│   │   ├── ambient-scene.js   # Ambient mode: ghép các lớp + đồng hồ
│   │   ├── screen-atmosphere.js # Khí quyển màn hình tĩnh: ánh sáng nhật dạ, viền sáng avatar & hạt vi khí hậu
│   │   ├── ambient.js         # Ambient mode: phát hiện idle, chuyển cảnh vào/thoát, chế độ tiết kiệm
│   │   ├── dev-tester.js      # Bộ công cụ kiểm thử trực quan VFX, ngày đêm, khóa Ambient & console API
│   │   └── contact-form.js    # Validate form + gửi mail qua EmailJS
│   └── vendor/
│       └── particles.min.js   # Thư viện bên thứ ba (không lint/format)
├── images/
└── ThanhTai_Nguyen_Resume_FullStackDeveloper.pdf
```

## Kiến trúc

- **Namespace duy nhất** `window.Portfolio`: mỗi file là một IIFE `'use strict'` gắn module của mình vào namespace,
  không rò biến toàn cục. Dùng script thường (không ES module) để site vẫn chạy khi mở qua `file://`.
- **Mượt ở mọi tần số quét**: mọi chuyển động tính theo thời gian thực, không theo số khung hình (`motion.js`).
  Con trỏ tròn dùng một vòng lặp làm mượt theo hàm mũ (không tạo tween mỗi lần rê chuột); particles.js chạy ở mỗi
  khung hình thứ n của màn hình để giữ ~60 bước/giây như thiết kế (144 Hz → cách 1 khung, 240 Hz → cách 3 khung).
- **Config tách khỏi logic**: mọi selector, thời gian animation, key bên thứ ba đều nằm trong `js/config.js`.
- **Một panel cài đặt**: `settings.js` render một lần vào `[data-component="settings"]` (nằm ngoài các section nên
  dùng được ở mọi trang); `color-switcher.js` và `theme-switcher.js` chỉ lo phần áp dụng.
- **Điều hướng khai báo bằng data attribute**: link có `data-section="<key>"`, ánh xạ tới id section trong
  `config.sections`. Thêm section mới = thêm 1 dòng config + 1 link.

### Quy ước giao diện

- Tiêu đề section: Raleway, căn giữa, một từ tô màu nhấn bằng class `.color` (ví dụ `My <span class="color">Skills</span>`).
- Nội dung: Poppins. Màu nhấn luôn đi qua `.color` hoặc các class được `css/color-*.css` ghi đè, để đổi bảng màu
  vẫn áp dụng.
- Viết ngắn: mỗi mục tối đa 1–2 câu, nói việc cụ thể, tránh liệt kê dài.

### Thêm bảng màu mới

1. Tạo `css/color-<tên>.css` (copy từ một file màu sẵn có).
2. Thêm `'color-<tên>'` vào `colorThemes` trong `js/config.js`.
3. Thêm class `.color-<tên>` (màu của ô swatch) trong `css/index.css`.

### Ambient mode: Sài Gòn một ngày (nền động cho màn hình phụ)

Khi trang **Home** không được dùng trong 30 giây, nó chuyển thành một nền động để làm việc / chơi game bên cạnh; rê chuột,
bấm phím hoặc click là trở lại (cú click/phím đánh thức không tác động lên trang).

- **Dùng làm nền màn hình phụ**: mở `index.html?ambient` → vào Ambient sau 8 giây không dùng.
- **Một ngày rút gọn** (không theo giờ thật, mặc định 40 phút một vòng, `cycleMinutes`): mỗi lần vào bắt đầu từ hoàng
  hôn → chạng vạng → blue hour → đêm → khuya → rạng đông → bình minh → sáng → trưa → chiều → hoàng hôn. Màu chuyển dần
  liên tục (không nhảy cảnh). Mặt trời mọc cạnh Bitexco, lặn sau Landmark 81; mặt trăng mỗi lần một pha (thỉnh thoảng
  trăng tròn). Đèn cửa sổ bật dần từng ô lúc chạng vạng và tắt dần lúc khuya; ban ngày kính cửa sổ phản chiếu trời. Rời
  máy ít hơn `resumeMinutes` (10 phút) rồi quay lại idle thì ngày chạy tiếp, không bắt đầu lại. Sau hoàng hôn và
  trước bình minh có vành đai Venus (dải hồng phía đối diện mặt trời, trên bóng xanh của Trái Đất).
- **Cảnh**: mây được tô theo giờ (hồng lúc hoàng hôn, trắng ban ngày, đèn thành phố hắt từ dưới ban đêm), đường chân
  trời hai lớp có sương (Landmark 81, Bitexco), thỉnh thoảng một chiếc máy bay. Đồng hồ chữ mảnh trôi rất chậm (chống lưu
  ảnh OLED).
- **Đàn con trỏ**: ~1.200 con trỏ bay như chim sáo trong không gian 3D: mỗi con theo 7 con gần nhất (tương tác topo,
  Ballerini et al. 2008), thỉnh thoảng có "sóng kích động" lan qua đàn (Procaccini 2011, Hemelrijk 2019). Ban đêm phát
  sáng, ban ngày thành bóng đen như đàn sáo thật. 16 con trỏ màu của Swarm bay trong đàn, đôi khi một con hiện tên. Cả
  đàn giật mình né ra khi pháo hoa nổ gần hay có sấm.
- **36 sự kiện bất ngờ, hai tầng**, chọn theo giờ trong ngày, theo độ hiếm (thường / ít gặp / hiếm) và không lặp lại các
  sự kiện vừa xem:
  - **Sự kiện chính** (mỗi 1–2,5 phút sau khi cái trước kết thúc, `eventGapMinutes`; lần đầu sau 25–60 giây), có dòng
    chú thích nhỏ dưới đồng hồ (`captions`), sự kiện hiếm có nhãn "hiếm gặp":
    - Đêm: pháo hoa theo các loại pháo thật (cúc, liễu, cọ, vòng, crossette, lấp lánh, đổi màu), đêm pháo hoa lớn
      (hiếm), thả đèn trời, drone show (trái tim/ngôi sao → con trỏ của site → "XIN CHÀO" / "SÀI GÒN" / `</>`), Landmark
      81 trình diễn LED, laser show từ đỉnh Landmark 81, đèn pha quét trời, mưa sao băng, sao chổi (hiếm), nguyệt thực
      toàn phần (hiếm, chỉ khi trăng tròn), quầng trăng, chớp xa, giông đêm, khinh khí cầu thắp lửa, sương sớm.
    - Ngày: khinh khí cầu, thả diều trên sân thượng, chùm bóng bay, bong bóng xà phòng, mùa hoa dầu bay (quả dầu xoay
      như chong chóng), hoa mai bay, mưa rào rồi cầu vồng (đôi khi cầu vồng đôi), mưa xa cuối trời, bóng mây trôi qua các
      tòa nhà, quầng mặt trời và mặt trời giả (hiếm), tia nắng xuyên mây, máy bay kéo băng rôn (`bannerMessages`).
  - **Chi tiết nhỏ** chạy xen giữa (mỗi 20–45 giây, `detailGapSeconds`): sao băng, ISS / đoàn vệ tinh Starlink, máy bay
    hạ cánh Tân Sơn Nhất (đèn hạ cánh, đèn mạn, đèn chớp), trực thăng (ban đêm có đèn rọi), dơi lúc chạng vạng, chim én,
    vệt khói máy bay, đàn chim bay chữ V, máy bay giấy nhào lộn.
- **Thử nhanh**: `index.html?ambient&speed=40` (một ngày trong 1 phút), `&at=night` (golden, dusk, blue, night, late,
  predawn, sunrise, morning, noon, afternoon), `&event=fireworks`; hoặc trong console:
  `Portfolio.ambient.trigger('kites')` (danh sách: `Portfolio.ambient.events`).
- **Chuyển cảnh**: vào: trang Home lùi ra sau (mờ + thu nhỏ nhẹ), con trỏ của bạn tuôn ra thành cả đàn; thoát: cả đàn
  ùa về thu vào con trỏ trong khi trang hiện rõ lại.
- **Nhẹ máy**: hình dạng sky/mây/sao/đường chân trời vẽ một lần rồi để CSS (GPU) di chuyển; màu theo giờ áp dụng mỗi
  giây qua CSS custom properties, chỉ tô lại canvas khi màu thật sự đổi. Canvas sự kiện chỉ có bộ nhớ khi đang có sự
  kiện (0×0 lúc nghỉ). Chỉ đàn con trỏ tính mỗi khung hình (typed arrays + lưới không gian). Tự giảm số con trỏ nếu vượt `frameBudgetMs` (mặc định 4 ms), tự xuống 30 fps khi cửa sổ
  không được focus (bạn đang ở game/app khác), trang bên dưới ngừng vẽ hoàn toàn, dừng hẳn khi tab bị ẩn. Đã kiểm tra
  không rò rỉ bộ nhớ.
- Tắt khi người dùng bật "giảm chuyển động". Tham số trong `config.ambient` (thời gian chờ, số con trỏ, ngân sách khung
  hình, độ dài một ngày, nhịp sự kiện, chú thích, chữ trên băng rôn).

### Khí quyển màn hình tĩnh & Sự kiện theo thời gian thực (Screen Atmosphere)

Trang chủ tĩnh (`#header`) phản ứng tự nhiên với thời gian trong ngày và các dịp đặc biệt mà không cần vào chế độ Ambient:

- **Đồng bộ nhật dạ thời gian thực (`ambient-calendar.js`)**:
  - Ánh sáng môi trường biến chuyển mượt mà qua 10 thời điểm trong ngày: _Rạng đông (predawn) → Bình minh (sunrise) → Buổi sáng (morning) → Ban trưa (noon) → Buổi chiều (afternoon) → Giờ vàng (golden) → Hoàng hôn (dusk) → Giờ xanh (blue) → Ban đêm (night) → Đêm muộn (late)_.
  - Chuyển giao qua nửa đêm (23:59:59 → 00:00:00) liền mạch toán học, không giật màu.
- **Chiếu sáng viền silhouette (Avatar Rim Lighting)**:
  - Bức ảnh chân dung nhận ánh sáng viền phản chiếu góc chiếu của mặt trời: rực rỡ ấm áp phía trái khi hoàng hôn buông xuống, trong trẻo tinh khôi phía phải lúc bình minh.
- **Hạt vi khí hậu theo mùa & sự kiện (`screen-atmosphere.js`)**:
  - Bụi vàng lấp lánh trong nắng chiều, hạt sương sáng sớm, ánh sao đêm nhẹ nhàng, hoặc cánh hoa mai bay lượn dịp Tết.
  - Tự động ngắt hoàn toàn vòng lặp khi cuộn khỏi màn hình hoặc khi tab bị ẩn để tiết kiệm pin.
- **Sự kiện văn hóa & Lễ hội Sài Gòn (`ambient-events-calendar.js`)**:
  - Tự động kích hoạt khi đúng ngày: _Tết Nguyên Đán_ (hoa mai, đèn hoa đăng, Landmark 81 mừng xuân), _Quốc Khánh 2/9_ (Landmark 81 cờ đỏ sao vàng), _Tết Trung Thu_ (trăng rằm, đèn cá chép), _Đêm Giao Thừa_ (đếm ngược & pháo hoa), _Cuối tuần_ (thả diều hoàng hôn).

### Kiểm thử hiệu ứng & Developer Test Lab (`dev-tester.js`)

Tích hợp sẵn bảng điều khiển nổi để kiểm thử mọi thời điểm trong ngày, sự kiện lễ hội và hiệu ứng VFX:

- **Cách mở bảng**: Bấm nút **🧪 Test Lab** ở góc phải dưới, phím tắt `Ctrl + Shift + D` (hoặc `F2`), nút trong menu Cài đặt ⚙️, hoặc URL `?test`.
- **Khóa Ambient Mode (Lock Mode)**: Tự động khóa khi vào từ Test Lab để rê chuột không bị tự thoát màn hình chờ; bấm `[🚪 Thoát Ambient]` hoặc `Esc` để về lại.
- **Console API (`Portfolio.test`)**:
  - `Portfolio.test.setHour(17.5)`: Đặt giờ bất kỳ (0..24) để quan sát ánh sáng viền avatar và màu nền.
  - `Portfolio.test.setHoliday('tet')` / `'midautumn'` / `'nationalday'`: Đặt sự kiện ngày lễ.
  - `Portfolio.test.triggerAmbient('fireworks')`: Bắn pháo hoa hoặc các sự kiện bất ngờ.
  - `Portfolio.test.triggerRipple()`: Bắn sóng xung kích con trỏ.
  - `Portfolio.test.reset()`: Trở về thời gian thực tế.

### Kiểm thử hiệu ứng & Developer Test Lab (`dev-tester.js`)

Tích hợp sẵn bảng điều khiển nổi để kiểm thử mọi thời điểm trong ngày, sự kiện lễ hội và hiệu ứng VFX:
- **Cách mở bảng**: Bấm nút **🧪 Test Lab** ở góc phải dưới, phím tắt `Ctrl + Shift + D` (hoặc `F2`), nút trong menu Cài đặt ⚙️, hoặc URL `?test`.
- **Khóa Ambient Mode (Lock Mode)**: Tự động khóa khi vào từ Test Lab để rê chuột không bị tự thoát màn hình chờ; bấm `[🚪 Thoát Ambient]` hoặc `Esc` để về lại.
- **Console API (`Portfolio.test`)**:
  - `Portfolio.test.setHour(17.5)`: Đặt giờ bất kỳ (0..24) để quan sát ánh sáng viền avatar và màu nền.
  - `Portfolio.test.setHoliday('tet')` / `'midautumn'` / `'nationalday'`: Đặt sự kiện ngày lễ.
  - `Portfolio.test.triggerAmbient('fireworks')`: Bắn pháo hoa hoặc các sự kiện bất ngờ.
  - `Portfolio.test.triggerRipple()`: Bắn sóng xung kích con trỏ.
  - `Portfolio.test.reset()`: Trở về thời gian thực tế.

### Swarm mode

**Bật mặc định.** Bật/tắt bằng công tắc **Swarm** ở góc trái dưới (có trên mọi trang), hoặc `Esc` để tắt. Lựa chọn được
nhớ trong `localStorage` (`config.swarm.defaultOn` quyết định trạng thái cho người mới vào).

- **Đàn chim & VFX** (`swarm-flock.js`): 16 con trỏ (tên công nghệ, màu lấy từ 6 bảng màu của site) bay theo thuật toán boids:
  tách nhau ra, bay cùng hướng, giữ đội hình, xoáy quanh chuột; khi chuột đứng yên thì chuyển mượt sang lượn theo đường cong Lissajous khắp
  màn hình. Con trỏ xoay theo hướng bay, co giãn khí động học khi tăng tốc và nâng độ cao khi nhận nhiệm vụ dựng trang (`.is-traveling`).
- **Hệ thống VFX & Phản hồi tương tác (Canvas 2D)**:
  - _Vệt chuyển động (Motion Trails)_: vệt ribbon khí động học vuốt nhọn tự nhiên theo màu của từng con trỏ khi bay nhanh hoặc di chuyển làm nhiệm vụ, tự động biến mất khi dừng hoặc đang làm việc để giữ không gian sạch sẽ.
  - _Sóng xung kích (Click Ripples)_: mỗi cú click chuột tạo vòng sóng lan tỏa vật lý khớp với xung lực đẩy boids (`scatter()`).
  - _Bong bóng áp lực khi giữ chuột_: khi nhấn giữ hoặc kéo chuột (`pointerdown`/drag), đàn con trỏ duy trì vành đai áp lực kinetic quanh con trỏ.
  - _Né tránh & đóng khung phần tử tương tác (Hover Framing)_: khi rê chuột vào nút, link hay thẻ dự án, đàn con trỏ tự động tản ra tạo vùng đệm thoáng, đóng khung tinh tế phần tử thay vì che khuất chữ.
  - _Hiệu ứng hoàn thành (Settle Shimmer)_: khi một phần tử dựng xong, một xung viền ánh sáng nhẹ xuất hiện và tan dần trên khung phần tử.
  - _Con trỏ chính (`cursor.js`)_: vòng tròn chuột co lại đàn hồi khi nhấn (`press`), mượt mà theo dõi và ẩn/hiện tự nhiên khi rời khỏi cửa sổ duyệt web.
- **Tự dựng trang như một đội multi-agent** (`swarm-builder.js`): phần tử nào cuộn vào màn hình thì một nhóm con trỏ rời
  đàn tới dựng nó theo kịch bản 3 bước:
  1. _Dựng khung_: kéo khung (kèm kích thước W×H), kéo thả vào chỗ, hoặc hai con trỏ kéo giãn từ hai góc. Đôi khi
     agent làm sai (lệch vài px, nghiêng vài độ, sai kích thước): khung chuyển đỏ kèm nhãn lỗi.
  2. _Viết nội dung_: chữ được viết từng ký tự sau một dấu nháy, có nhịp nghỉ ở cuối từ và sau dấu câu; thỉnh thoảng
     gõ sai chính tả.
  3. _Review_: một agent khác bay tới sửa lỗi bố cục (song song trong lúc agent kia vẫn đang viết, khung chuyển xanh
     "✓ Fixed"), rồi một agent khác nữa đi sửa từng lỗi chính tả (gạch đỏ lượn sóng → chữ đúng nháy xanh).
     Kịch bản viết bằng generator, mỗi agent là một "luồng" nên nhiều agent làm song song trên cùng một phần tử. Mỗi lần
     chuyển trang, trang đó được dựng lại.
- **An toàn**: phần tử chờ quá `build.maxWait` (15s) hoặc đã bị cuộn qua sẽ hiện ngay, nên trang không bao giờ trống.
  Tắt mode là mọi thứ (chữ, vị trí, style) được trả về đúng nguyên bản tức thì.
- **Hiệu năng**: mọi phép đo layout được gom ở đầu frame và cache (tránh layout thrashing); đo được ~1.6ms/frame (trung
  vị), tối đa ~17ms.
- Tự tắt trên thiết bị cảm ứng và khi người dùng bật "giảm chuyển động" (`prefers-reduced-motion`).
- Tham số trong `config.swarm`: `flock` (tốc độ, lực, trọng số), `build.durations` (tốc độ dựng), `build.typeCps`
  (tốc độ viết), `build.mistakeRate` / `typoRate` (tần suất lỗi), `build.targets` (phần tử nào được dựng, bằng động tác gì).

Ý tưởng con trỏ multiplayer và trang tự dựng lấy cảm hứng từ Swarm của Joel Califa. Code ở đây viết mới hoàn toàn, không
dùng code hay asset từ Swarm hay repo `swarm-cursors`.

### Thêm theme particles mới

Thêm preset vào `PARTICLE_THEMES` trong `js/config.js` (có thể dùng `deepMerge(BASE_PARTICLES, {...})`), rồi thêm
một `<a data-theme="<key>">` trong khối `.themes` của `index.html`.

## Dịch vụ bên thứ ba

| Dịch vụ                        | Mục đích                  | Cấu hình                |
| ------------------------------ | ------------------------- | ----------------------- |
| GSAP 3.2.6 (cdnjs)             | Animation                 | `index.html`            |
| EmailJS 4.4.1 (jsDelivr)       | Gửi email từ form liên hệ | `config.emailjs`        |
| Google Analytics / Tag Manager | Thống kê truy cập         | `index.html` (`<head>`) |

> Public key EmailJS được thiết kế để public, nhưng nên giới hạn domain được phép trong dashboard EmailJS.
