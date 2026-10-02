/* マイページ：今日の予定と到着の幅／遅れ／追加料金の承認／日にち変更／保証書／設備カルテ／家族共有／誰が見るか
   合言葉は my-auth.js が受けとります。ここでは、サーバーの答え（mypage）をそのまま画面にします。 */
(function () {
  "use strict";
  var U = window.UI, auth = MyAuth.get(), root = U.$("#my"), msg = U.$("#msg"), V = null, reason = "";
  var REASONS = [["天気", "天気"], ["渋滞", "渋滞"], ["体調不良", "体調不良"], ["お客様の都合", "ご自分の都合・その他"]];

  function say(text, kind) { U.say(msg, text, kind); if (text) msg.scrollIntoView({ block: "nearest" }); }
  function who() { return Object.assign({ jobId: auth.jobId, token: auth.token }, auth.familyId ? { familyId: auth.familyId } : {}); }
  function noAuth(text) {
    root.innerHTML = '<div class="card"><h2>マイページを開けません</h2><p>' + U.esc(text) + "</p></div>" +
      (!Api.live ? '<p class="note">デモ表示です。見本のマイページ：<a href="my.html?j=DEMO-0001&amp;t=demo">今日の予定・遅れ・追加料金の見本</a>／<a href="warranty.html?j=DEMO-0002&amp;t=demo">作業が終わった予約の見本（保証書）</a></p>' : "");
    U.busy(root, false); U.$("#resend").hidden = false;
  }
  if (!auth) { noAuth("メールにお送りしたリンクから開いてください。"); return; }

  function load(keepMsg) {
    U.busy(root, true);
    return Api.mypage(who()).then(function (v) { V = v; draw(); if (!keepMsg) say(""); }, function (err) {
      MyAuth.clear(); noAuth(err.message);
    });
  }

  /* ---------- 画面 ---------- */
  function draw() {
    var owner = V.role === "owner", j = V.job, h = "";
    h += '<section class="stack" aria-labelledby="h-top"><div><p class="muted">' + U.esc(V.shop) + "</p><h2 id=\"h-top\" style=\"font-size:1.6rem\">" + (owner ? U.esc(j.customerLabel || "ご予約") : "ご家族として見ています") + "</h2><p class=\"small muted\">受付番号 <span class=\"num\">" + U.esc(j.jobId) + "</span>" + (V.demo ? " （デモ）" : "") + "</p></div>" +
      (owner ? "" : '<p class="note">ご家族の方は、予約の日時・保証書・設備カルテを見られます。お支払いや金額、変更の操作はできません。</p>') + "</section>";
    h += scheduleCard(owner);
    if (owner) h += extrasCard() + rescheduleCard();
    h += warrantyCard() + equipmentCard();
    if (owner) h += familyCard();
    h += whoCard();
    root.innerHTML = h; U.busy(root, false);
    U.$("#resend").hidden = false;
  }

  function scheduleCard(owner) {
    var j = V.job, t = V.today, h = '<section class="card ' + (t.isToday ? "sun" : "") + '" aria-labelledby="h-sched"><h2 id="h-sched">' + (t.isToday ? "今日の予定" : "ご予約") + "</h2>";
    h += "<p><b>" + (j.date ? U.esc(U.jpDate(j.date) + "　" + (j.slotLabel || "")) : "日時を調整中です") + "</b></p><p>" + U.esc(j.statusText || j.status) + "</p>";
    if (t.text) h += '<p id="today-text">' + U.esc(t.text) + "</p>";
    if (j.units) h += '<p class="small muted">内容：' + j.units + "台" + (j.options ? "（" + U.esc(j.options) + "）" : "") + "</p>";
    var d = t.delay;
    if (d) {
      h += '<div class="card warn" role="group" aria-label="遅れのお知らせ"><h3>到着が遅れそうです</h3><p>約<b>' + d.minutesLate + "分</b>の遅れの見込みです。申し訳ありません。" + (d.etaFrom ? "<br>到着の目安：<b class=\"eta\">" + U.esc(d.etaFrom + "〜" + d.etaTo) + "</b>" : "") + "</p>";
      if (d.choice) h += '<p class="done">お返事を受け付けました（' + U.esc(d.choice) + "）。</p>";
      else if (d.options.length) h += '<div class="acts">' + d.options.map(function (o, i) { return '<button type="button" class="btn' + (i ? " ghost" : "") + '" data-delay="' + o.key + '">' + U.esc(o.label) + "</button>"; }).join("") + '</div><p class="tiny muted">どれを選んでも、料金はかかりません。<span class="tbd">仮</span></p>';
      h += "</div>";
    }
    if (owner && V.money) h += '<dl class="kv"><dt>お支払い予定</dt><dd><b class="num">' + U.yen(V.money.finalAmount) + "</b>" + (V.money.extraApprovedTotal ? "（承認した追加 " + U.yen(V.money.extraApprovedTotal) + " を含む）" : "") + "<br><span class=\"small muted\">作業が終わってから。追加料金は、承認した分だけです。</span></dd></dl>";
    return h + "</section>";
  }

  function extrasCard() {
    var ex = V.extras || [], h = '<section class="card" aria-labelledby="h-extra"><h2 id="h-extra">追加料金のご相談</h2>';
    if (!ex.length) return h + '<p>いまは、追加のご相談はありません。</p><p class="small muted">現場で追加の作業が必要になった時は、理由の写真つきで、ここにお知らせします。<b>「承認」を押した作業だけ</b>が追加になります。見送っても、お申し込みの作業は行います。</p></section>';
    h += ex.map(function (x) {
      var wait = x.status === "相談中";
      return '<div class="card' + (wait ? " sun" : "") + '" data-extra="' + U.esc(x.extraId) + '"><h3>' + U.yen(x.amount) + "（税込）　" + (wait ? '<span class="tbd" style="color:var(--ink);border-color:var(--ink)">お返事待ち</span>' : "<span>" + U.esc(x.status === "承認" ? "承認しました" : "見送りました") + "</span>") + "</h3><p>理由：" + U.esc(x.reason) + "</p>" +
        (wait ? '<p class="small"><b>承認するまで、追加の作業も請求もしません。</b></p><div class="thumbs" data-photos></div><div class="acts"><button type="button" class="btn ghost" data-xphotos>理由の写真を見る（' + x.photoCount + '枚）</button><button type="button" class="btn" data-xdecide="承認">承認する（' + U.yen(x.amount) + 'を追加）</button><button type="button" class="btn ghost" data-xdecide="見送り">見送る（追加なしで進めます）</button></div>' : "") + "</div>";
    }).join("");
    return h + '<p>承認ずみの追加（合計）：<b class="num" id="extra-total">' + U.yen(V.money.extraApprovedTotal) + '</b>　<span class="small muted">承認するまで請求しません</span></p></section>';
  }

  function rescheduleCard() {
    var r = V.reschedule, h = '<section class="card" aria-labelledby="h-resched"><h2 id="h-resched">日にちを変える</h2>';
    if (r.open) {
      h += '<p class="small">' + U.esc(r.open.rule) + "</p><p>料金：<b class=\"num\" id=\"resched-fee\">" + U.yen(r.open.fee) + "</b></p>";
      h += r.open.candidates.length ? '<p class="lab">次の日にちをえらんでください（1タップで変わります）</p><div class="acts">' + r.open.candidates.map(function (c, i) { return '<button type="button" class="btn" data-rpick="' + i + '" data-rid="' + U.esc(r.open.requestId) + '">' + U.esc(U.jpDate(c.date) + " " + c.label) + "</button>"; }).join("") + "</div>" : '<p class="caution">いま空いている候補がありません。お電話かメールでご相談ください。</p>';
      return h + '<div class="acts"><button type="button" class="btn ghost" data-rcancel="' + U.esc(r.open.requestId) + '">やめる</button></div></section>';
    }
    if (!r.canRequest) return h + "<p>この予約は、いま日にちを変えられません。ご相談は、お電話かメールでお願いします。</p></section>";
    h += '<p class="small">' + U.esc(r.policyText) + "</p>";
    if (r.ifCustomerReason) h += '<p class="small">いま、ご自分の都合で変えると：<b>' + (r.ifCustomerReason.fee ? U.yen(r.ifCustomerReason.fee) : "無料") + "</b>（" + U.esc(r.ifCustomerReason.rule) + "）</p>";
    h += '<p class="lab" id="rs-lab">変える理由（いちばん近いもの）</p><div class="chips" role="group" aria-labelledby="rs-lab">' + REASONS.map(function (x) { return '<button type="button" class="chip" data-reason="' + U.esc(x[0]) + '" aria-pressed="' + (reason === x[0]) + '">' + U.esc(x[1]) + "</button>"; }).join("") + "</div>";
    return h + '<div class="acts"><button type="button" class="btn" id="rs-go"' + (reason ? "" : " disabled") + ">料金と、空いている日を見る</button></div></section>";
  }

  function warrantyCard() {
    var w = V.warranty, h = '<section class="card" aria-labelledby="h-warr"><h2 id="h-warr">保証書</h2>';
    return h + (w.available ? '<p>作業後1週間（' + U.esc(U.jpDate(w.workDate)) + "から" + U.esc(U.jpDate(w.until)) + "まで）の保証書です。</p><a class=\"btn\" href=\"warranty.html\">保証書を開く・印刷する</a>" : "<p>作業が終わると、ここから保証書を印刷できます（作業後1週間の保証）。</p>") + "</section>";
  }

  function equipmentCard() {
    var eq = V.equipment || [], h = '<section class="card" aria-labelledby="h-eq"><h2 id="h-eq">おうちのエアコン（設備カルテ）</h2>';
    if (!eq.length) return h + "<p>カルテは、まだありません。作業のあとに、お店がエアコンごとの記録を残します。次回のお掃除の目安は、前回の1年後です。</p></section>";
    return h + eq.map(function (e) {
      return '<div class="card"><h3>' + U.esc(e.place || "エアコン") + '</h3><dl class="kv"><dt>メーカー・型番</dt><dd>' + U.esc((e.maker || "未確認") + " " + (e.modelNo || "")) + "</dd><dt>前回のお掃除</dt><dd>" + U.esc(U.jpDateFull(e.lastCleanedDate)) + "</dd><dt>次回の目安</dt><dd>" + U.esc(U.jpDateFull(e.nextDueDate)) + "ごろ</dd><dt>次回のお知らせ</dt><dd>" + (e.reminder ? "お送りします（いつでも止められます）" : "お送りしません") + '</dd></dl><p class="tiny muted">目安です。故障や汚れの状態を決めるものではありません。</p></div>';
    }).join("") + "</section>";
  }

  function familyCard() {
    var f = (V.family || []).filter(function (x) { return x.status !== "取り消し済み"; });
    var h = '<section class="card" aria-labelledby="h-fam"><h2 id="h-fam">ご家族と一緒に見る</h2><p class="small">ご家族をマイページに招待できます。<b>お客様が同意した方にだけ</b>見えます。</p>' +
      '<div class="tbl"><table><thead><tr><th scope="col">招待された方に</th><th scope="col"></th></tr></thead><tbody><tr><td>見える</td><td>予約の日時・保証書・設備カルテ</td></tr><tr><td>見えない</td><td>お支払い・金額・追加料金・日にちの変更</td></tr></tbody></table></div>';
    h += f.length ? '<ul class="lines">' + f.map(function (x) { return "<li><span><b>" + U.esc(x.name) + '</b>　<span class="small muted">' + U.esc(x.email) + "</span><br><span class=\"tiny\">" + (x.status === "参加中" ? "参加中" : "招待を送りました") + '</span></span><button type="button" class="btn sm ghost" data-frev="' + U.esc(x.familyId) + '">取り消す</button></li>'; }).join("") + "</ul>" : '<p class="small muted">まだ招待していません。</p>';
    h += '<form id="fam-form" class="stack" novalidate><div class="field"><label for="fam-name">ご家族の呼び名</label><input id="fam-name" autocomplete="off" placeholder="例：お母さん"></div><div class="field"><label for="fam-mail">ご家族のメールアドレス</label><input id="fam-mail" type="email" autocomplete="off" placeholder="例：family@example.com"></div>' +
      '<label class="opt"><input type="checkbox" id="fam-ok"> <span>この方に、上の「見える」ものを見せることに同意します（いつでも取り消せます）</span></label><div id="fam-msg" aria-live="polite"></div><div class="acts"><button class="btn" type="submit">招待のメールを送る</button></div></form></section>';
    return h;
  }

  function whoCard() {
    return '<section class="card" aria-labelledby="h-who"><h2 id="h-who">あなたの情報を、誰が見るか</h2><div class="tbl"><table><thead><tr><th scope="col">誰が</th><th scope="col">見えるもの</th></tr></thead><tbody>' +
      "<tr><td>この店だけ</td><td>お名前・電話・住所・メール。このお店の中だけで使います。</td></tr><tr><td>担当の職人</td><td>作業の前々日から。作業に必要な、住所・作業内容・お名前（様）だけ。</td></tr>" +
      "<tr><td>ほかの会社・本部</td><td>番号だけ（受付番号・日付・金額など）。お名前・住所・電話・メールは見えません。</td></tr><tr><td>ご家族</td><td>ご本人が同意した方だけ。予約の日時・保証書・設備カルテ。</td></tr></tbody></table></div>" +
      '<p class="tiny muted">このリンクは、安全のため1回きり・期限つきです。開けなくなったら、下の「リンクを送ってもらう」をお使いください。</p></section>';
  }

  /* ---------- 操作 ---------- */
  function run(promise, after) {
    return promise.then(function (r) { say(r.message || "", "done"); return after ? after(r) : load(true); }, function (err) { say(err.message, "err"); });
  }
  root.addEventListener("click", function (e) {
    var t = e.target;
    var dl = t.closest("[data-delay]");
    if (dl) { run(Api.delayAnswer(Object.assign(who(), { delayId: V.today.delay.delayId, choice: dl.getAttribute("data-delay") }))); return; }
    var ph = t.closest("[data-xphotos]");
    if (ph) {
      var box = ph.closest("[data-extra]"), id = box.getAttribute("data-extra");
      Api.extraPhotos(Object.assign(who(), { extraId: id })).then(function (r) {
        box.querySelector("[data-photos]").innerHTML = (r.photos || []).map(function (u, i) { return '<img src="' + U.esc(u) + '" alt="追加の相談の理由の写真 ' + (i + 1) + '">'; }).join("") || "<p>写真がありません。</p>";
      }, function (err) { say(err.message, "err"); });
      return;
    }
    var xd = t.closest("[data-xdecide]");
    if (xd) {
      var dec = xd.getAttribute("data-xdecide"), ex = xd.closest("[data-extra]").getAttribute("data-extra");
      if (!window.confirm(dec === "承認" ? "追加料金を承認しますか？承認した金額が、お支払いに加わります。" : "追加の作業を見送りますか？（お申し込みの作業は行います）")) return;
      run(Api.extraDecide(Object.assign(who(), { extraId: ex, decision: dec }))); return;
    }
    var rc = t.closest("[data-reason]");
    if (rc) { reason = rc.getAttribute("data-reason"); draw(); var g = U.$("#rs-go"); if (g) g.focus(); return; }
    if (t.closest("#rs-go")) { run(Api.rescheduleRequest(Object.assign(who(), { reason: reason })), function () { reason = ""; return load(true); }); return; }
    var rp = t.closest("[data-rpick]");
    if (rp) { if (!window.confirm("この日にちに変えますか？")) return; run(Api.rescheduleConfirm(Object.assign(who(), { requestId: rp.getAttribute("data-rid"), idx: Number(rp.getAttribute("data-rpick")) }))); return; }
    var rx = t.closest("[data-rcancel]");
    if (rx) { run(Api.rescheduleCancel(Object.assign(who(), { requestId: rx.getAttribute("data-rcancel") }))); return; }
    var fr = t.closest("[data-frev]");
    if (fr) { if (!window.confirm("この方への共有を取り消しますか？")) return; run(Api.familyRevoke(Object.assign(who(), { targetId: fr.getAttribute("data-frev") }))); }
  });
  root.addEventListener("submit", function (e) {
    if (e.target.id !== "fam-form") return;
    e.preventDefault();
    var fm = U.$("#fam-msg");
    Api.familyInvite(Object.assign(who(), { name: U.$("#fam-name").value, email: U.$("#fam-mail").value, consent: U.$("#fam-ok").checked })).then(function (r) { say(r.message, "done"); return load(true); }, function (err) { U.say(fm, err.message, "err"); });
  });

  /* リンクの再送 */
  U.$("#resend-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var out = U.$("#resend-msg");
    Api.mylink({ jobId: U.$("#r-job").value.trim(), email: U.$("#r-email").value.trim() }).then(function (r) { U.say(out, r.message, "done"); }, function (err) { U.say(out, err.message, "err"); });
  });

  load();
})();
