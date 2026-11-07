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
│   └── color-*.css            # Bảng màu accent, nạp động khi người dùng chọn
├── js/
│   ├── config.js              # Cấu hình tập trung: section, timing, EmailJS, preset particles
│   ├── main.js                # Entry point, khởi tạo các module theo thứ tự
│   ├── modules/
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
│   │   └── contact-form.js    # Validate form + gửi mail qua EmailJS
│   └── vendor/
│       └── particles.min.js   # Thư viện bên thứ ba (không lint/format)
├── images/
└── ThanhTai_Nguyen_Resume_FullStackDeveloper.pdf
```

## Kiến trúc

- **Namespace duy nhất** `window.Portfolio`: mỗi file là một IIFE `'use strict'` gắn module của mình vào namespace,
  không rò biến toàn cục. Dùng script thường (không ES module) để site vẫn chạy khi mở qua `file://`.
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

### Swarm mode

**Bật mặc định.** Bật/tắt bằng công tắc **Swarm** ở góc trái dưới (có trên mọi trang), hoặc `Esc` để tắt. Lựa chọn được
nhớ trong `localStorage` (`config.swarm.defaultOn` quyết định trạng thái cho người mới vào).

- **Đàn chim** (`swarm-flock.js`): 16 con trỏ (tên công nghệ, màu lấy từ 6 bảng màu của site) bay theo thuật toán boids:
  tách nhau ra, bay cùng hướng, giữ đội hình, xoáy quanh chuột; khi chuột đứng yên thì lượn theo một đường cong khắp
  màn hình. Con trỏ xoay theo hướng bay như chim. Click để đàn tản ra.
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
