/* ブラウザの中だけで料金を計算する（デモ表示で使う）。
   計算のきまりは gas/company/PurePublic.gs の quoteCalc_ と同じで、数字は data/prices.json（js/prices.js）から読みます。
   test/quote-parity.test.mjs が、本物の quoteCalc_ と答えが同じかを確かめます。 */
(function (root) {
  "use strict";
  function yen(n) { return Number(n).toLocaleString("ja-JP"); }
  // weekday：true／false／null（まだ決まっていない）。date（YYYY-MM-DD）からも決められる
  function isWeekday(input) {
    var w = input.weekday;
    if (w === true || w === false) return w;
    if (w !== undefined && w !== null && String(w).trim() !== "") {
      var s = String(w).trim().toLowerCase();
      if (/^(1|true|yes|平日|weekday)$/.test(s)) return true;
      if (/^(0|false|no|土日|土日祝|休日|weekend|holiday)$/.test(s)) return false;
    }
    var m = String(input.date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay(); return d !== 0 && d !== 6; }
    return null;
  }
  function quote(P, input) {
    input = input || {};
    var raw = Array.isArray(input.items) ? input.items.slice() : [{ type: input.type, count: input.count }];
    if (!raw.length) return { ok: false, error: "type（メニュー）と count（台数）を入れてください" };
    var table = {}; P.items.forEach(function (i) { table[i.code] = i; });
    var optTable = {}; P.options.forEach(function (o) { optTable[o.code] = o; });
    var items = [];
    for (var k = 0; k < raw.length; k++) {
      var r = raw[k] || {};
      if (!table[r.type]) return { ok: false, error: "知らないメニューです：" + r.type };
      var n = Number(r.count === undefined || r.count === "" ? 1 : r.count);
      if (!Number.isInteger(n) || n < 1 || n > P.maxCount) return { ok: false, error: "台数（count）は 1〜" + P.maxCount + " の整数にしてください" };
      items.push({ key: r.type, count: n });
    }
    var aircon = items.filter(function (i) { return table[i.key].group === "aircon"; }).reduce(function (s, i) { return s + i.count; }, 0);
    // オプション：配列＝エアコン全部につく／{mold:1}＝台数ごと
    var optN = { mold: 0, outdoor: 0, drain: 0 }, requested = false, o = input.options;
    if (Array.isArray(o)) { o.forEach(function (c) { if (!optTable[c]) throw new Error("opt"); optN[c] = aircon; requested = true; }); }
    else if (o && typeof o === "object") { Object.keys(o).forEach(function (c) { var q = Number(o[c]); if (!optTable[c] || !Number.isInteger(q) || q < 0) throw new Error("opt"); optN[c] = q; if (q > 0) requested = true; }); }
    if (requested && !aircon) return { ok: false, error: "防カビ・室外機・ドレンはエアコンのオプションです" };
    for (var c in optN) if (optN[c] > aircon) return { ok: false, error: optTable[c].label + "の台数が、エアコンの台数より多いです" };
    var weekday = isWeekday(input), lines = [], needsQuote = false;
    items.forEach(function (i) {
      var t = table[i.key];
      if (t.price === null) { needsQuote = true; lines.push({ code: i.key, label: t.label, unitPrice: null, qty: i.count, amount: null, note: "見積りです（間取り・汚れを見て決めます）" }); return; }
      lines.push({ code: i.key, label: t.label, unitPrice: t.price, qty: i.count, amount: t.price * i.count, note: i.count >= 2 ? "2台目以降も同じ金額" : "" });
    });
    var setN = Math.min(optN.mold, optN.outdoor, optN.drain);
    if (setN > 0) lines.push({ code: "set3", label: P.set3.label, unitPrice: P.set3.price, qty: setN, amount: P.set3.price * setN, note: "別々に頼むと" + yen(P.set3.separatePrice) + "円。平日も" + yen(P.set3.price) + "円" });
    var moldFree = false;
    ["mold", "outdoor", "drain"].forEach(function (c) {
      var q = optN[c] - setN; if (q <= 0) return;
      var p = optTable[c];
      if (c === P.weekdayFreeOption && weekday === true) { moldFree = true; lines.push({ code: c, label: p.label + "（単品）", unitPrice: 0, qty: q, amount: 0, note: "平日（月〜金）は防カビの単品が無料" }); }
      else lines.push({ code: c, label: p.label + "（単品）", unitPrice: p.price, qty: q, amount: p.price * q, note: "" });
    });
    if (aircon >= 1) lines.push({ code: "free_toilet_drain", label: P.freeServiceLine.label, unitPrice: 0, qty: 1, amount: 0, note: P.freeServiceLine.note });
    var total = needsQuote ? null : lines.reduce(function (s, l) { return s + (l.amount || 0); }, 0);
    var notes = [];
    if (weekday === null && optN.mold - setN > 0) notes.push("作業日が決まると、平日（月〜金）なら防カビの単品は無料になります");
    return { ok: true, total: total, needsQuote: needsQuote, taxIncluded: true, currency: "JPY", breakdown: lines, weekdayApplied: weekday === true, moldFreeApplied: moldFree,
      parkingNote: P.parkingNote, noExtraFeePromise: P.noExtraFeePromise, exceptions: P.exceptions.slice(), notes: notes, disclaimer: P.disclaimer, priceUpdated: P.updated };
  }
  function safeQuote(P, input) { try { return quote(P, input); } catch (e) { return { ok: false, error: "知らないオプションです" }; } }
  var api = { quote: safeQuote, isWeekday: isWeekday };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.QuoteLocal = api;
})(typeof window !== "undefined" ? window : globalThis);
