// 予約ページ（arigatou-booking）の住所が Cloudflare Pages に変わったための転送。
// https://miumiumiu4.github.io/arigatou-booking/<道>?<…>#<…> → https://arigatou-booking.pages.dev/<道>?<…>#<…>
// ?以降・#以降はそのまま渡す。足すのは次の2つだけ（新しいページが受け取る）：
//   _rf   … 元の参照元のドメイン（この転送を挟むと参照元が github.io に化けるため）
//   _sref … この住所のブラウザに覚えていた紹介コード（90日以内。住所が変わると覚えが引き継がれないため）
(function () {
  var NEW = 'https://arigatou-booking.pages.dev';
  var p = location.pathname;
  if (!/^\/arigatou-booking(\/|$)/.test(p)) return;
  var rest = p.replace(/^\/arigatou-booking/, '') || '/';
  var q = new URLSearchParams(location.search), add = [];
  try {
    var h = document.referrer ? new URL(document.referrer).hostname : '';
    if (h && h !== location.hostname && !q.get('_rf')) add.push('_rf=' + encodeURIComponent(h));
  } catch (_) {}
  try {
    var v = JSON.parse(localStorage.getItem('arigatou_ref') || 'null');
    if (!q.get('ref') && !q.get('_sref') && v && v.code && Date.now() - v.at < 90 * 864e5) add.push('_sref=' + encodeURIComponent(String(v.code).trim().slice(0, 30)));
  } catch (_) {}
  var s = location.search;
  if (add.length) s = (s ? s + '&' : '?') + add.join('&');
  location.replace(NEW + rest + s + location.hash);
})();
