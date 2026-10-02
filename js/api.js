/* 会社のGAS（ウェブアプリ）との話しかた。
   ・読むだけ → GET。書く・合言葉があるもの → POST（Content-Type: text/plain なので、ブラウザの事前確認（preflight）が要らない）
   ・時間切れ・つながらない時は、読むものは1回やりなおす。予約は requestId があるので、やりなおしても二重にならない
   ・エラーは「お客様に見せてよい日本語」にして返す。個人情報（名前・電話・住所・メール・合言葉）はログに出さない
   GAS_URL が空の時は、デモ表示（js/demo.js）に切りかえます。 */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var live = !!C.GAS_URL;

  function ApiError(message, code) { var e = new Error(message); e.name = "ApiError"; e.code = code || "failed"; return e; }

  var FRIENDLY = {
    rate_limited: "アクセスが集まっています。少し待ってから、もう一度お試しください。",
    network: "つながりませんでした。電波のよいところで、もう一度お試しください。",
    timeout: "時間がかかっています。少し待ってから、もう一度お試しください。",
    parse: "うまく読み取れませんでした。少し待ってから、もう一度お試しください。",
    failed: "いま処理できません。少し待ってから、もう一度お試しください。"
  };

  function withTimeout(url, opts, ms) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms);
    var o = Object.assign({ credentials: "omit", redirect: "follow", cache: "no-store" }, opts, ctl ? { signal: ctl.signal } : {});
    return fetch(url, o).then(function (r) { clearTimeout(timer); return r; }, function (err) {
      clearTimeout(timer);
      throw ApiError(FRIENDLY[err && err.name === "AbortError" ? "timeout" : "network"], err && err.name === "AbortError" ? "timeout" : "network");
    });
  }

  function readJson(res) {
    return res.text().then(function (t) {
      var j;
      try { j = JSON.parse(t); } catch (e) { throw ApiError(FRIENDLY.parse, "parse"); }
      if (!j || typeof j !== "object") throw ApiError(FRIENDLY.parse, "parse");
      if (j.ok === false) {
        var code = typeof j.error === "string" && /^[a-z_]+$/.test(j.error) ? j.error : "failed";
        var msg = j.message || (typeof j.error === "string" && /[぀-ヿ一-龥]/.test(j.error) ? j.error : "") || j.reason || FRIENDLY[code] || FRIENDLY.failed;
        if (code === "rate_limited" && j.retryAfterSec) msg = "アクセスが集まっています。" + j.retryAfterSec + "秒ほど待ってから、もう一度お試しください。";
        var err = ApiError(msg, code); err.field = j.field; throw err;
      }
      return j;
    });
  }

  function qs(params) {
    return Object.keys(params).filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
  }

  function get(action, params, tries) {
    var url = C.GAS_URL + (C.GAS_URL.indexOf("?") < 0 ? "?" : "&") + qs(Object.assign({ action: action }, params || {}));
    return withTimeout(url, { method: "GET" }, 12000).then(readJson).catch(function (err) {
      if ((tries || 1) > 0 && (err.code === "network" || err.code === "timeout" || err.code === "parse"))
        return new Promise(function (r) { setTimeout(r, 800); }).then(function () { return get(action, params, (tries || 1) - 1); });
      throw err;
    });
  }

  function post(kind, body, tries) {
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ kind: kind }, body || {})) };
    return withTimeout(C.GAS_URL, opts, 30000).then(readJson).catch(function (err) {
      // つながらなかった時だけ1回やりなおす（予約は requestId で二重にならない）
      if ((tries === undefined ? 1 : tries) > 0 && (err.code === "network" || err.code === "timeout"))
        return new Promise(function (r) { setTimeout(r, 1000); }).then(function () { return post(kind, body, 0); });
      throw err;
    });
  }

  /* quote に渡す形（GET）。items は「aircon_wall:2,aircon_auto:1」、options は配列なら「mold,outdoor」・台数ごとなら JSON */
  function quoteParams(input) {
    var p = {};
    p.items = (input.items || []).map(function (i) { return i.type + ":" + (i.count || 1); }).join(",");
    if (Array.isArray(input.options) && input.options.length) p.options = input.options.join(",");
    else if (input.options && !Array.isArray(input.options)) { var any = Object.keys(input.options).some(function (k) { return input.options[k] > 0; }); if (any) p.options = JSON.stringify(input.options); }
    if (input.date) p.date = input.date; else if (input.weekday === true || input.weekday === 1) p.weekday = 1; else if (input.weekday === false || input.weekday === 0) p.weekday = 0;
    return p;
  }

  function demo() { if (!window.DemoApi) throw ApiError(FRIENDLY.failed); return window.DemoApi; }
  function pick(name, liveFn) { return function (a, b) { return live ? liveFn(a, b) : demo()[name](a, b); }; }

  window.Api = {
    live: live,
    ApiError: ApiError,
    cap: pick("cap", function () { return get("cap"); }),
    slots: pick("slots", function () { return get("slots"); }),
    availability: pick("availability", function (areaCode, days) { return get("availability", { area: areaCode, days: days || 30 }); }),
    quote: pick("quote", function (input) { return get("quote", quoteParams(input)); }),
    policy: pick("policy", function () { return get("policy"); }),
    records: pick("records", function (id) { return get("records", id ? { id: id } : {}); }),
    book: pick("book", function (d) { return post("book", d); }),
    bookPhoto: pick("bookPhoto", function (d) { return post("bookphoto", d); }),
    mypage: pick("mypage", function (d) { return post("mypage", d); }),
    extraDecide: pick("extraDecide", function (d) { return post("extra.decide", d); }),
    extraPhotos: pick("extraPhotos", function (d) { return post("extra.photos", d); }),
    delayAnswer: pick("delayAnswer", function (d) { return post("delay.answer", d); }),
    rescheduleRequest: pick("rescheduleRequest", function (d) { return post("reschedule.request", d); }),
    rescheduleConfirm: pick("rescheduleConfirm", function (d) { return post("reschedule.confirm", d); }),
    rescheduleCancel: pick("rescheduleCancel", function (d) { return post("reschedule.cancel", d); }),
    familyInvite: pick("familyInvite", function (d) { return post("family.invite", d); }),
    familyRevoke: pick("familyRevoke", function (d) { return post("family.revoke", d); }),
    mylink: pick("mylink", function (d) { return post("mylink", d); })
  };
})();
