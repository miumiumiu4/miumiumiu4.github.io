/* 予約：エリア → 内容 → 日時（空き枠カレンダー ○△×）→ お客様の情報（最後だけ）→ 確認 → 確定
   ・お名前・電話・住所・メールは、画面の入力欄の中にだけあります。保存はしません（ブラウザの保存にも、アドレスにも入れません）。
   ・送り先は GAS_URL だけ。金額はサーバーで料金表から計算しなおします（画面の金額は表示用）。 */
(function () {
  "use strict";
  var U = window.UI, C = window.SITE_CONFIG;
  var S = { step: 1, area: "", input: null, quote: null, date: "", slotNo: 0, slotLabel: "", weekIdx: 0, byDate: {}, requestId: rid(), submitting: false, v: null };
  var steps = U.$$("[data-step]"), bar = U.$$("#steps li");

  function rid() { var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a); return "web-" + Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
  function tomorrow() { return U.addDays(U.ymd(new Date()), 1); }
  function flash(msg, kind) { U.say(U.$("#flash"), msg, kind); }

  /* ---------- 手順の切りかえ ---------- */
  function go(n, noScroll) {
    S.step = n; flash("");
    steps.forEach(function (s) { s.hidden = Number(s.getAttribute("data-step")) !== n; });
    U.$("#done").hidden = true;
    bar.forEach(function (li, i) { li.className = i + 1 < n ? "past" : ""; if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
    var h = U.$("[data-step='" + n + "'] h2");
    if (h && !noScroll) { h.scrollIntoView({ block: "start" }); h.focus({ preventScroll: true }); }
    if (n === 3) loadCal();
    if (n === 5) renderConfirm();
  }
  document.addEventListener("click", function (e) {
    var n = e.target.closest("[data-next]"), p = e.target.closest("[data-prev]");
    if (n && !n.disabled) { if (S.step === 1) { S.area = U.$("#area").value; } go(S.step + 1); }
    else if (p) go(S.step - 1);
  });

  /* ---------- 1. エリア ---------- */
  var qa = new URLSearchParams(location.search).get("area");
  var sel = U.$("#area");
  if (qa && U.$$("option", sel).some(function (o) { return o.value === qa; })) sel.value = qa;
  S.area = sel.value;
  Api.cap().then(function (c) {
    if (c && c.open === false) { var z = U.$("#closed"); z.hidden = false; z.textContent = (c.reason || "いまはインターネットの予約を止めています。") + " お電話でご相談ください。"; U.$$("[data-next]").forEach(function (b) { b.disabled = true; }); }
  }, function () { /* 読めなくても、予約はそのまま進めます */ });

  /* ---------- 2. 内容 ---------- */
  var seq = 0;
  Photos.mount(U.$("#photos"));
  MenuForm.mount(U.$("#menu"), { onChange: function (input) {
    S.input = input; var my = ++seq, nextBtn = U.$("[data-step='2'] [data-next]");
    if (!input.items.length) { S.quote = null; MenuForm.renderQuote(U.$("#quote-box"), null); nextBtn.disabled = true; return; }
    Api.quote(input).then(function (q) {
      if (my !== seq) return;
      S.quote = q; MenuForm.renderQuote(U.$("#quote-box"), q);
      if (q.needsQuote) { U.$("#quote-box").insertAdjacentHTML("beforeend", '<p class="caution">4LDK以上の空室清掃は見積りです。インターネットの予約は使えません。お電話かメールでご相談ください。</p>'); nextBtn.disabled = true; }
      else nextBtn.disabled = false;
    }, function (err) { if (my === seq) { U.showError(U.$("#quote-box"), err.message); nextBtn.disabled = true; } });
  } });
  U.$("[data-step='2'] [data-next]").disabled = true;

  /* ---------- 3. 日時（1週間ずつ） ---------- */
  var SHORT = function (label) { var m = String(label).match(/^[①②③](\d+):00〜(\d+):00$/); return m ? m[1] + "〜" + m[2] + "時" : label; };
  function loadCal() {
    var cal = U.$("#cal"); U.busy(cal, true); cal.innerHTML = '<p class="muted">空きを読みこんでいます…</p>';
    Api.availability(S.area, 60).then(function (d) {
      S.byDate = {}; (d.slots || []).forEach(function (s) { (S.byDate[s.date] = S.byDate[s.date] || []).push(s); });
      U.$("#cal-note").textContent = "空きは目安です。確定は、このあとの画面で行います。（更新：" + (d.updated ? new Date(d.updated).toLocaleString("ja-JP") : "") + "）";
      drawCal();
    }, function (err) { U.showError(cal, err.message + " 少し待ってから、もう一度ひらいてください。"); }).then(function () { U.busy(cal, false); });
  }
  function drawCal() {
    var from = U.addDays(tomorrow(), S.weekIdx * 7), cal = U.$("#cal"), html = "";
    var last = U.addDays(tomorrow(), 59);
    html += '<div class="cal-head"><button type="button" class="btn sm ghost" data-wk="-1"' + (S.weekIdx === 0 ? " disabled" : "") + '>← 前の7日</button><b>' + U.esc(U.jpDate(from)) + " から7日間</b><button type=\"button\" class=\"btn sm ghost\" data-wk=\"1\"" + (U.addDays(from, 7) > last ? " disabled" : "") + ">次の7日 →</button></div>";
    for (var k = 0; k < 7; k++) {
      var date = U.addDays(from, k), slots = S.byDate[date];
      if (!slots) continue;
      html += '<div class="cal-row" role="group" aria-label="' + U.esc(U.jpDate(date)) + '"><div class="d">' + U.esc(U.jpDate(date, false)) + "<small>" + U.WD[U.parseYmd(date).getDay()] + "曜日" + (U.isWeekday(date) ? "" : "") + "</small></div>";
      slots.slice().sort(function (a, b) { return a.windowNo - b.windowNo; }).forEach(function (s) {
        var on = S.date === date && S.slotNo === s.windowNo, closed = s.status === "×";
        var word = s.status === "○" ? "空きあり" : s.status === "△" ? "その日の最後の1枠" : "空きなし";
        html += '<button type="button" class="slot' + (s.status === "△" ? " few" : "") + '" data-date="' + date + '" data-no="' + s.windowNo + '" data-label="' + U.esc(s.label) + '"' + (closed ? " disabled" : ' aria-pressed="' + on + '"') +
          ' aria-label="' + U.esc(U.jpDate(date) + " " + s.label + " " + word) + '"><span class="t">' + U.esc(SHORT(s.label)) + '</span><span class="s" aria-hidden="true">' + s.status + "</span></button>";
      });
      html += "</div>";
    }
    cal.innerHTML = html;
  }
  U.$("#cal").addEventListener("click", function (e) {
    var w = e.target.closest("[data-wk]");
    if (w) { S.weekIdx = Math.max(0, S.weekIdx + Number(w.getAttribute("data-wk"))); drawCal(); return; }
    var b = e.target.closest(".slot"); if (!b || b.disabled) return;
    S.date = b.getAttribute("data-date"); S.slotNo = Number(b.getAttribute("data-no")); S.slotLabel = b.getAttribute("data-label");
    drawCal();
    var p = U.$("#picked"); p.hidden = false; p.textContent = U.jpDate(S.date) + "　" + S.slotLabel + " を選びました。";
    var btn = U.$("#to4"); btn.disabled = true;
    var my = ++seq;
    Api.quote(Object.assign({}, S.input, { date: S.date })).then(function (q) {
      if (my !== seq) return; S.quote = q; MenuForm.renderQuote(U.$("#quote-box2"), q); btn.disabled = false;
    }, function (err) { U.showError(U.$("#quote-box2"), err.message); });
  });

  /* ---------- 4. お客様の情報 ---------- */
  var form = U.$("#form");
  function fieldErr(field, msg) {
    var map = { name: "f-name", phone: "f-phone", email: "f-email", zip: "f-zip", address: "f-address", agree: "f-privacy" };
    U.$$(".err[id^='e-']", form).forEach(function (p) { p.hidden = true; });
    U.$$("[aria-invalid]", form).forEach(function (i) { i.removeAttribute("aria-invalid"); });
    var inp = U.$("#" + map[field]), p = U.$("#e-" + field);
    if (p) { p.textContent = msg; p.hidden = false; }
    if (inp) { inp.setAttribute("aria-invalid", "true"); inp.focus(); }
  }
  function half(s) { return String(s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }
  function collect() {
    var f = form.elements;
    return { customerType: form.querySelector("input[name=customerType]:checked").value, name: f.name.value.trim(), phone: half(f.phone.value).replace(/\D/g, ""), email: f.email.value.trim(), zip: half(f.zip.value).trim(),
      address: f.address.value.trim(), note: f.note.value.trim(), website: f.website.value, agreePrivacy: U.$("#f-privacy").checked, agreeTerms: U.$("#f-terms").checked };
  }
  function check(v) {
    if (!v.name) return ["name", "お名前を入れてください"];
    if (!/^0\d{9,10}$/.test(v.phone)) return ["phone", "電話番号は、市外局番から数字で入れてください（例：09012345678）"];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return ["email", "メールアドレスの形を確かめてください"];
    if (!/^\d{3}-?\d{4}$/.test(v.zip)) return ["zip", "郵便番号は7けたの数字で入れてください（例：222-0000）"];
    if (v.address.length < 5) return ["address", "住所を番地まで入れてください"];
    if (!v.agreePrivacy || !v.agreeTerms) return ["agree", "個人情報の取りあつかいと、利用規約・キャンセルの決まりに同意してください"];
    return null;
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = collect(), bad = check(v);
    if (bad) { fieldErr(bad[0], bad[1]); return; }
    fieldErr("", ""); S.v = v; go(5);
  });

  /* ---------- 5. 確認 ---------- */
  function renderConfirm() {
    var q = S.quote, v = S.v, area = (C.AREAS || []).filter(function (a) { return a.code === S.area; })[0] || {};
    var lines = q.breakdown.map(function (l) { return "<li><span>" + U.esc(l.label) + (l.qty > 1 ? " ×" + l.qty : "") + '</span><span class="num">' + (l.amount === 0 ? "無料" : U.yen(l.amount)) + "</span></li>"; }).join("");
    U.$("#confirm").innerHTML =
      '<dl class="kv"><dt>エリア</dt><dd>' + U.esc(area.label || "") + "</dd><dt>日時</dt><dd><b>" + U.esc(U.jpDate(S.date) + "　" + S.slotLabel) + "</b></dd><dt>お名前</dt><dd>" + U.esc(v.name) + "</dd><dt>電話</dt><dd>" + U.esc(v.phone) +
      "</dd><dt>メール</dt><dd>" + U.esc(v.email) + "</dd><dt>住所</dt><dd>" + U.esc(v.zip + "　" + v.address) + "</dd>" + (v.note ? "<dt>メモ</dt><dd>" + U.esc(v.note) + "</dd>" : "") +
      "<dt>お支払い</dt><dd>" + (v.customerType === "法人" ? "請求書払い（月末締め・翌月末払い）" : "予約のあとにカードを登録し、作業が終わってから決済") + ' <span class="tbd">仮</span></dd></dl>' +
      '<ul class="lines">' + lines + '</ul><div class="total"><span>総額（税込）</span><b class="num" data-total="' + q.total + '">' + U.yen(q.total) + "</b></div>" +
      '<p class="small muted">' + U.esc(q.parkingNote) + "。キャンセルは、前々日まで無料・前日50%・当日100%です。追加料金なしの約束（例外は料金のページ）：" + U.esc(q.disclaimer) + "</p>";
    U.$("#photo-opt").hidden = Photos.count() === 0;
  }

  /* ---------- 確定 ---------- */
  U.$("#submit").addEventListener("click", function () {
    if (S.submitting) return;
    S.submitting = true; var btn = U.$("#submit"); btn.disabled = true; btn.textContent = "送っています…"; U.$("#submit-err").innerHTML = "";
    var v = S.v;
    Api.book({ requestId: S.requestId, areaCode: S.area, items: S.input.items, options: S.input.options, date: S.date, slotNo: S.slotNo, customerType: v.customerType, name: v.name, phone: v.phone,
      email: v.email, zip: v.zip, address: v.address, note: v.note, agreePrivacy: v.agreePrivacy, agreeTerms: v.agreeTerms, website: v.website })
      .then(finish, function (err) {
        S.submitting = false; btn.disabled = false; btn.textContent = "予約を確定する";
        if (err.code === "unavailable") { S.date = ""; S.slotNo = 0; U.$("#picked").hidden = true; U.$("#to4").disabled = true; go(3); flash(err.message, "err"); return; }
        if (err.field && err.field !== "requestId" && err.field !== "items" && err.field !== "date" && err.field !== "slotNo" && err.field !== "areaCode") { go(4); fieldErr(err.field, err.message); return; }
        U.$("#submit-err").innerHTML = '<div class="err" role="alert">' + U.esc(err.message) + "</div>";
      });
  });

  function finish(r) {
    steps.forEach(function (s) { s.hidden = true; });
    bar.forEach(function (li) { li.className = "past"; li.removeAttribute("aria-current"); });
    var done = U.$("#done"); done.hidden = false;
    var demo = !Api.live;
    var myUrl = "my.html?j=" + encodeURIComponent(r.jobId) + "&t=" + encodeURIComponent(r.myToken);
    U.$("#done-body").innerHTML =
      '<div class="done"><b>受付番号：<span class="num" id="done-id">' + U.esc(r.jobId) + "</span></b><br>" + U.esc(r.message || "") + "</div>" +
      '<dl class="kv"><dt>日時</dt><dd>' + U.esc(U.jpDate(r.date) + "　" + (r.slotLabel || "")) + "</dd><dt>内容</dt><dd>" + U.esc((r.content || []).join("、")) + "</dd><dt>総額（税込）</dt><dd><b class=\"num\">" + U.yen(r.total) + "</b></dd><dt>お支払い</dt><dd>" + U.esc(r.payment || "") + ' <span class="tbd">仮</span></dd></dl>' +
      (demo ? '<p class="caution"><b>デモ表示です。</b>予約は実際には入っていません。メールも送っていません。</p>'
        : "<p>ご入力のメールアドレスあてに、受付のメールとマイページのリンクをお送りします。届かない時は、迷惑メールのフォルダもご確認ください。</p>") +
      (r.confirmed ? "" : "<p>お店が日時を確かめて、確定をご連絡します。</p>") +
      "<p>カードの登録など、お支払いのご案内は、お店からご連絡します（仮）。</p>" +
      '<div id="photo-up" aria-live="polite"></div>' +
      '<div class="acts"><a class="btn" id="to-my" href="' + U.esc(myUrl) + '">マイページを開く</a><a class="btn ghost" href="index.html">トップにもどる</a></div>';
    U.$("#h-done").focus(); done.scrollIntoView({ block: "start" });
    U.store(function () { sessionStorage.removeItem(MenuForm.DRAFT_KEY); });
    var send = U.$("#send-photos").checked && Photos.count() > 0;
    if (send) uploadPhotos(r);
    else Photos.clear();
  }

  function uploadPhotos(r) {
    var box = U.$("#photo-up"), list = Photos.forUpload(), ok = 0;
    box.innerHTML = '<p class="note">見積りの写真を送っています…</p>';
    list.reduce(function (p, ph) {
      return p.then(function () { return Api.bookPhoto({ jobId: r.jobId, token: r.myToken, seq: ph.seq, mime: ph.mime, data: ph.data }).then(function () { ok++; }, function () { /* 1枚だめでも続ける */ }); });
    }, Promise.resolve()).then(function () {
      box.innerHTML = ok === list.length ? '<p class="done">写真' + ok + "枚を送りました。</p>" : '<p class="caution">写真' + ok + "枚/" + list.length + "枚を送りました。送れなかった写真は、お店にメールでお送りください。</p>";
      Photos.clear();
    });
  }
})();
