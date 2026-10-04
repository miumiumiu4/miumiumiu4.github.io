/* 暮らしの困りごとアンケート（survey.html）
   ・LINEの中（LIFF）で開いた時：LINEのIDトークンを一緒に送る。GASが本物か確かめて、LINEのユーザーIDとして記録
   ・メールのリンク（?src=mail&m=番号.署名）から開いた時：その番号をGASが確かめて、メールリストの人と結びつける
   ・質問は QUESTIONS の中身を変えるだけで差しかえられる（GASは id をそのまま列にする）
   ・ブラウザには、書きかけの回答だけを保存します（送ったら消す）。LINEのIDやトークンは保存しません。 */
(function () {
  "use strict";
  var U = window.UI, S = window.SURVEY_CONFIG || {}, C = window.SITE_CONFIG || {};
  var live = !!S.GAS_URL;
  var params = new URLSearchParams(location.search);
  var DRAFT_KEY = "arigatou.survey." + (S.CAMPAIGN_ID || "x");
  var startedAt = Date.now();
  var idToken = "";

  /* ---------- 質問（「どんな機能がほしい？」ではなく「実際に何に困ったか」を聞く） ---------- */
  var QUESTIONS = [
    { id: "pains", type: "multi", req: true, other: true,
      title: "この1年で、家のことで「面倒だった・困った・調べた」ことは？", note: "あてはまるものを全部えらんでください",
      opts: ["エアコンの汚れ・におい・効き", "キッチン・換気扇の油汚れ", "お風呂・洗面のカビ・水あか", "洗濯機のにおい・汚れ", "トイレ・排水のつまりやにおい",
             "家電の故障・買いかえの判断", "片づけ・不用品の処分", "家の修理（水もれ・網戸・壁など）", "引っ越し・入退去のそうじ", "業者えらび・見積もりの比較"] },
    { id: "top", type: "text", req: true, min: 15, rows: 4,
      title: "その中でいちばん困ったことを、そのときの様子と一緒に教えてください",
      note: "例：「夏に子ども部屋のエアコンがカビくさくて、自分で洗えるのか業者に頼むべきか分からず、2時間くらい調べた」" },
    { id: "action", type: "single", req: true,
      title: "そのとき、どうしましたか？",
      opts: ["自分で調べて、自分でやった", "業者やお店に頼んだ", "家族や知り合いに頼んだ", "あきらめた・後まわしにした", "いまも困ったまま"] },
    { id: "search", type: "multi",
      title: "調べるときに使ったものは？",
      opts: ["Google などの検索", "YouTube", "Instagram・TikTok", "ChatGPT・Claude などのAI", "家族・知り合いに聞いた", "お店や業者に直接聞いた", "調べなかった"] },
    { id: "worry", type: "multi", max: 3, other: true,
      title: "家のことを業者に頼むとき、不安・面倒なことは？", note: "3つまで",
      opts: ["料金が最後まで分からない", "当日に追加料金を言われないか", "日程の調整・連絡がめんどう", "家に人を入れるのが不安", "ちゃんと作業してくれたか分からない",
             "どこに頼めばいいか比べるのが大変", "アフターや保証があるか分からない", "次はいつ頼めばいいか分からない"] },
    { id: "wish", type: "text", rows: 3,
      title: "「こんなのがあったら、ぜひ使いたい」と思うものはありますか？", note: "思いつきでかまいません（なくても大丈夫です）" },
    { id: "home", type: "single",
      title: "お住まい", opts: ["戸建て（持ち家）", "マンション（持ち家）", "賃貸マンション・アパート", "賃貸の戸建て", "その他"] },
    { id: "family", type: "single",
      title: "一緒に暮らしている人", opts: ["ひとり暮らし", "夫婦・パートナー", "小学生以下の子どもがいる", "中学生以上の子どもがいる", "親と同居・介護をしている", "その他"] },
    { id: "age", type: "single",
      title: "年代", opts: ["20代以下", "30代", "40代", "50代", "60代", "70代以上", "答えない"] },
    { id: "tester", type: "single",
      title: "できあがった試作品を、いちばん先に試してみたいですか？", note: "「はい」の方には、試作ができたときにご案内します。無理なお願いはしません",
      opts: ["はい、試したい", "15分ほどオンラインで話を聞かせてもいい", "今回は大丈夫"] }
  ];

  /* ---------- 画面を作る ---------- */
  function qHtml(q, i) {
    var badge = q.req ? '<span class="req">必須</span>' : '<span class="opt-ish">（任意）</span>';
    var head = '<legend class="lab">Q' + (i + 1) + "．" + U.esc(q.title) + badge + "</legend>" + (q.note ? '<p class="hint small muted">' + U.esc(q.note) + "</p>" : "");
    var body = "";
    if (q.type === "text") {
      body = '<textarea id="q-' + q.id + '" name="' + q.id + '" rows="' + (q.rows || 3) + '" maxlength="1500"></textarea>' +
        (q.min ? '<p class="sv-count" data-count="' + q.id + '">0文字（' + q.min + "文字以上）</p>" : "");
      head = head.replace("<legend", '<label for="q-' + q.id + '"').replace("</legend>", "</label>");
      return '<div class="sv-q" data-q="' + q.id + '"><div class="card">' + head + body + '<p class="msg" hidden></p></div></div>';
    }
    var kind = q.type === "multi" ? "checkbox" : "radio";
    body = q.opts.map(function (o) {
      return '<label class="opt"><input type="' + kind + '" name="' + q.id + '" value="' + U.esc(o) + '"> <span>' + U.esc(o) + "</span></label>";
    }).join("");
    if (q.other) body += '<label class="opt"><input type="' + kind + '" name="' + q.id + '" value="__other"> <span>その他</span></label>' +
      '<input type="text" name="' + q.id + '__other" maxlength="200" placeholder="その他の内容" aria-label="その他の内容" hidden>';
    return '<div class="sv-q" data-q="' + q.id + '"><fieldset class="card">' + head + body + '<p class="msg" hidden></p></fieldset></div>';
  }

  function render() {
    U.$("#sv-qs").innerHTML = QUESTIONS.map(qHtml).join("");
    U.$("#sv-winners").textContent = S.WINNERS || 100;
    U.$("#sv-amount").textContent = S.AMOUNT || 500;
    U.$("#sv-notice-days").textContent = S.NOTICE_DAYS || 14;
    if (S.DEADLINE) U.$("#sv-deadline").textContent = U.jpDateFull(S.DEADLINE) + " 23:59";
  }

  /* ---------- 回答を集める・確かめる ---------- */
  function valueOf(q) {
    var f = U.$("#sv-form");
    if (q.type === "text") return (f.elements[q.id].value || "").trim();
    var picked = U.$$('input[name="' + q.id + '"]:checked', f).map(function (n) { return n.value; });
    var other = f.elements[q.id + "__other"];
    picked = picked.map(function (v) { return v === "__other" ? "その他：" + (other ? other.value.trim() : "") : v; });
    return q.type === "single" ? (picked[0] || "") : picked;
  }
  function collect() { var a = {}; QUESTIONS.forEach(function (q) { a[q.id] = valueOf(q); }); return a; }

  function problem(q, v) {
    var empty = Array.isArray(v) ? v.length === 0 : !v;
    if (q.req && empty) return q.type === "text" ? "ご記入ください。" : "えらんでください。";
    if (q.min && v && v.replace(/\s/g, "").length < q.min) return q.min + "文字以上でお願いします（いま" + v.replace(/\s/g, "").length + "文字）。";
    if (q.max && Array.isArray(v) && v.length > q.max) return q.max + "つまでにしてください。";
    if (Array.isArray(v) ? v.some(function (x) { return x === "その他："; }) : v === "その他：") return "「その他」の内容を書いてください。";
    return "";
  }
  function mark(key, msg) {
    var box = U.$('.sv-q[data-q="' + key + '"]'); if (!box) return;
    box.classList.toggle("bad", !!msg);
    var m = U.$(".msg", box); m.hidden = !msg; m.textContent = msg || "";
  }
  function emailOk(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

  function validate() {
    var first = null;
    QUESTIONS.forEach(function (q) { var p = problem(q, valueOf(q)); mark(q.id, p); if (p && !first) first = q.id; });
    var em = U.$("#sv-email").value.trim();
    var pe = !em ? "メールアドレスを入れてください。" : !emailOk(em) ? "メールアドレスの形を確かめてください。" : "";
    mark("email", pe); if (pe && !first) first = "email";
    var pa = U.$("#sv-agree").checked ? "" : "同意のチェックをお願いします。";
    mark("agree", pa); if (pa && !first) first = "agree";
    return first;
  }

  function progress() {
    var need = QUESTIONS.filter(function (q) { return q.req; });
    var done = need.filter(function (q) { return !problem(q, valueOf(q)); }).length + (emailOk(U.$("#sv-email").value.trim()) ? 1 : 0) + (U.$("#sv-agree").checked ? 1 : 0);
    U.$("#sv-bar").style.width = Math.round(done / (need.length + 2) * 100) + "%";
  }

  /* ---------- 書きかけの保存（この端末だけ） ---------- */
  function saveDraft() {
    var d = { a: {}, o: {}, e: U.$("#sv-email").value };
    var f = U.$("#sv-form");
    QUESTIONS.forEach(function (q) {
      if (q.type === "text") d.a[q.id] = f.elements[q.id].value;
      else { d.a[q.id] = U.$$('input[name="' + q.id + '"]:checked', f).map(function (n) { return n.value; }); if (q.other) d.o[q.id] = f.elements[q.id + "__other"].value; }
    });
    U.store(function () { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); });
  }
  function loadDraft() {
    var raw = U.store(function () { return localStorage.getItem(DRAFT_KEY); }); if (!raw) return;
    var d; try { d = JSON.parse(raw); } catch (e) { return; }
    var f = U.$("#sv-form");
    QUESTIONS.forEach(function (q) {
      var v = d.a && d.a[q.id]; if (v === undefined) return;
      if (q.type === "text") f.elements[q.id].value = v;
      else U.$$('input[name="' + q.id + '"]', f).forEach(function (n) { n.checked = v.indexOf(n.value) >= 0; });
      if (q.other && d.o && d.o[q.id] !== undefined) f.elements[q.id + "__other"].value = d.o[q.id];
    });
    if (d.e && !U.$("#sv-email").value) U.$("#sv-email").value = d.e;
  }
  function clearDraft() { U.store(function () { localStorage.removeItem(DRAFT_KEY); }); }

  function syncUi(e) {
    var t = e && e.target;
    QUESTIONS.forEach(function (q) {
      if (q.other) { var on = !!U.$('input[name="' + q.id + '"][value="__other"]:checked'); var box = U.$('input[name="' + q.id + '__other"]'); box.hidden = !on; }
      if (q.min) { var len = (U.$("#q-" + q.id).value || "").replace(/\s/g, "").length; U.$('[data-count="' + q.id + '"]').textContent = len + "文字（" + q.min + "文字以上）"; }
      if (q.max) {   // 上限まで選んだら、残りは押せなくする
        var all = U.$$('input[name="' + q.id + '"]'), n = all.filter(function (x) { return x.checked; }).length;
        all.forEach(function (x) { x.disabled = !x.checked && n >= q.max; });
      }
    });
    if (U.$('.sv-q[data-q="email"].bad')) { var em = U.$("#sv-email").value.trim(); mark("email", !em ? "メールアドレスを入れてください。" : !emailOk(em) ? "メールアドレスの形を確かめてください。" : ""); }
    if (U.$('.sv-q[data-q="agree"].bad')) mark("agree", U.$("#sv-agree").checked ? "" : "同意のチェックをお願いします。");
    if (t && t.name) { var key = t.name.replace(/__other$/, ""); var q = QUESTIONS.filter(function (x) { return x.id === key; })[0]; if (q && U.$('.sv-q[data-q="' + key + '"].bad')) mark(key, problem(q, valueOf(q))); }
    progress();
    saveDraft();
  }

  /* ---------- 送る ---------- */
  function send(payload) {
    if (!live) return new Promise(function (r) { setTimeout(function () { r({ ok: true, demo: true, updated: false }); }, 500); });
    return fetch(S.GAS_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), redirect: "follow", credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || j.ok === false) { var e = new Error((j && j.message) || "いま受けつけられません。少し待ってから、もう一度お試しください。"); throw e; } return j; },
            function (err) { if (err && err.message && /[぀-ヿ]/.test(err.message)) throw err; throw new Error("つながりませんでした。電波のよいところで、もう一度お試しください。"); });
  }

  function onSubmit(e) {
    e.preventDefault();
    U.say(U.$("#sv-err"), "");
    var bad = validate();
    if (bad) { var n = U.$('.sv-q[data-q="' + bad + '"]'); n.scrollIntoView({ behavior: "smooth", block: "center" }); var f = U.$("input,textarea", n); if (f) f.focus({ preventScroll: true }); return; }
    var btn = U.$("#sv-submit"); btn.disabled = true; btn.textContent = "送っています…";
    var payload = {
      kind: "survey.submit",
      campaign: S.CAMPAIGN_ID,
      answers: collect(),
      email: U.$("#sv-email").value.trim(),
      idToken: idToken,                              // LINEの中で開いた時だけ入る
      src: idToken ? "line" : (params.get("src") || "web"),
      m: params.get("m") || "",                      // メールリストの番号.署名
      elapsedSec: Math.round((Date.now() - startedAt) / 1000),
      requestId: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random()
    };
    send(payload).then(function (j) {
      clearDraft();
      U.$("#sv-form").hidden = true;
      U.$("#sv-done-sub").textContent = (j.demo ? "（デモ表示のため、実際には記録されていません）" : "") +
        (j.updated ? "前の回答を、今回の内容で上書きしました。" : "抽選の結果は、しめきり後にお知らせします。");
      var done = U.$("#sv-done"); done.hidden = false; done.focus();
      showStats(j.stats);
    }, function (err) {
      U.say(U.$("#sv-err"), err.message, "err");
      btn.disabled = false; btn.textContent = "回答を送る";
    });
  }

  /* 答えてすぐ見られる「みんなの困りごと」 */
  function showStats(st) {
    var p = st ? Promise.resolve(st) : !live ? Promise.resolve(null)
      : fetch(S.GAS_URL + "?action=survey.stats&campaign=" + encodeURIComponent(S.CAMPAIGN_ID), { credentials: "omit" }).then(function (r) { return r.json(); }).catch(function () { return null; });
    p.then(function (s) {
      if (!s || !s.top) { s = { total: 0, top: QUESTIONS[0].opts.slice(0, 5).map(function (o, i) { return { label: o, n: 5 - i }; }), demo: true }; }
      var max = Math.max.apply(null, s.top.map(function (x) { return x.n; }).concat([1]));
      U.$("#sv-total").textContent = s.demo ? "デモ表示の見本です（例）。" : "これまでに " + s.total.toLocaleString("ja-JP") + " 人が答えてくださいました。";
      U.$("#sv-top").innerHTML = s.top.map(function (x) {
        var pct = s.total ? Math.round(x.n / s.total * 100) + "%" : "";
        return "<li><span>" + U.esc(x.label) + '</span><span class="num small">' + pct + '</span><span class="b"><i style="width:' + Math.round(x.n / max * 100) + '%"></i></span></li>';
      }).join("");
    });
  }

  /* ---------- 始める ---------- */
  function start(note) {
    var st = U.$("#sv-state");
    var msgs = [];
    if (!live) msgs.push('<p class="caution">デモ表示です。送っても記録されません。</p>');
    if (note) msgs.push(note);
    if (S.DEADLINE && U.ymd(new Date()) > S.DEADLINE) {
      st.innerHTML = '<div class="note" role="status">このアンケートは、しめきりました。ご協力ありがとうございました。結果は順番にお知らせしています。</div>';
      return;
    }
    st.innerHTML = msgs.join("");
    var f = U.$("#sv-form");
    f.hidden = false;
    loadDraft();
    f.addEventListener("input", syncUi);
    f.addEventListener("change", syncUi);
    f.addEventListener("submit", onSubmit);
    syncUi();
  }

  U.ready(function () {
    render();
    // LINEの中で開いた時だけ、LINEの本人確認を使う。LINEの外（メールのリンクなど）ではメールだけで答えられる
    if (!S.LIFF_ID || !window.liff) { start(""); return; }
    liff.init({ liffId: S.LIFF_ID }).then(function () {
      if (!liff.isInClient() && !liff.isLoggedIn()) { start(""); return; }   // 外部ブラウザでは無理にLINEログインさせない
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
      idToken = liff.getIDToken() || "";
      start(idToken ? '<p class="note small">LINEで開いています。結果のお知らせはLINEにも届きます。</p>' : "");
    }).catch(function () { start(""); });
  });
})();
