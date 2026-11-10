// SEO Suleco — giao diện điện thoại.
// Dữ liệu lấy từ web app Apps Script (chỉ trả JSON đã dựng sẵn nên rất nhanh).
// URL + token lưu trong localStorage của máy, KHÔNG nằm trong mã nguồn vì trang này công khai.

const LS_URL = "seo_api_url", LS_TOKEN = "seo_api_token", LS_DATA = "seo_last_data";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => (n === null || n === undefined || n === "") ? "—"
  : Number(n).toLocaleString("vi-VN");

function apiUrl() {
  const base = localStorage.getItem(LS_URL), token = localStorage.getItem(LS_TOKEN);
  if (!base || !token) return null;
  return base + (base.indexOf("?") === -1 ? "?" : "&") + "token=" + encodeURIComponent(token);
}

// ---- Xu hướng: với VỊ TRÍ thì số NHỎ hơn mới là tốt, nên phải đảo dấu riêng ----
function trend(now, prev, betterWhenLower, digits) {
  if (prev === null || prev === undefined || prev === "") return { cls: "flat", text: "" };
  let d = Number(now) - Number(prev);
  if (betterWhenLower) d = -d;
  if (Math.abs(d) < 0.01) return { cls: "flat", text: "→ không đổi" };
  const v = Math.abs(d).toFixed(digits || 0);
  return d > 0 ? { cls: "up", text: "▲ +" + v } : { cls: "down", text: "▼ −" + v };
}

function tile(k, v, t) {
  return `<div class="tile"><div class="k">${esc(k)}</div><div class="v">${v}</div>
    <div class="t ${t ? t.cls : ""}">${t ? esc(t.text) : ""}</div></div>`;
}

function render(d) {
  const parts = [];

  if (d.overview) {
    const o = d.overview, p = o.prev;
    parts.push(`<section><h2>Toàn site · kỳ ${esc(o.ky)}</h2><div class="grid">
      ${tile("Vị trí trung bình", num(o.viTriTB), trend(o.viTriTB, p && p.viTriTB, true, 1))}
      ${tile("CTR toàn site", num(o.ctr) + "%", trend(o.ctr, p && p.ctr, false, 2))}
      ${tile("Clicks / 28 ngày", num(o.clicks), trend(o.clicks, p && p.clicks, false))}
      ${tile("Impressions / 28 ngày", num(o.impressions), trend(o.impressions, p && p.impressions, false))}
    </div></section>`);
  }

  const s = d.summary || {};
  parts.push(`<section><h2>Sản xuất nội dung</h2><div class="grid">
    ${tile("Đăng tháng này", num(s.publishedThisMonth))}
    ${tile("Đã tối ưu (luỹ kế)", num(s.optimizedTotal))}
    ${tile("Chờ duyệt", num(s.pendingReview))}
    ${tile("Cần tối ưu còn lại", num(s.priorityRemaining))}
    ${tile("Trang Top 10", num(s.top10))}
    ${tile("Trang Top 3", num(s.top3))}
  </div></section>`);

  const alerts = d.alerts || [];
  const icon = { 1: "🔴", 2: "🟡", 3: "🟢" };
  parts.push(`<section><h2>Cảnh báo & việc cần làm (${alerts.length})</h2>` + (
    alerts.length === 0
      ? `<div class="empty">Chưa có cảnh báo nào.<br><small>Trang chưa đủ ${esc(d.maturityDays)} ngày thì chưa được đánh giá.</small></div>`
      : alerts.map(a => `<div class="alert l${a.level}">
          <div class="kind">${icon[a.level] || ""} ${esc(a.kind)}</div>
          <div class="subj">${esc(a.subject)}</div>
          <div class="verdict">${esc(a.verdict)}</div>
          <div class="action">${esc(a.action)}</div>
        </div>`).join("")
  ) + `</section>`);

  const opt = d.optimized || [];
  if (opt.length) {
    parts.push(`<section><h2>Bài tối ưu đã đủ ${esc(d.maturityDays)} ngày</h2>
      <table><tr><th>Trang</th><th class="num">Δ Impr</th><th class="num">Δ Vị trí</th></tr>
      ${opt.map(p => `<tr>
        <td class="u">${p.stale ? "⚠️ " : ""}${esc(p.url)}<br><small>${esc(p.age)} ngày</small></td>
        <td class="num ${Number(p.deltaImpr) > 0 ? "up" : Number(p.deltaImpr) < 0 ? "down" : ""}">${num(p.deltaImpr)}</td>
        <td class="num ${Number(p.deltaPos) > 0 ? "up" : Number(p.deltaPos) < 0 ? "down" : ""}">${num(p.deltaPos)}</td>
      </tr>`).join("")}</table></section>`);
  }

  const pub = d.published || [];
  if (pub.length) {
    parts.push(`<section><h2>Bài đã đăng</h2>
      <table><tr><th>Tiêu đề</th><th class="num">Impr</th><th class="num">Vị trí</th></tr>
      ${pub.map(i => `<tr>
        <td>${esc(i.title)}<br><small>${i.age === null ? "chưa có ngày"
          : i.mature ? i.age + " ngày ✓" : i.age + " ngày (chưa đủ)"}${i.stale ? " · ⚠️ số liệu cũ" : ""}</small></td>
        <td class="num">${i.missingUrl ? "—" : num(i.impressions)}</td>
        <td class="num">${i.missingUrl ? "—" : num(i.pos)}</td>
      </tr>`).join("")}</table></section>`);
  }

  $("app").innerHTML = parts.join("");
}

