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
│   └── color-*.css            # Bảng màu accent, nạp động khi người dùng chọn
├── js/
│   ├── config.js              # Cấu hình tập trung: section, timing, EmailJS, preset particles
│   ├── main.js                # Entry point, khởi tạo các module theo thứ tự
│   ├── modules/
│   │   ├── loader.js          # Màn hình intro
│   │   ├── navigation.js      # Menu fullscreen + chuyển section kèm hiệu ứng wipe
│   │   ├── color-switcher.js  # Render & xử lý bộ chọn màu accent
│   │   ├── theme-switcher.js  # Chọn nền particles (Particles / Clean / Snow / Dust)
│   │   ├── typewriter.js      # Hiệu ứng gõ chữ cho `.txt-rotate`
│   │   ├── cursor.js          # Con trỏ chuột tuỳ chỉnh
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
- **Không lặp markup**: bộ chọn màu được khai báo một lần trong `color-switcher.js` và render vào mọi
  `[data-component="color-changer"]`.
- **Điều hướng khai báo bằng data attribute**: link có `data-section="<key>"`, ánh xạ tới id section trong
  `config.sections`. Thêm section mới = thêm 1 dòng config + 1 link.

### Thêm bảng màu mới

1. Tạo `css/color-<tên>.css` (copy từ một file màu sẵn có).
2. Thêm `'color-<tên>'` vào `colorThemes` trong `js/config.js`.
3. Thêm class `.color-<tên>` (màu của ô swatch) trong `css/index.css`.

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
