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
│   │   ├── ambient-calendar.js # Lịch Sài Gòn: âm lịch (Hồ Ngọc Đức), trăng, mùa, dịp lễ, show trực tiếp
│   │   ├── ambient-cycle.js   # Ambient mode: một ngày rút gọn hoặc đồng bộ giờ thực (màu trời, mặt trời, mặt trăng)
│   │   ├── ambient-sky.js     # Ambient mode: trời, sao, mặt trời/trăng (đúng pha), mây, đường chân trời, đèn cửa sổ
│   │   ├── ambient-river.js   # Ambient mode: sông Sài Gòn, phản chiếu, gợn sóng, đường lấp lánh
│   │   ├── ambient-events.js  # Ambient mode: điều phối sự kiện (dịp, mùa, show trực tiếp), ánh sáng hắt, bloom, tiện ích vẽ
│   │   ├── ambient-events-calendar.js # Dịp lễ: giao thừa, 30/4, 2/9, Phật đản, Trung thu, Noel, Giờ Trái Đất...
│   │   ├── ambient-events-night.js   # Pháo hoa (cao + sà lan), drone show 3D, LED Landmark 81, laser, đèn pha, tàu trên sông
│   │   ├── ambient-events-sky.js     # Sao băng (cầu lửa vỡ mảnh), trạm vũ trụ/Starlink có HUD, sao chổi lớn, nguyệt thực...
│   │   ├── ambient-events-weather.js # Chớp (đánh trúng chóp tòa nhà), giông, mưa rào + cầu vồng, sương, mây che nắng
│   │   ├── ambient-events-towers.js  # Bitexco: show LED, song tấu với Landmark 81, trực thăng đáp sân đỗ, đếm ngược 2 tòa
│   │   ├── ambient-events-river.js   # Dưới sông: lục bình, sà lan, buýt sông, tàu cao tốc, cá quẫy, Lễ hội Sông nước
│   │   ├── ambient-events-day.js     # Khinh khí cầu (cả ban đêm), diều, bóng bay, bong bóng, hoa dầu, hoa mai
│   │   ├── ambient-events-flyby.js   # Vệt khói, chim chữ V, máy bay hạ cánh, trực thăng, dơi, én, máy bay giấy, băng rôn
│   │   ├── ambient-murmuration.js # Ambient mode: đàn con trỏ 3D (boids topo, sóng kích động, chuyển cảnh)
│   │   ├── ambient-scene.js   # Ambient mode: ghép các lớp + đồng hồ
│   │   ├── screen-atmosphere.js # Khí quyển màn hình tĩnh: ánh sáng nhật dạ, viền sáng avatar & hạt vi khí hậu
│   │   ├── ambient.js         # Ambient mode: phát hiện idle, chuyển cảnh vào/thoát, chế độ tiết kiệm
│   │   ├── dev-tester.js      # Test Lab: phát mọi sự kiện, giả lập ngày/giờ, console API
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
- **Khung cảnh**: nhìn từ Thủ Thiêm sang Quận 1 qua sông Sài Gòn: Bitexco ở giữa, Landmark 81 bên phải, dòng sông ở
  dưới (`ambient-river.js`). Sông phản chiếu bầu trời (đường chân trời sáng ở xa, trời sâu dần về phía người xem) pha màu
  phù sa, bóng các tòa nhà, ban đêm là đèn cửa sổ và đèn bờ kè kéo thành vệt gãy khúc, cùng mọi thứ đang sáng trên trời
  (pháo hoa, drone, sét). Đường đi lấp lánh dưới mặt trời thấp hoặc dưới trăng. Gợn sóng là các hàng ảnh dịch theo hai sóng
  sin, mạnh dần về phía người xem.
- **Một ngày rút gọn** (mặc định 40 phút một vòng, `cycleMinutes`): hoàng hôn → chạng vạng → blue hour → đêm → khuya →
  rạng đông → bình minh → sáng → trưa → chiều. Màu chuyển dần liên tục; vành đai Venus sau hoàng hôn và trước bình minh.
  Muốn bầu trời theo giờ thật ở Sài Gòn thì đặt `useRealTime: true`.
