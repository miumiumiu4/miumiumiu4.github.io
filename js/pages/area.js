/* エリアページ：この地域の作業の記録だけを出す */
(function () {
  "use strict";
  var U = window.UI, box = U.$("#area-records"), m = document.querySelector('meta[name="site:area"]');
  if (!box || !m) return;
  var label = (m.getAttribute("content").split("|")[1] || "");
  Api.records().then(function (d) {
    var logs = (d.logs || []).filter(function (r) { return r.areaLabel === label; }).reverse();
    box.innerHTML = logs.length ? logs.map(function (r) {
      return '<article class="card"><h3>' + U.esc(r.title) + "</h3><p class=\"small\">" + U.esc(U.jpDateFull(r.date)) + "　" + (r.units ? r.units + "台" : "") + (r.minutes ? "　約" + r.minutes + "分" : "") + '</p><a class="btn sm ghost" href="../record.html?id=' + encodeURIComponent(r.logId) + '">この記録を見る</a></article>';
    }).join("") : '<p class="note">この地域の公開中の記録は、まだありません。</p>';
  }, function (err) { U.showError(box, err.message); }).then(function () { U.busy(box, false); });
})();
