/* 申し込みの内容をえらぶ部品（写真で総額・予約の両方で使います）と、総額の表示。
   台数は ＋－ ボタン、オプションは台数ごとに選べます。選ぶたびに、料金表どおりの総額を出します（本物：会社のGAS／デモ：ブラウザの中）。 */
(function () {
  "use strict";
  var U = window.UI, P = window.SITE_PRICES;
  var DRAFT_KEY = "arigatou.draft";

  function stepper(code, label, price, unit, note) {
    return '<div class="opt" style="cursor:default"><div style="flex:1"><b>' + U.esc(label) + '</b><br><span class="small muted">' + (price === null ? "お見積り" : U.yen(price) + "／" + unit) + (note ? "　" + U.esc(note) : "") + "</span></div>" +
      '<div class="stepper" role="group" aria-label="' + U.esc(label) + 'の数">' +
      '<button type="button" data-bump="-1" data-code="' + code + '" aria-label="' + U.esc(label) + 'を減らす">−</button><output data-out="' + code + '" aria-live="polite">0</output>' +
      '<button type="button" data-bump="1" data-code="' + code + '" aria-label="' + U.esc(label) + 'を増やす">＋</button></div></div>';
  }

  function mount(root, opts) {
    opts = opts || {};
    var by = {}; P.items.forEach(function (i) { by[i.code] = i; });
    var state = { counts: {}, opt: { mold: 0, outdoor: 0, drain: 0 }, day: "unknown" };
    var saved = U.store(function () { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); });
    if (saved && saved.counts) { state.counts = saved.counts; state.opt = Object.assign(state.opt, saved.opt || {}); state.day = saved.day || "unknown"; }

    var air = P.items.filter(function (i) { return i.group === "aircon"; });
    var others = P.groups.filter(function (g) { return g.id !== "aircon"; });
    var html = '<fieldset><legend class="lab">エアコン</legend>' + air.map(function (i) { return stepper(i.code, i.label.replace("エアコンクリーニング ", ""), i.price, i.unit, i.code === "aircon_wall" ? "2台目以降も同じ金額" : ""); }).join("") + "</fieldset>" +
      '<fieldset id="mf-opts"><legend class="lab">エアコンのオプション（つける台数）</legend><div class="grid2">' +
      P.options.map(function (o) { return '<div class="field"><label for="mf-opt-' + o.code + '">' + U.esc(o.label) + "（" + U.yen(o.price) + "／台）</label><select id=\"mf-opt-" + o.code + '" data-opt="' + o.code + '"></select></div>'; }).join("") +
      '</div><p class="small muted">3点セット（' + P.options.map(function (o) { return o.label; }).join("・") + "）は " + U.yen(P.set3.price) + "／台（別々なら" + U.yen(P.set3.separatePrice) + "）。平日も同じです。同じ台数ずつ選ぶと3点セットの料金になります。</p></fieldset>" +
      '<details><summary class="lab" style="min-height:44px;display:flex;align-items:center;cursor:pointer">洗濯機・水回り・空室清掃もお願いする</summary><div class="stack" style="margin-top:.6rem">' +
      others.map(function (g) {
        return '<fieldset><legend class="lab">' + U.esc(g.label) + "</legend>" + P.items.filter(function (i) { return i.group === g.id; }).map(function (i) {
          var note = i.code === "toilet" ? "有料のトイレクリーニングです（無料のトイレ掃除とは別）" : i.price === null ? "予約はお電話かメールで" : "";
          return stepper(i.code, i.label, i.price, i.unit, note);
        }).join("") + "</fieldset>";
      }).join("") + "</div></details>" +
      (opts.withDay ? '<div class="field"><label for="mf-day">作業をお願いしたい日</label><select id="mf-day"><option value="unknown">まだ決めていない</option><option value="weekday">平日（月〜金）</option><option value="weekend">土日</option></select>' +
        '<span class="hint">平日（月〜金）は、防カビの単品が無料です。祝日が月〜金にあたる日も平日として扱います。</span></div>' : "");
    root.innerHTML = html;

    var timer = null;
    function airCount() { return (state.counts.aircon_wall || 0) + (state.counts.aircon_auto || 0); }
    function refreshOptions() {
      var n = airCount();
      U.$$("[data-opt]", root).forEach(function (sel) {
        var code = sel.getAttribute("data-opt"), cur = Math.min(state.opt[code] || 0, n), h = "";
        for (var k = 0; k <= n; k++) h += '<option value="' + k + '"' + (k === cur ? " selected" : "") + ">" + (k === 0 ? "つけない" : k + "台") + "</option>";
        sel.innerHTML = h; sel.disabled = n === 0; state.opt[code] = cur;
      });
    }
    function paint() {
      U.$$("[data-out]", root).forEach(function (o) { o.textContent = state.counts[o.getAttribute("data-out")] || 0; });
      refreshOptions();
      var d = U.$("#mf-day", root); if (d) d.value = state.day;
    }
    function getInput() {
      var items = Object.keys(state.counts).filter(function (k) { return state.counts[k] > 0 && by[k]; }).map(function (k) { return { type: k, count: state.counts[k] }; });
      var options = {}, any = false; Object.keys(state.opt).forEach(function (k) { if (state.opt[k] > 0) { options[k] = state.opt[k]; any = true; } });
      var inp = { items: items, options: any ? options : [] };
      if (opts.getDate && opts.getDate()) inp.date = opts.getDate(); else if (state.day === "weekday") inp.weekday = true; else if (state.day === "weekend") inp.weekday = false;
      return inp;
    }
    function persist() { U.store(function () { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ counts: state.counts, opt: state.opt, day: state.day })); }); }
    function changed() { persist(); paint(); clearTimeout(timer); timer = setTimeout(function () { if (opts.onChange) opts.onChange(getInput()); }, 150); }

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-bump]"); if (!b) return;
      var code = b.getAttribute("data-code"), v = (state.counts[code] || 0) + Number(b.getAttribute("data-bump"));
      state.counts[code] = Math.max(0, Math.min(P.maxCount, v));
      if (by[code].price === null && state.counts[code] > 1) state.counts[code] = 1;
      changed();
    });
    root.addEventListener("change", function (e) {
      if (e.target.matches("[data-opt]")) { state.opt[e.target.getAttribute("data-opt")] = Number(e.target.value); changed(); }
      else if (e.target.id === "mf-day") { state.day = e.target.value; changed(); }
    });
    paint();
    if (getInput().items.length) setTimeout(function () { if (opts.onChange) opts.onChange(getInput()); }, 0);
    return { getInput: getInput, refresh: changed, hasItems: function () { return getInput().items.length > 0; } };
  }

  /* 総額の表示。q は quote の答え */
  function renderQuote(node, q, opts) {
    opts = opts || {};
    if (!q) { node.innerHTML = '<p class="muted">メニューを選ぶと、ここに総額が出ます。</p>'; return; }
    var lines = q.breakdown.map(function (l) {
      var free = l.amount === 0;
      return "<li><span>" + U.esc(l.label) + (l.qty > 1 ? " ×" + l.qty : "") + (l.note ? '<br><span class="tiny muted">' + U.esc(l.note) + "</span>" : "") + '</span><span class="num ' + (free ? "free" : "") + '">' + (l.amount === null ? "お見積り" : free ? "無料" : U.yen(l.amount)) + "</span></li>";
    }).join("");
    node.innerHTML = '<ul class="lines">' + lines + '</ul><div class="total"><span>総額（税込）</span><b class="num" data-total="' + (q.total === null ? "" : q.total) + '">' + (q.total === null ? "お見積り" : U.yen(q.total)) + "</b></div>" +
      '<p class="small muted">' + U.esc(q.parkingNote) + "。" + (q.weekdayApplied ? "平日の料金で計算しています。" : "") + "</p>" +
      (q.notes && q.notes.length ? '<p class="note">' + q.notes.map(U.esc).join("<br>") + "</p>" : "") +
      '<div class="promise3"><span class="ic" aria-hidden="true">✓</span><div><h3>追加料金なしの約束</h3><p class="small">' + U.esc(q.noExtraFeePromise) + "</p></div></div>" +
      '<p class="tiny muted">' + U.esc(q.disclaimer) + "（料金は" + U.esc(q.priceUpdated) + "時点）</p>";
  }

  window.MenuForm = { mount: mount, renderQuote: renderQuote, DRAFT_KEY: DRAFT_KEY };
})();
