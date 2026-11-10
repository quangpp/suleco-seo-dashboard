// Service worker — thứ khiến đây là PWA thật, không phải shortcut.
// Chỉ cache phần vỏ ứng dụng (HTML/CSS/JS). KHÔNG cache lời gọi API: dữ liệu mới nhất do app tự lưu
// vào localStorage và hiển thị ngay khi mở, nên cache thêm ở tầng này chỉ gây lẫn lộn bản cũ/mới.

const CACHE = "seo-suleco-v1";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Mọi thứ thuộc Google (API) đi thẳng ra mạng, không đụng cache.
  if (url.hostname.indexOf("google.com") !== -1 || url.hostname.indexOf("googleusercontent.com") !== -1) return;
  if (e.request.method !== "GET") return;

  // Vỏ ứng dụng: lấy cache trước cho nhanh, đồng thời cập nhật ngầm cho lần mở sau.
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
