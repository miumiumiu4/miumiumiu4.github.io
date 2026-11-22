// ===== 加盟前の毎日音声（資料請求した方へ）：再生の記録・今週のランキング・毎月の無料コンサル =====
// 講座前の音声（aimpoint/audio/_listen_log.gs）とは別の Apps Script・別のシート。講座前の仕組みには触らない。
// ページ（aimpoint.co.jp/kamei/<KEY>/）が、聞いている間15秒ごと・一時停止・閉じたときに送ってくる。
// 使い方：Apps Script「加盟前_再生記録」に貼る → setup() を1回実行（記録用のスプレッドシートを作り、さとぴーだけが見られる）
//        → デプロイ（ウェブアプリ・実行するユーザー＝自分・アクセス＝全員）→ URL を _make_pages.py の LOG_URL に入れる。
// 決まりごと（2026-11-23 さとぴー）：
//   ・ニックネームは3つの候補から選ぶ（だれか分からない名前。被らない）。ランキングにはニックネームだけ。
//   ・ページに出すのは「今週のランキング」上位5人（1〜3位に王冠）＋「あなた」。毎週月曜 7:00 にリセット。0点の人は出さない。
//   ・毎月の上位3名（その月に聞いた点数）に、三浦から無料コンサルのプレゼント。抽選ではない。
//   ・一度招待した人は3か月お休み（その月は4位・5位に回す）。
//   ・記録はさとぴーだけが見られるシートに残す。
var TZ = 'Asia/Tokyo';
var REC = '記録', NICK = 'ニックネーム', WEEK = '今週のランキング', MONTH = '今月のランキング', CONSULT = '無料コンサル', README = '見方';
var REC_HEAD = ['キー', 'ニックネーム', '日', '聞いた日（日本時間）', '一番先まで聞いた(秒)', '音声の長さ(秒)', '進み(%)', '聞いた合計(秒)', 'はじめて聞いた', '最後に聞いた', 'LINE内', '外部ブラウザ', '端末'];
var CONSULT_HEAD = ['月', '順位', 'ニックネーム', 'その月の点数', '招待した日', '受けた日（三浦さんが記入）', 'メモ'];
var REST_MONTHS = 3, INVITES = 3, SHOW = 5;
var STAFF = '除外（スタッフ）';   // ここに書いたニックネームは、ランキング・招待に出さない（さとぴー・スタッフのテスト用）

function props_() { return PropertiesService.getScriptProperties(); }
function ss_() {
  var id = props_().getProperty('SS_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create('加盟前の毎日音声_再生記録（さとぴーだけ）');
  props_().setProperty('SS_ID', ss.getId());
  return ss;
}
function sheet_(name, head) {
  var ss = ss_(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, ss.getSheets().length);
    if (head) { sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); sh.setFrozenRows(1); }
  }
  return sh;
}

function setup() {
  var ss = ss_();
  sheet_(REC, REC_HEAD).hideColumns(1);
  sheet_(NICK, ['ニックネーム', '端末', '選んだ日時']);
  sheet_(WEEK); sheet_(MONTH);
  sheet_(CONSULT, CONSULT_HEAD);
  sheet_(STAFF, ['ランキング・招待に出さないニックネーム（さとぴー・スタッフ）']);
  var h = sheet_(README);
  h.clear();
  h.getRange(1, 1, 10, 1).setValues([
    ['このシートの見方（加盟前の毎日音声・資料請求した方へ）'],
    ['「記録」：1人×1本×1日で1行。どこまで聞いたか・合計で何秒聞いたかが自動で入ります（15秒ごと）。'],
    ['「今週のランキング」：月曜 7:00 から今までの点数。1時間ごとに並べ直します。ページには上位5人と、その人自身の順位が出ます。'],
    ['「今月のランキング」：その月の1日から今までの点数。毎月1日の朝に、先月の上位3名を「無料コンサル」に書き出します。'],
    ['点数：80%以上聞いた本数 ×10点／最後まで聞いた +2点／2回以上聞いた +2点／聞いた日が続いた日数 ×1点（その週・その月の中で一番長い連続）'],
    ['「除外（スタッフ）」：ここに書いたニックネームは、ランキングと招待に出ません。?staff=1 を付けて開いた端末は、記録そのものをしません。'],
    ['「無料コンサル」：招待した人の一覧。受けたら「受けた日」を書いてください。一度招待した人は3か月お休みで、次の順位の人に回ります。'],
    ['招待された人のページには「あなたは今月の無料コンサルの対象です」と日程を選ぶボタンが出ます（その月の末日まで）。'],
    ['ニックネームと本人のつながりは、このシートにもありません（本人が無料コンサルや面談に来たときに分かります）。'],
    ['']
  ]);
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rebuild').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('monthlyInvite').timeBased().onMonthDay(1).atHour(6).create();
  rebuild();
  Logger.log('シート: ' + ss.getUrl());
}

function norm_(s) { return String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 30); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fmt_(d, f) { return Utilities.formatDate(d, TZ, f); }

