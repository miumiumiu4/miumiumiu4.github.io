/* 保証書（印刷できる）。マイページと同じ合言葉で、サーバーの答え（mypage の warranty）から作ります。作業が終わった予約だけ */
(function () {
  "use strict";
  var U = window.UI, C = window.SITE_CONFIG, P = window.SITE_PRICES, box = U.$("#warranty"), auth = MyAuth.get();
  function fail(text) {
    box.innerHTML = '<div class="card"><p>' + U.esc(text) + '</p><a class="btn" href="my.html">マイページへ</a></div>' + (!Api.live ? '<p class="note">デモ表示です。見本：<a href="warranty.html?j=DEMO-0002&amp;t=demo">作業が終わった予約の保証書</a></p>' : "");
    U.busy(box, false);
  }
  if (!auth) { fail("マイページのリンクから開いてください。"); return; }
  Api.mypage(Object.assign({ jobId: auth.jobId, token: auth.token }, auth.familyId ? { familyId: auth.familyId } : {})).then(function (v) {
    var w = v.warranty;
    if (!w.available) { fail("保証書は、作業が終わってから表示されます（作業後1週間の保証）。"); return; }
    var wp = P.policy.warranty;
    box.innerHTML = '<div class="acts no-print" style="margin-bottom:1rem"><button type="button" class="btn" id="print">印刷する</button><a class="btn ghost" href="my.html">マイページへもどる</a></div>' +
      '<article class="warr" aria-labelledby="w-h"><h1 id="w-h">保 証 書</h1><p style="text-align:center">' + U.esc(v.shop) + (C.GROUP_NOTE ? "（" + U.esc(C.GROUP_NOTE) + "）" : "") + "</p>" +
      '<dl class="kv"><dt>保証書の番号</dt><dd class="num">W-' + U.esc(v.job.jobId) + "</dd>" + (v.job.customerLabel ? "<dt>お客様</dt><dd>" + U.esc(v.job.customerLabel) + "</dd>" : "") + "<dt>作業した場所</dt><dd>" + U.esc(v.job.city) + "</dd><dt>作業の日</dt><dd>" + U.esc(U.jpDateFull(w.workDate)) + "</dd><dt>作業の内容</dt><dd>" + U.esc((w.items || []).join("、")) +
      "</dd><dt>保証の期間</dt><dd><b>" + U.esc(U.jpDateFull(w.workDate)) + "から" + U.esc(U.jpDateFull(w.until)) + "まで（作業後" + w.days + "日・1週間）</b></dd></dl>" +
      "<h2 style=\"font-size:1.1rem\">保証のお約束</h2><p>" + U.esc(wp.text) + "</p><h2 style=\"font-size:1.1rem\">対象外（仮）</h2><ul class=\"plain\">" + wp.excluded.map(function (x) { return "<li>" + U.esc(x) + "</li>"; }).join("") + "</ul>" +
      "<p>ご連絡先：電話 " + U.cfgHtml("PHONE") + "　メール " + U.cfgHtml("CONTACT_EMAIL") + "</p>" + (C.INVOICE_NO ? "<p class=\"small\">登録番号 " + U.esc(C.INVOICE_NO) + "</p>" : "") +
      '<p class="tiny">この保証書は、作業のあとに自動で作られた書類です。' + (v.demo ? "（デモ表示の見本です）" : "") + "</p></article>";
    U.busy(box, false);
    U.$("#print").addEventListener("click", function () { window.print(); });
  }, function (err) { fail(err.message); });
})();
