// Service worker — thứ khiến đây là PWA thật, không phải shortcut.
// Chỉ cache phần vỏ ứng dụng (HTML/CSS/JS). KHÔNG cache lời gọi API: dữ liệu mới nhất do app tự lưu
// vào localStorage và hiển thị ngay khi mở, nên cache thêm ở tầng này chỉ gây lẫn lộn bản cũ/mới.
//
// CHIẾN LƯỢC: MẠNG TRƯỚC, CACHE LÀ LƯỚI AN TOÀN.
// Bản đầu dùng cache-trước và nó sai thật: sau khi deploy bản mới, service worker cũ vẫn phục vụ
// CSS/JS từ cache nên app hiện giao diện CŨ, phải mở tới lần thứ hai mới thấy thay đổi. Tệ hơn,
// service worker mới chỉ được cài khi chính file sw.js đổi byte — sửa CSS mà không sửa file này thì
// bản cũ sống mãi. Nay mỗi lần mở (có mạng) đều lấy bản mới; mất mạng mới rơi về cache.
// Phần vỏ chỉ vài KB nên chi phí mạng không đáng kể, trong khi app vốn đã phải gọi API qua mạng.

const CACHE = "seo-suleco-v2";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const NET_TIMEOUT_MS = 3000; // mạng yếu thì đừng bắt người dùng chờ — rơi về cache cho nhanh

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
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cached = await caches.match(e.request);

    try {
      // Chạy đua với đồng hồ: mạng chậm quá thì dùng bản cache thay vì treo màn hình.
      const res = await Promise.race([
        fetch(e.request),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NET_TIMEOUT_MS)),
      ]);
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    } catch (err) {
      // Mất mạng hoặc quá chậm — đây mới là lúc cache phát huy tác dụng.
      if (cached) return cached;
      throw err;
    }
  })());
});