function takenNames_() {
  var cache = CacheService.getScriptCache(), c = cache.get('taken');
  if (c) return JSON.parse(c);
  var set = {};
  [[REC, 2], [NICK, 1]].forEach(function (t) {
    var sh = ss_().getSheetByName(t[0]); if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, t[1], sh.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0]) set[String(r[0])] = 1; });
  });
  var names = Object.keys(set);
  cache.put('taken', JSON.stringify(names), 60);
  return names;
}

// ?taken=1 → 使用中の名前 ／ ?reserve=名前&d=端末 → 控えに書く ／ ?rank=1&n=名前 → 今週の上位5人・あなた・招待
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.taken) return json_({ names: takenNames_() });
  if (p.reserve) {
    var name = norm_(p.reserve), dev = String(p.d || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
    if (!name) return json_({ ok: false });
    var lock = LockService.getScriptLock(); lock.waitLock(15000);
    try {
      CacheService.getScriptCache().remove('taken');
      if (takenNames_().indexOf(name) >= 0) return json_({ ok: false });
      sheet_(NICK, ['ニックネーム', '端末', '選んだ日時']).appendRow([name, dev, fmt_(new Date(), 'yyyy/MM/dd HH:mm:ss')]);
      CacheService.getScriptCache().remove('taken');
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  }
  if (p.rank) {
    var snap = JSON.parse(props_().getProperty('SNAP') || '{"top":[],"all":[],"invite":[],"at":""}');
    var me = norm_(p.n), out = { top: snap.top, at: snap.at, me: null, invite: false };
    if (me) {
      var i = snap.all.indexOf(me);
      if (i >= 0) {
        var cut = snap.top.length >= SHOW ? snap.top[SHOW - 1].s : 0;
        out.me = { r: i + 1, s: snap.scores[i], gap: i + 1 > SHOW ? Math.max(1, cut - snap.scores[i] + 1) : 0 };
      }
      out.invite = snap.invite.indexOf(me) >= 0;
    }
    return json_(out);
  }
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  var p;
  try { p = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput('ng'); }
  var name = norm_(p.n), day = Math.floor(Number(p.day)), dev = String(p.d || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  var dur = Math.min(Math.max(Number(p.dur) || 0, 0), 3600);
  var max = Math.min(Math.max(Number(p.max) || 0, 0), dur || 3600);
  var add = Math.min(Math.max(Number(p.add) || 0, 0), 120);
  if (!name || !(day >= 1 && day <= 400)) return ContentService.createTextOutput('ng');
  if (p.st) return ContentService.createTextOutput('ok');   // ?staff=1 で開いた端末（さとぴー・スタッフ）は記録しない
  var now = new Date(), today = fmt_(now, 'yyyy-MM-dd'), stamp = fmt_(now, 'yyyy/MM/dd HH:mm:ss');
  var key = name.toLowerCase() + '|' + day + '|' + today;   // 同じ回を別の日に聞き直したら別の行（その日の点）
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var sh = sheet_(REC, REC_HEAD), cache = CacheService.getScriptCache();
    var row = Number(cache.get(key)) || 0;
    if (row && sh.getRange(row, 1).getValue() !== key) row = 0;
    if (!row) {
      var last = sh.getLastRow();
      if (last >= 2) {
        var keys = sh.getRange(2, 1, last - 1, 1).getValues();
        for (var i = keys.length - 1; i >= 0; i--) if (keys[i][0] === key) { row = i + 2; break; }
      }
    }
    if (!row) { sh.appendRow([key, name, day, "'" + today, 0, 0, 0, 0, stamp, stamp, '', '', '']); row = sh.getLastRow(); }
    cache.put(key, String(row), 21600);
    var v = sh.getRange(row, 1, 1, REC_HEAD.length).getValues()[0];
    v[4] = Math.max(Number(v[4]) || 0, Math.round(max));
    v[5] = Math.max(Number(v[5]) || 0, Math.round(dur));
    v[6] = v[5] ? Math.min(100, Math.round(v[4] / v[5] * 100)) : 0;
    v[7] = Math.round((Number(v[7]) || 0) + add);
    v[9] = stamp;
    if (p.ua === 'line') v[10] = '○'; else v[11] = '○';
    var devs = String(v[12] || '').split(',').filter(String);
    if (dev && devs.indexOf(dev) < 0 && devs.length < 5) devs.push(dev);
    v[12] = devs.join(',');
    sh.getRange(row, 1, 1, REC_HEAD.length).setValues([v]);
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput('ok');
}

// 点数：from〜to（日本時間の日付 'yyyy-MM-dd'）の記録で数える
function staff_() {
  var sh = sheet_(STAFF, ['ランキング・招待に出さないニックネーム（さとぴー・スタッフ）']), last = sh.getLastRow(), set = {};
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { if (r[0]) set[norm_(r[0])] = 1; });
  return set;
}

function scores_(from, to) {
  var sh = sheet_(REC, REC_HEAD), last = sh.getLastRow(), people = {}, skip = staff_();
  if (last >= 2) sh.getRange(2, 1, last - 1, REC_HEAD.length).getValues().forEach(function (v) {
    if (skip[norm_(v[1])]) return;
    var d = v[3] instanceof Date ? fmt_(v[3], 'yyyy-MM-dd') : String(v[3]);
    if (d < from || d > to) return;
    var p = people[v[1]] || (people[v[1]] = { n: v[1], eps: {}, full: 0, twice: 0, dates: {} });
    var pct = Number(v[6]) || 0;
    if (pct >= 80) { p.eps[v[2]] = true; p.dates[d] = true; }
    if (pct >= 95) p.full++;
    if (v[5] && Number(v[7]) >= Number(v[5]) * 1.5) p.twice++;
  });
  return Object.keys(people).map(function (k) {
    var p = people[k], ds = Object.keys(p.dates).sort(), best = 0, cur = 0, prev = null;
    ds.forEach(function (d) { var t = new Date(d + 'T00:00:00+09:00').getTime(); cur = prev !== null && t - prev === 86400000 ? cur + 1 : 1; best = Math.max(best, cur); prev = t; });
    var n = Object.keys(p.eps).length;
    return { n: p.n, s: n * 10 + p.full * 2 + p.twice * 2 + best, eps: n, full: p.full, twice: p.twice, best: best };
  }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s || b.eps - a.eps; });
}

