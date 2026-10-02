/* 画面の共通の道具：見やすさの設定・バナー・設定の文字の差しこみ・小さな部品。
   ブラウザの保存（localStorage）には「文字の大きさ・くっきり表示」の2つだけを入れます。個人情報は入れません。 */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var LS_KEY = "arigatou.a11y";

  function store(fn) { try { return fn(); } catch (e) { return null; } }   // 保存が使えない時（プライベート画面など）でも動くように

  /* ---------- 小さな道具 ---------- */
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function yen(n) { return n === null || n === undefined ? "お見積り" : Number(n).toLocaleString("ja-JP") + "円"; }
  var WD = ["日", "月", "火", "水", "木", "金", "土"];
  function parseYmd(ymd) { var m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function jpDate(s, withWd) { var d = parseYmd(s); if (!d) return ""; return (d.getMonth() + 1) + "月" + d.getDate() + "日" + (withWd === false ? "" : "（" + WD[d.getDay()] + "）"); }
  function jpDateFull(s) { var d = parseYmd(s); return d ? d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日" : ""; }
  function isWeekday(s) { var d = parseYmd(s); return !!d && d.getDay() !== 0 && d.getDay() !== 6; }
  function tbd(text) { return '<span class="tbd">' + esc(text || "未決定") + "</span>"; }
  /* 設定の値。空なら『未決定』の印 */
  function cfgHtml(key) { var v = C[key]; return v ? esc(v) : tbd("未決定"); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  /* ---------- 見やすさの設定 ---------- */
  var A = { fs: 0, hc: 0 };
  function loadA11y() {
    var raw = store(function () { return localStorage.getItem(LS_KEY); });
    if (raw) { try { var o = JSON.parse(raw); A.fs = [0, 1, 2].indexOf(o.fs) >= 0 ? o.fs : 0; A.hc = o.hc ? 1 : 0; } catch (e) { /* 読めなければ標準 */ } }
  }
  function applyA11y() {
    document.documentElement.setAttribute("data-fs", String(A.fs));
    document.documentElement.setAttribute("data-hc", String(A.hc));
    $$("[data-fs-btn]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-fs-btn") === A.fs)); });
    $$("[data-hc-btn]").forEach(function (b) { b.setAttribute("aria-pressed", String(!!A.hc)); });
  }
  function saveA11y() { store(function () { localStorage.setItem(LS_KEY, JSON.stringify(A)); }); }
  document.addEventListener("click", function (e) {
    var f = e.target.closest && e.target.closest("[data-fs-btn]");
    if (f) { A.fs = +f.getAttribute("data-fs-btn"); saveA11y(); applyA11y(); return; }
    if (e.target.closest && e.target.closest("[data-hc-btn]")) { A.hc = A.hc ? 0 : 1; saveA11y(); applyA11y(); }
  });
  loadA11y();
  applyA11y();   // 画面が出る前に反映（ちらつきをへらす）

  /* ---------- 設定の文字を差しこむ ---------- */
  function fillConfig() {
    $$("[data-store]").forEach(function (n) { n.textContent = C.STORE_NAME || "お店の名前（未決定）"; });
    $$("[data-cfg]").forEach(function (n) { n.innerHTML = cfgHtml(n.getAttribute("data-cfg")); });
    $$("[data-cfg-show]").forEach(function (n) { n.hidden = !C[n.getAttribute("data-cfg-show")]; });
  }

  /* ---------- バナー：デモ表示／開発用の模擬サーバー ---------- */
  function banner() {
    var b = null;
    if (!C.GAS_URL) b = el("div", { "class": "banner", role: "status", id: "demo-banner" }, "デモ表示です。予約は実際には入りません。メールも送りません。");
    else if (C.MOCK) b = el("div", { "class": "banner mock", role: "status", id: "mock-banner" }, "開発用の模擬サーバーにつながっています。実際の予約ではありません。");
    if (b) document.body.insertBefore(b, document.body.firstChild);
  }

  /* ---------- 画面の部品 ---------- */
  function busy(node, on) { if (node) node.setAttribute("aria-busy", on ? "true" : "false"); }
  function showError(node, msg) { node.innerHTML = '<div class="err" role="alert">' + esc(msg) + "</div>"; }
  function say(node, msg, kind) { node.innerHTML = msg ? '<div class="' + (kind || "note") + '" role="' + (kind === "err" ? "alert" : "status") + '">' + esc(msg) + "</div>" : ""; }
  function currentPageKey() { var p = location.pathname.split("/").pop() || "index.html"; return p; }
  function markNav() {
    var here = currentPageKey();
    $$(".site-h nav a").forEach(function (a) { if ((a.getAttribute("href") || "").split("/").pop() === here) a.setAttribute("aria-current", "page"); });
  }
  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function () { fillConfig(); banner(); markNav(); applyA11y(); document.documentElement.setAttribute("data-ready", "1"); });

  window.UI = { esc: esc, yen: yen, jpDate: jpDate, jpDateFull: jpDateFull, parseYmd: parseYmd, ymd: ymd, addDays: addDays, isWeekday: isWeekday, tbd: tbd, cfgHtml: cfgHtml,
    $: $, $$: $$, el: el, ready: ready, busy: busy, showError: showError, say: say, store: store, WD: WD };
})();
