/* 作業の記録の1件（?id=記録番号） */
(function () {
  "use strict";
  var U = window.UI, box = U.$("#rec"), id = new URLSearchParams(location.search).get("id") || "";
  function done() { U.busy(box, false); }
  if (!id) { U.say(box, "記録の番号がありません。一覧から選んでください。", "caution"); done(); return; }
  Api.records(id).then(function (d) {
    var r = (d.logs || [])[0];
    if (!r) { U.say(box, "この記録は、見つかりません（公開が終わったかもしれません）。", "caution"); return; }
    U.$("#rec-title").textContent = r.title;
    document.title = r.title + " | " + (window.SITE_CONFIG.STORE_NAME || "");
    var rows = String(r.text || "").split("\n").map(function (l) { var i = l.indexOf("："); return i > 0 ? [l.slice(0, i), l.slice(i + 1)] : null; }).filter(Boolean);
    box.innerHTML = (d.demo ? '<p class="caution">デモ表示の見本です（例）。実際の記録ではありません。</p>' : "") +
      '<div class="card"><p><span class="tbd" style="color:var(--ink);border-color:var(--ink)">事実だけの記録</span></p><dl class="kv">' + rows.map(function (x) { return "<dt>" + U.esc(x[0]) + "</dt><dd>" + U.esc(x[1]) + "</dd>"; }).join("") + "</dl>" +
      '<p class="small muted">お客様のお名前・住所（番地）・電話・メールは載せません。オーナーが確認して承認した記録だけを公開しています。</p></div>';
  }, function (err) { U.showError(box, err.message); }).then(done);
})();