- **Ngày tháng là thật** (`ambient-calendar.js`, giờ Sài Gòn bất kể múi giờ của người xem):
  - _Âm lịch Việt Nam_ theo thuật toán Hồ Ngọc Đức (UTC+7, có tháng nhuận): Tết, Rằm tháng Giêng, Phật đản, Trung thu rơi
    đúng ngày. Đồng hồ hiện cả ngày âm lịch.
  - _Mặt trăng thật_: pha theo ngày âm (rằm là trăng tròn), mọc muộn dần mỗi ngày (trăng non treo phía tây sau hoàng hôn,
    trăng rằm mọc lúc chạng vạng), mặt sáng hướng về phía mặt trời và nằm nghiêng như ở vĩ độ 10°; không trăng vào mùng 1.
  - _Mùa_: mùa mưa (tháng 5–11) có mưa rào kèm sấm buổi chiều, giông đêm, chớp xa; mùa khô (12–4) trời quang, gió (thả
    diều nhiều hơn, nhất là chiều cuối tuần), sương mù buổi sáng quanh Tết (12–2). Tháng 4 mùa dầu bay, tháng 5 mùa sao bay.
  - _Mưa sao băng_ quanh đêm cực đại thật (Quadrantids, Lyrids, Eta Aquariids, Perseids, Orionids, Leonids, Geminids).
- **Dịp lễ** (`ambient-events-calendar.js`): đúng ngày thì xuất hiện nhiều (x3) và các show chạy trực tiếp đúng giờ; ngày
  thường vẫn có thể xuất hiện ngẫu nhiên (`occasionsAnyDay: true`, đặt `false` để chỉ chạy đúng ngày). Tương tự sự kiện theo
  mùa (giông đêm, sương mù, dầu bay).
  - _Giao thừa Tết & Tết Dương lịch_: **chuỗi liền mạch**: đếm ngược trên cả hai tòa (Landmark 81 hiện số 10…1, mỗi giây
    "bật" lên kèm vòng sáng; Bitexco nạp đầy như thanh tiến trình, đèn pha khép dần về thẳng đứng) → đúng 0:00 cả hai tòa
    lóe trắng, pháo hoa mở màn bằng một loạt bắn cùng lúc → hết pháo hoa thì hai tòa chúc mừng năm mới (tên năm Can Chi).
    Chạy trực tiếp 23:59–0:15 đúng đêm; ngày khác thỉnh thoảng xuất hiện ngẫu nhiên. Những đêm Tết: drone hình hoa mai, đèn
    lồng dọc bờ sông; ban ngày hoa mai bay.
  - _30/4 và 2/9_: pháo hoa 21:00–21:15 (trực tiếp), Landmark 81 hiện cờ đỏ sao vàng, drone xếp lá cờ bay phấp phới, ngôi
    sao, số năm kỷ niệm.
  - _Phật đản_: hoa đăng trôi ra từ cửa kênh Nhiêu Lộc – Thị Nghè (chùa Pháp Hoa thả hoa đăng mỗi mùa Phật đản).
  - _Trung thu_: đoàn rước đèn ông sao dọc bờ sông dưới trăng rằm.
  - _Noel_: Landmark 81 xanh – vàng, đèn nháy dọc bờ sông.
  - _Giờ Trái Đất_ (thứ Bảy cuối tháng 3, 20:30–21:30): thành phố tắt đèn **từng tòa một theo làn sóng** từ trái sang phải
    (cửa sổ, đèn đỉnh Landmark 81, vòng đèn sân đỗ Bitexco, đèn bờ kè; đèn đỏ hàng không vẫn sáng), dải Ngân Hà hiện ra, nến
    thắp dọc bờ sông và nến nổi xếp chữ "60+" trên mặt sông; hết giờ đèn bật lại theo làn sóng ngược. Không có trình diễn ánh
    sáng trong giờ đó.
  - _Programmer's Day_ (ngày thứ 256) và sinh nhật chủ site (`config.calendar.birthday`).
  - **Show trực tiếp**: khi thành phố bắn pháo hoa, cảnh tua nhanh sang đêm (time-lapse ~14 giây), giữ đêm suốt show rồi
    ngày chạy tiếp.