function weekStart_(now) {
  // 月曜 7:00（日本時間）で区切る
  var jst = new Date(now.getTime() + 9 * 3600000), dow = (jst.getUTCDay() + 6) % 7; // 月=0
  var start = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - dow, 7 - 9));
  if (start.getTime() > now.getTime()) start = new Date(start.getTime() - 7 * 86400000);
  return start;
}

function write_(name, rows, note) {
  var sh = sheet_(name); sh.clear();
  var head = ['順位', 'ニックネーム', '点数', '80%以上聞いた本数', '最後まで聞いた', '2回以上聞いた', '一番長い連続日数'];
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); sh.setFrozenRows(1);
  if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows.map(function (x, i) { return [i + 1, x.n, x.s, x.eps, x.full, x.twice, x.best]; }));
  sh.getRange(1, head.length + 2).setValue(note);
}

function invitees_(month) {
  var sh = sheet_(CONSULT, CONSULT_HEAD), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 3).getValues().filter(function (r) { return String(r[0]) === month; }).map(function (r) { return String(r[2]); });
}

function rebuild() {
  var now = new Date(), ws = weekStart_(now);
  var week = scores_(fmt_(ws, 'yyyy-MM-dd'), fmt_(now, 'yyyy-MM-dd'));
  var month = scores_(fmt_(now, 'yyyy-MM') + '-01', fmt_(now, 'yyyy-MM-dd'));
  var at = fmt_(now, 'M/d HH:mm');
  write_(WEEK, week, '今週（' + fmt_(ws, 'M/d') + ' 7:00〜） 更新: ' + at);
  write_(MONTH, month, fmt_(now, 'yyyy年M月') + ' 更新: ' + at);
  props_().setProperty('SNAP', JSON.stringify({
    top: week.slice(0, SHOW).map(function (x) { return { n: x.n, s: x.s, b: x.best }; }),
    all: week.map(function (x) { return x.n; }).slice(0, 500), scores: week.map(function (x) { return x.s; }).slice(0, 500),
    invite: invitees_(fmt_(now, 'yyyy-MM')), at: at
  }));
}

// 毎月1日 6:00：先月の上位から、3か月以内に招待していない人を3名まで「無料コンサル」に書き出す（招待した月の次から3か月お休み）
function monthlyInvite() {
  var now = new Date();
  var lastMonthEnd = new Date(Date.UTC(Number(fmt_(now, 'yyyy')), Number(fmt_(now, 'M')) - 1, 1, -9) - 1); // 先月末（日本時間）
  var lm = fmt_(lastMonthEnd, 'yyyy-MM'), thisM = fmt_(now, 'yyyy-MM');
  if (invitees_(thisM).length) return;   // もう書き出した
  var ranks = scores_(lm + '-01', fmt_(lastMonthEnd, 'yyyy-MM-dd'));
  var sh = sheet_(CONSULT, CONSULT_HEAD), last = sh.getLastRow(), recent = {};
  var limit = fmt_(new Date(Date.UTC(Number(fmt_(now, 'yyyy')), Number(fmt_(now, 'M')) - 1 - REST_MONTHS, 1, 3)), 'yyyy-MM');
  if (last >= 2) sh.getRange(2, 1, last - 1, 3).getValues().forEach(function (r) { if (String(r[0]) >= limit) recent[String(r[2])] = 1; });
  var picked = ranks.filter(function (x) { return !recent[x.n]; }).slice(0, INVITES);
  picked.forEach(function (x) { sh.appendRow(["'" + thisM, ranks.indexOf(x) + 1, x.n, x.s, fmt_(now, 'yyyy/MM/dd'), '', '']); });
  rebuild();
}