function setStamp(text, stale) {
  $("stamp").textContent = text;
  $("stamp").className = "stamp" + (stale ? " stale" : "");
}

async function load(showSpinner) {
  const url = apiUrl();
  if (!url) { $("setup").classList.remove("hidden"); return; }

  // Hiện ngay bản lưu lần trước để mở app là thấy số liệu, không phải nhìn màn hình trống chờ mạng.
  const cached = localStorage.getItem(LS_DATA);
  if (cached) {
    try { const d = JSON.parse(cached); render(d); setStamp("Dữ liệu lưu lúc " + d.updatedAtText, true); }
    catch (e) { /* bỏ qua bản hỏng */ }
  }

  if (showSpinner) $("refresh").classList.add("spin");
  try {
    const res = await fetch(url, { redirect: "follow", cache: "no-store" });
    const d = await res.json();
    if (d.error) {
      setStamp("Lỗi: " + (d.message || d.error), true);
      if (d.error === "unauthorized") { $("setup").classList.remove("hidden"); $("setup-err").textContent = "Token không đúng."; }
      return;
    }
    localStorage.setItem(LS_DATA, JSON.stringify(d));
    render(d);
    setStamp("Cập nhật lúc " + d.updatedAtText, false);
  } catch (e) {
    setStamp(cached ? "Ngoại tuyến — đang xem bản lưu" : "Không tải được dữ liệu", true);
  } finally {
    $("refresh").classList.remove("spin");
  }
}

$("save").onclick = () => {
  const u = $("in-url").value.trim(), t = $("in-token").value.trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(u)) {
    $("setup-err").textContent = "URL phải có dạng https://script.google.com/macros/s/..../exec"; return;
  }
  if (!t) { $("setup-err").textContent = "Chưa nhập token."; return; }
  localStorage.setItem(LS_URL, u); localStorage.setItem(LS_TOKEN, t);
  $("setup").classList.add("hidden"); $("setup-err").textContent = "";
  load(true);
};

$("refresh").onclick = () => load(true);
load(false);

if ("serviceWorker" in navigator) {
  // Đường dẫn tương đối để chạy được cả khi đặt ở thư mục con (GitHub Pages) lẫn ở gốc (Netlify).
  navigator.serviceWorker.register("sw.js").catch(e => console.log("SW lỗi:", e));
}