- **Sự kiện thường ngày, hai tầng**, chọn theo giờ, mùa, ngày, độ hiếm, không lặp lại các sự kiện vừa xem:
  - _Sự kiện chính_ (mỗi 1–2,5 phút, `eventGapMinutes`), có chú thích hai dòng dưới đồng hồ (địa điểm, tên): pháo hoa trên
    sông (pháo tầm cao từ sau thành phố + pháo tầm thấp và giàn pháo quạt từ sà lan trên sông; cúc, liễu, kamuro, cọ, vòng,
    saturn, tim, crossette, lấp lánh, pistil, dahlia, brocade), drone show (hoa sen 3D xoay, cầu Ba Son, cà phê phin, xe
    máy, đường chân trời, con trỏ của site, chữ; drone để lại vệt sáng khi chuyển hình), LED Landmark 81, laser, đèn pha,
    mưa sao băng, sao chổi lớn, nguyệt thực (chỉ đêm trăng tròn), quầng trăng, giông đêm, mưa rào rồi cầu vồng, mưa xa,
    sương mù, mây che nắng, tia nắng, diều, bóng bay, dầu bay...
  - _Bitexco_ (`ambient-events-towers.js`): show LED riêng cắt theo dáng búp sen (hoa sen ánh sáng nở từ chân tòa, sọc xoắn
    kép, equalizer nhảy theo nhạc, sóng sonar từ sân đỗ trực thăng; vòng đèn sân đỗ chạy đuổi), _song tấu với Landmark 81_
    (hai tòa thay phiên, một đốm sáng bay vòng cung từ đỉnh tòa này sang tòa kia rồi cả hai cùng diễn), _trực thăng đáp sân
    đỗ tầng 52_ (bay vào, chúc mũi rồi ngóc lên để dừng, lơ lửng, hạ xuống, cánh quạt chậm dần rồi quay nhanh lại, cất cánh;
    ban đêm có đèn rọi và sân đỗ bật sáng), kính Bitexco/Landmark bắt nắng chiều. Bitexco cũng tham gia các dịp (cờ, Tết,
    Noel, Programmer's Day). Sét có thể đánh trúng cột thu lôi trên chóp Landmark 81 / Bitexco (cả tòa sáng lên một nhịp).
  - _Dưới sông_ (`ambient-events-river.js`): lục bình trôi (có chùm hoa tím ban ngày), sà lan chở cát được tàu lai đẩy (đèn
    hành trình ban đêm), buýt đường sông, tàu cao tốc đi Vũng Tàu (cánh ngầm, bọt tung), cá quẫy; Lễ hội Sông nước: diễu hành
    thuyền hoa (đèn kết hình sen, ông sao, cá chép, lồng đèn, tim, hoa mai...), thác pháo hoa trên sà lan, flyboard + mô tô
    nước ban ngày. Mỗi thứ tự vẽ vệt sóng (kiểu Kelvin) và bóng phản chiếu đứt khúc.
  - _Chi tiết nhỏ_ (mỗi 20–45 giây): sao băng, trạm vũ trụ ISS / Thiên Cung (HUD khóa mục tiêu: 4 góc khung co lại, nhãn gõ
    dần, số liệu chạy; trạm đỏ dần rồi tắt khi vào bóng Trái Đất), đoàn Starlink "chuỗi ngọc" (lóe sáng lần lượt), vệ tinh
    lóe sáng, máy bay hạ cánh Tân Sơn Nhất, trực thăng, tàu nhà hàng, các thứ dưới sông, dơi, chim én, vệt khói máy bay, đàn
    chim chữ V, máy bay giấy.
  - _Sao chổi lớn_: hạt bụi thoát ra từ đầu sao chổi bị đẩy ra xa mặt trời nên đuôi bụi tự cong và xòe; đuôi ion xanh gồm
    nhiều sợi gợn sóng theo gió mặt trời, có cục khí chạy dọc đuôi, đôi khi đuôi bị đứt rồi mọc lại; đầu sao chổi "thở",
    thỉnh thoảng bùng nổ tạo vỏ bụi lan ra.
  - _Mây che nắng_: vài đám mây tích trôi ngang; bóng mây lướt qua các tòa nhà và mặt sông (phần còn lại ấm nắng); khi mây
    che mặt trời, cả thành phố tối đi, mép mây có viền bạc và tia nắng xòe ra sau mây; nắng quay lại thì kính Landmark 81 /
    Bitexco lóe sáng.
- **Ánh sáng & hậu kỳ**:
  - _Ánh sáng hắt lên trời_: mỗi quả pháo nổ, mỗi tia sét thắp sáng mây và lớp khói bụi quanh nó (một canvas 64×36 phóng
    lên toàn màn hình, blend `screen`, nằm sau đường chân trời nên thành phố vẫn là bóng đen trên nền trời sáng).
  - _Bloom_: pháo hoa, drone, laser, LED tỏa sáng như qua ống kính (bản sao 1/4 độ phân giải, làm mờ, blend `screen`).
  - _Sét_: kênh sét fractal (midpoint displacement) có nhánh; tia dẫn đường mọc xuống ~100 ms rồi mới bùng sáng, thêm 1–3
    lần chớp lại trên cùng kênh; tiếng sấm tới sau vài giây tùy khoảng cách, làm đàn chim giật mình.
  - _Mưa_: ba lớp độ sâu nghiêng theo gió (cùng hướng mây trôi), giọt rơi xuống sông tạo vòng gợn.
  - _Vệt pháo hoa_: làm mờ dần frame trước thay vì xóa; mỗi 3 frame mờ mạnh hơn một nhịp để các pixel alpha thấp không
    bị "kẹt" (lỗi làm tròn 8-bit gây quầng sáng ma).
- **Đàn con trỏ**: ~1.200 con trỏ bay như chim sáo trong không gian 3D (7 con gần nhất, Ballerini et al. 2008; sóng kích
  động lan qua đàn). Ban đêm phát sáng, ban ngày thành bóng đen. Giật mình né ra khi pháo hoa nổ gần hay có sấm.
- **Chuyển cảnh**: vào: trang Home lùi ra sau (mờ + thu nhỏ nhẹ), con trỏ tuôn ra thành cả đàn; thoát: cả đàn ùa về con trỏ.
- **Nhẹ máy**: bầu trời, mây, sao, đường chân trời vẽ một lần rồi để CSS (GPU) di chuyển; màu theo giờ áp dụng mỗi giây.
  Canvas sự kiện và bloom chỉ có bộ nhớ khi đang dùng (0×0 lúc nghỉ); sông chạy 30 fps ở nửa độ phân giải. Tự giảm số con
  trỏ nếu vượt `frameBudgetMs`, dừng hẳn khi tab bị ẩn. Đo trên Chrome: pháo hoa
  lớn + sông + bloom vẫn giữ nhịp khung hình đều. Mặc định chạy 60 fps cả khi cửa sổ không được focus (dùng làm nền màn hình
  phụ); đặt `ecoWhenUnfocused: true` để xuống 30 fps và bớt con trỏ khi đang ở cửa sổ khác.
- Tắt khi người dùng bật "giảm chuyển động". Tham số trong `config.ambient` và `config.calendar`.

### Khí quyển màn hình tĩnh (Screen Atmosphere)

Trang chủ tĩnh (`#header`) phản ứng với giờ trong ngày và các dịp lễ mà không cần vào Ambient: ánh sáng theo 10 thời
điểm trong ngày (giờ Sài Gòn), lời chào theo buổi, viền sáng chân dung theo hướng mặt trời, hạt vi khí hậu (bụi nắng chiều,
sương sớm, cánh mai dịp Tết), nhãn dịp lễ đang diễn ra (lấy từ `ambient-calendar.js`).

### Test Lab (`dev-tester.js`)

Mở bằng `Ctrl + Shift + D` / `F2`, nút **🧪 Test Lab** trong panel cài đặt, hoặc `?test` (nút nổi chỉ hiện khi có `?test`).

- **Sự kiện**: danh sách lấy thẳng từ registry, lọc theo nhóm (Lễ & dịp, Đêm, Thiên văn, Thời tiết, Ban ngày, Sông, Tòa nhà, Bay ngang)
  và tìm kiếm; click là phát ngay (Ambient mở và khóa, rê chuột không thoát).
- **Ngày & giờ**: chọn một ngày/giờ (có sẵn: giao thừa Tết Đinh Mùi 23:59, giao thừa dương lịch, 2/9 21:00, 30/4, Trung
  thu, Phật đản, Giờ Trái Đất, mùa dầu bay, sương mù mùa khô, Leonids...). Đồng hồ giả lập chạy tiếp từ thời điểm đó,
  nên chọn 23:59 sẽ thấy đếm ngược rồi pháo hoa thật sự. Bảng trạng thái hiện ngày âm, % trăng, mùa, dịp, show đang chạy.
- **Console**: `Portfolio.test.help()`, `trigger('fireworks')`, `list('occasion')`, `setDate('2027-02-05')`,
  `setHour(23.985)`, `setOccasion('midautumn')`, `reset()`.
- **Thử bằng URL**: `index.html?ambient&speed=40` (một ngày trong 1 phút), `&at=night` (golden, dusk, blue, night, late,
  predawn, sunrise, morning, noon, afternoon), `&event=drones`.

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
