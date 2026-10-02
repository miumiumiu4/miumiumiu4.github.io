/* デモ表示（GAS_URL が空の時）。ブラウザの中だけで動く「ふり」です。
   ・料金は quote-local.js（本物と同じ決まり）。カレンダーは日付から作った見本。予約は実際には入りません。メールも送りません。
   ・お客様の名前・電話・住所・メールは、どこにも保存しません（保存するのは、日時・内容・金額・番号だけ。タブを閉じると消えます）。
   ・マイページの見本：  my.html?j=DEMO-0001&t=demo（今日の予定・遅れ・追加料金）／ warranty.html?j=DEMO-0002&t=demo（作業が終わった予約） */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {}, P = window.SITE_PRICES, U = window.UI;
  if (!P) return;
  var KEY = "arigatou.demo";
  var SLOTS = [{ no: 1, label: "①9:00〜12:00" }, { no: 2, label: "②12:00〜15:00" }, { no: 3, label: "③15:00〜18:00" }];
  var mem = { family: [] };   // 家族の名前・メールは、メモリの中だけ（再読みこみで消える）
  var S = (function () { var r = U.store(function () { return sessionStorage.getItem(KEY); }); try { return r ? JSON.parse(r) : null; } catch (e) { return null; } })() || { bookings: [], extra: {}, delay: "", resched: {}, moved: null, seq: 0 };
  function save() { U.store(function () { sessionStorage.setItem(KEY, JSON.stringify(S)); }); }
  function done(v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 180); }); }
  function fail(msg, code, field) { var e = window.Api.ApiError(msg, code || "failed"); e.field = field; return Promise.reject(e); }
  function today() { return U.ymd(new Date()); }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

  /* ---------- 空き（日付から作った見本） ---------- */
  function openFlags(area, date, k) {
    var wd = U.parseYmd(date).getDay();
    var f = [0, 1, 2].map(function (s) { return (hash(area + date + s) % 5) !== 0; });
    if (wd === 0) f[1] = f[2] = false;
    if (k % 6 === 3) { var only = k % 3; f = f.map(function (_, s) { return s === only; }); }
    return f;
  }
  function bookedKey(area, date, no) { return area + "|" + date + "|" + no; }
  function availability(area, days) {
    var booked = {}; S.bookings.forEach(function (b) { booked[bookedKey(b.areaCode, b.date, b.slotNo)] = 1; });
    var out = [];
    for (var k = 0; k <= Math.min(60, days || 30); k++) {
      var date = U.addDays(today(), k), fl = openFlags(area, date, k).map(function (o, s) { return o && !booked[bookedKey(area, date, s + 1)]; });
      var open = fl.filter(Boolean).length;
      fl.forEach(function (o, s) { out.push({ date: date, windowNo: s + 1, label: SLOTS[s].label, status: !o ? "×" : open === 1 ? "△" : "○", areaCode: area }); });
    }
    return { ok: true, demo: true, updated: new Date().toISOString(), areaCode: area, slots: out };
  }

  /* ---------- 日にち変更の決まり（PureCx.gs と同じ） ---------- */
  function classify(text) {
    var s = String(text || "");
    if (/天気|天候|大雨|豪雨|大雪|雪|台風|強風|暴風|雷|雨/.test(s)) return "天気";
    if (/渋滞|事故|通行止め|交通|電車が止/.test(s)) return "渋滞";
    if (/体調|病気|熱|発熱|けが|怪我|ケガ|インフル|コロナ|風邪|入院/.test(s)) return "体調不良";
    if (/職人|スタッフ|作業員|当社|こちらの都合|業者の都合|遅れ/.test(s)) return "職人都合";
    return "お客様都合";
  }
  function fee(reason, workDate, amount) {
    var g = classify(reason);
    if (g !== "お客様都合") return { fee: 0, rule: g + "の理由なので、日にち変更は無料です（仮）" };
    var days = Math.round((U.parseYmd(workDate) - U.parseYmd(today())) / 864e5), rate = days >= 2 ? 0 : days === 1 ? 0.5 : 1;
    return { fee: Math.round(amount * rate), rule: rate === 0 ? "前々日までなので無料です" : rate === 0.5 ? "前日の変更なので料金の50%です" : "当日（または作業日のあと）の変更なので料金の100%です" };
  }

  /* ---------- 見本の予約 ---------- */
  function demoJob(id) {
    if (id === "DEMO-0001") return { jobId: id, status: "確定", date: S.moved ? S.moved.date : today(), slotNo: S.moved ? S.moved.windowNo : 2, units: 2, amount: 17800, options: "", city: "横浜市港北区" };
    if (id === "DEMO-0002") return { jobId: id, status: "完了", date: U.addDays(today(), -2), slotNo: 1, units: 1, amount: 8900, options: "", city: "横浜市港北区" };
    var b = S.bookings.filter(function (x) { return x.jobId === id; })[0];
    return b ? { jobId: id, status: b.status, date: b.date, slotNo: b.slotNo, units: b.units, amount: b.total, options: "", city: b.areaLabel } : null;
  }
  function candidates(job) {
    var out = [], area = "14109";
    for (var k = 1; k < 20 && out.length < 3; k++) {
      var d = U.addDays(today(), k), fl = openFlags(area, d, k);
      fl.forEach(function (o, s) { if (o && out.length < 3 && !(d === job.date && s + 1 === job.slotNo)) out.push({ date: d, windowNo: s + 1, label: SLOTS[s].label, weekday: U.WD[U.parseYmd(d).getDay()] }); });
    }
    return out;
  }
  function mypage(d) {
    var token = String(d.token || ""), id = String(d.jobId || "");
    if (!/^demo/.test(token)) return fail("デモでは、見本のリンクだけ開けます（my.html?j=DEMO-0001&t=demo）", "failed");
    var job = demoJob(id); if (!job) return fail("ご予約が見つかりません", "failed");
    var owner = !d.familyId, days = Math.round((U.parseYmd(job.date) - U.parseYmd(today())) / 864e5);
    var active = job.status === "確定", slot = SLOTS[job.slotNo - 1];
    var v = {
      ok: true, demo: true, role: owner ? "owner" : "family", shop: C.STORE_NAME, asOf: today(),
      job: { jobId: id, status: job.status, statusText: job.status === "完了" ? "作業が終わりました。ありがとうございました" : "ご予約は確定しています（デモ）", customerLabel: owner ? "例：山田 様" : "",
        date: job.date, weekday: U.WD[U.parseYmd(job.date).getDay()], slotNo: job.slotNo, slotLabel: slot.label, daysBefore: days, units: job.units, autoUnits: 0, options: job.options, city: job.city },
      today: { isToday: days === 0, windowLabel: slot.label, text: days === 0 && active ? "今日の予定です。到着は「" + slot.label + "」のあいだです。遅れそうな時は、こことメールでお知らせします。" : active && days > 0 ? "作業の日まで、あと" + days + "日です。" : "",
        delay: id === "DEMO-0001" && !S.moved ? { delayId: "DEMO-0001-L1", minutesLate: 25, etaFrom: "14:10", etaTo: "14:25", choice: S.delay, options: owner ? [{ key: "wait", label: "このまま待つ" }, { key: "reschedule", label: "別の日にする（無料）" }, { key: "cancel", label: "キャンセルする（キャンセル料はかかりません）" }] : [] } : null },
      warranty: { available: job.status === "完了", days: 7, workDate: job.date, until: U.addDays(job.date, 7), items: ["作業日：" + job.date + "　" + job.units + "台"] },
      equipment: id === "DEMO-0002" ? [{ equipmentId: "DEMO-E1", place: "リビング", maker: "例：メーカーA", modelNo: "例：AB-123", lastCleanedDate: job.date, nextDueDate: U.addDays(job.date, 365), reminder: false }] : []
    };
    if (owner) {
      var extras = id === "DEMO-0001" ? [{ extraId: "DEMO-X01", reason: "例：室外機が高い場所にあり、別の作業が必要です", amount: 3000, status: S.extra["DEMO-X01"] || "相談中", photoCount: 1 }] : [];
      var approved = extras.filter(function (x) { return x.status === "承認"; }).reduce(function (s, x) { return s + x.amount; }, 0);
      v.job.amount = job.amount;
      v.money = { baseAmount: job.amount, extraApprovedTotal: approved, finalAmount: job.amount + approved, note: "追加料金は、お客様が「承認」を押した分だけ入ります" };
      v.extras = extras;
      var ic = fee("お客様の都合", job.date, job.amount);
      var open = S.resched[id];
      v.reschedule = { canRequest: active && days >= 0, open: open || null, freeReasons: ["天気", "渋滞", "体調不良", "職人都合"], ifCustomerReason: { fee: ic.fee, rate: 0, rule: ic.rule },
        policyText: "前々日まで無料・前日50%・当日100%。天気・渋滞・体調不良・職人の都合は、いつでも無料です（仮）。" };
      v.family = mem.family.filter(function (f) { return f.jobId === id; });
    }
    return done(v);
  }

  /* ---------- 作業の記録（見本。本物は『オーナーが承認したものだけ』） ---------- */
  var RECORDS = [
    ["DEMO-WL0001", -3, "横浜市港北区", 2, 80, "室内機の内部にカビがあった。完全分解で洗浄"],
    ["DEMO-WL0002", -5, "川崎市中原区", 1, 55, "フィルターのホコリが多め"],
    ["DEMO-WL0003", -9, "横浜市青葉区", 3, 140, "室外機まわりに落ち葉。あわせて掃除"]
  ].map(function (r) {
    var date = U.addDays(today(), r[1]);
    return { logId: r[0], date: date, areaLabel: r[2], units: r[3], minutes: r[4], title: "（例）" + r[2] + " " + date + " エアコンクリーニング",
      text: "日付：" + U.jpDateFull(date) + "\n場所：" + r[2] + "（市区町村まで）\n台数：" + r[3] + "台\n所要時間：約" + r[4] + "分（玄関に入ってから出るまでの記録）\n作業メモ：" + r[5] + "\n担当：当店の職人" };
  });

  /* ---------- 予約 ---------- */
  function book(d) {
    var chk = function (field, ok, msg) { return ok ? null : { field: field, msg: msg }; };
    var phone = String(d.phone || "").replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/\D/g, "");
    var zip = String(d.zip || "").replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    var bad = chk("name", String(d.name || "").trim(), "お名前を入れてください") || chk("phone", /^0\d{9,10}$/.test(phone), "電話番号は、市外局番から数字で入れてください（例：09012345678）") ||
      chk("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || "")), "メールアドレスの形を確かめてください") || chk("zip", /^\d{3}-?\d{4}$/.test(zip), "郵便番号は7けたの数字で入れてください（例：222-0000）") ||
      chk("address", String(d.address || "").trim().length >= 5, "住所を番地まで入れてください") || chk("agree", d.agreePrivacy && d.agreeTerms, "個人情報の取りあつかいと、利用規約・キャンセルの決まりに同意してください");
    if (bad) return fail(bad.msg, "validation", bad.field);
    if (String(d.website || "")) return fail("送信できませんでした。ページを開きなおして、もう一度お試しください", "rejected");
    var q = QuoteLocal.quote(P, { items: d.items, options: d.options, date: d.date });
    if (!q.ok) return fail(q.error, "validation", "items");
    if (q.needsQuote) return fail("4LDK以上の空室清掃は見積りです。お電話かメールでご相談ください（ネットの予約では受けられません）", "needs_quote");
    var av = availability(d.areaCode, 60).slots.filter(function (s) { return s.date === d.date && s.windowNo === Number(d.slotNo); })[0];
    if (!av || av.status === "×") return fail("選ばれた日時は、ちょうど埋まりました。別の日時を選んでください", "unavailable");
    S.seq += 1;
    var area = (C.AREAS || []).filter(function (a) { return a.code === d.areaCode; })[0] || {};
    var units = d.items.reduce(function (s, i) { return s + (+i.count || 0); }, 0), jobId = "DEMO-" + String(100 + S.seq).padStart(4, "0");
    S.bookings.push({ jobId: jobId, date: d.date, slotNo: Number(d.slotNo), areaCode: d.areaCode, areaLabel: area.label || "", status: "確定", total: q.total, units: units });
    save();
    return done({ ok: true, demo: true, jobId: jobId, status: "確定", confirmed: true, total: q.total, date: d.date, slotNo: Number(d.slotNo), slotLabel: SLOTS[d.slotNo - 1].label, areaLabel: area.label || "",
      content: q.breakdown.filter(function (l) { return l.code !== "free_toilet_drain"; }).map(function (l) { return l.label + (l.qty > 1 ? "×" + l.qty : ""); }),
      payment: d.customerType === "法人" ? "請求書払い（月末締め・翌月末払い・仮）" : "クレジットカード（予約後に登録・仮）", myToken: "demo-new", message: "ご予約が確定しました（デモ）。" });
  }

  window.DemoApi = {
    cap: function () { return done({ ok: true, open: true, reason: "" }); },
    slots: function () { return done({ ok: true, slotTimes: SLOTS }); },
    availability: function (area, days) { return done(availability(area, days)); },
    quote: function (input) { var q = QuoteLocal.quote(P, input); return q.ok ? done(q) : fail(q.error, "validation"); },
    policy: function () { return done(Object.assign({ ok: true }, P.policy, { noExtraFee: { text: P.noExtraFeePromise, exceptions: P.exceptions }, disclaimer: P.disclaimer })); },
    records: function (id) { return done({ ok: true, demo: true, logs: RECORDS.filter(function (r) { return !id || r.logId === id; }) }); },
    book: book,
    bookPhoto: function (d) { return done({ ok: true, seq: d.seq }); },
    mypage: mypage,
    extraDecide: function (d) { S.extra[d.extraId] = /承認|approve/.test(d.decision) ? "承認" : "見送り"; save(); return done({ ok: true, message: S.extra[d.extraId] === "承認" ? "承認しました。ありがとうございます。" : "見送りました。ご依頼の作業だけ行います。" }); },
    extraPhotos: function () { return done({ ok: true, photos: ["data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#e9f0fa"/><text x="160" y="105" text-anchor="middle" font-size="18" fill="#13213a">現場の写真（例）</text></svg>')] }); },
    delayAnswer: function (d) { S.delay = { wait: "待つ", reschedule: "日にち変更", cancel: "キャンセル" }[d.choice] || ""; save(); return done({ ok: true, message: d.choice === "wait" ? "ありがとうございます。まもなく伺います。" : d.choice === "reschedule" ? "候補を出しました。下の「日にちを変える」から選んでください（無料）。" : "承りました。事務所からご連絡します。" }); },
    rescheduleRequest: function (d) {
      var job = demoJob(String(d.jobId)); if (!job) return fail("ご予約が見つかりません");
      if (!String(d.reason || "").trim()) return fail("理由をひとこと書いてください（天気・体調 など）");
      var f = fee(d.reason, job.date, job.amount), c = candidates(job);
      S.resched[job.jobId] = { requestId: job.jobId + "-D01", fee: f.fee, rule: f.rule, reasonGroup: classify(d.reason), candidates: c }; save();
      return done({ ok: true, requestId: job.jobId + "-D01", fee: f.fee, rule: f.rule, candidates: c });
    },
    rescheduleConfirm: function (d) {
      var r = S.resched[String(d.jobId)]; if (!r) return fail("この相談はもう決まっているか、見つかりません");
      var c = r.candidates[Number(d.idx)]; if (!c) return fail("候補を選んでください");
      if (d.jobId === "DEMO-0001") S.moved = c; else S.bookings.forEach(function (b) { if (b.jobId === d.jobId) { b.date = c.date; b.slotNo = c.windowNo; } });
      delete S.resched[String(d.jobId)]; save();
      return done({ ok: true, message: "日にちを " + c.date + "（" + c.weekday + "）" + c.label + " に変えました。" });
    },
    rescheduleCancel: function (d) { delete S.resched[String(d.jobId)]; save(); return done({ ok: true, message: "日にち変更をやめました。予約はそのままです。" }); },
    familyInvite: function (d) {
      if (!String(d.name || "").trim()) return fail("ご家族の呼び名を入れてください", "validation");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || ""))) return fail("メールアドレスの形を確かめてください", "validation");
      if (!d.consent) return fail("共有に同意のチェックを入れてください（いつでも取り消せます）", "no_consent");
      mem.family.push({ familyId: d.jobId + "-F" + (mem.family.length + 1), jobId: d.jobId, name: d.name, email: d.email, status: "招待中" });
      return done({ ok: true, mailed: false, message: "デモなので、招待のメールは送っていません。" });
    },
    familyRevoke: function (d) { mem.family.forEach(function (f) { if (f.familyId === d.targetId) f.status = "取り消し済み"; }); return done({ ok: true, message: "共有を取り消しました。このリンクは、もう使えません。" }); },
    mylink: function () { return done({ ok: true, message: "デモなので、メールは送っていません。見本のマイページ：my.html?j=DEMO-0001&t=demo" }); }
  };
})();
