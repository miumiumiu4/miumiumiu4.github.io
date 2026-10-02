/* 作業の記録の一覧（承認ずみの記録だけ。会社のGAS：records／デモ：見本） */
(function () {
  "use strict";
  var U = window.UI, box = U.$("#list");
  window.RecordView = {
    card: function (r) {
      return '<article class="card"><h3>' + U.esc(r.title) + '</h3><dl class="kv"><dt>日付</dt><dd>' + U.esc(U.jpDateFull(r.date)) + "</dd><dt>場所</dt><dd>" + U.esc(r.areaLabel) + "（市区町村まで）</dd><dt>台数</dt><dd>" + (r.units ? r.units + "台" : "記録なし") +
        "</dd><dt>所要時間</dt><dd>" + (r.minutes ? "約" + r.minutes + "分" : "記録なし") + '</dd></dl><a class="btn sm ghost" href="record.html?id=' + encodeURIComponent(r.logId) + '">この記録を見る</a></article>';
    }
  };
  Api.records().then(function (d) {
    var logs = (d.logs || []).slice().reverse();
    var demo = d.demo ? '<p class="caution" style="grid-column:1/-1">デモ表示の見本です（例）。実際の記録ではありません。</p>' : "";
    box.innerHTML = logs.length ? demo + logs.map(RecordView.card).join("") : '<p class="note">公開中の記録は、まだありません。</p>';
  }, function (err) { U.showError(box, err.message); }).then(function () { U.busy(box, false); });
})();
