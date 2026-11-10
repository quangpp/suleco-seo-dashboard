# Dashboard PWA

Giao diện tĩnh cho điện thoại, đọc dữ liệu từ một Google Apps Script web app trả JSON.
Cài được vào màn hình chính, chạy toàn màn hình, mở ra có dữ liệu ngay kể cả khi mất mạng
(hiển thị bản lưu lần trước trong khi tải lại nền).

## Cấu hình

Không có khoá hay định danh nào nằm trong mã nguồn. Lần đầu mở, app hỏi:

- **URL web app** — dạng `https://script.google.com/macros/s/.../exec`
- **Token** — sinh từ phía Apps Script

Cả hai lưu trong `localStorage` của máy người dùng.

## Chạy thử cục bộ

Service worker cần HTTPS hoặc `localhost`:

```bash
python3 -m http.server 8777
```

## Triển khai

Đẩy toàn bộ thư mục lên nhánh `main`, bật GitHub Pages (Source: `main` / root).
Mọi đường dẫn đều tương đối nên chạy được cả ở thư mục con lẫn ở gốc tên miền.

## Cấu trúc

| File | Vai trò |
|---|---|
| `index.html` | Khung trang + hộp nhập URL/token lần đầu |
| `app.js` | Gọi API, dựng giao diện, lưu bản offline |
| `sw.js` | Service worker — cache vỏ ứng dụng, không cache API |
| `style.css` | Giao diện |
| `manifest.webmanifest` | Thông tin cài đặt app |
| `icon-192.png`, `icon-512.png` | Icon màn hình chính |
