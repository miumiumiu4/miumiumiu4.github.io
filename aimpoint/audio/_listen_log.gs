// ===== 朝の5分音声：だれが・何日目を・どこまで聞いたか =====
// 音声ページ（aimpoint.co.jp/audio/NN/）が、聞いている間15秒ごと・一時停止・閉じたときに送ってくる。
// 記録は送信表のファイル（講座前の毎日音声_オプチャ送信表）の「記録」「やる気ランキング」「見方」タブに書く（11/23 さとぴー：1つのファイルにまとめる）。
// 送信表タブ（HAPPYが毎朝使う）は触らない。新しいタブは右端に足す。
// 使い方：Apps Script「朝の5分_再生記録」に貼る → setup() を1回実行 → デプロイを管理で新しいバージョン（URLはそのまま）。
var START = new Date('2026-11-22T00:00:00+09:00'); // 1日目を配る日（N日目は START + N-1 日）
var TZ = 'Asia/Tokyo';
var SS_ID = '1JeV9-11BpaZ8Enr7-ZQMQGoMBhyVSJ3_jVxN0KFZWJk';
function ss_() { return SpreadsheetApp.openById(SS_ID); }
var REC = '記録', RANK = 'やる気ランキング', README = '見方';
var EXCL = 'ランキングから外す名前'; // さとぴー本人・テスト・スタッフ。記録は残すが、ランキングとプレゼント選考には出さない
var REC_HEAD = ['キー', '名前', '日', '一番先まで聞いた(秒)', '音声の長さ(秒)', '進み(%)', '聞いた合計(秒)',
  'はじめて聞いた', '最後に聞いた', '配った日のうちに聞いた', 'LINE内で聞いた', '外部ブラウザで聞いた', '端末'];

function setup() {
  var ss = ss_();
  var r = ss.getSheetByName(REC) || ss.insertSheet(REC, ss.getSheets().length);
  r.getRange(1, 1, 1, REC_HEAD.length).setValues([REC_HEAD]).setFontWeight('bold');
  r.setFrozenRows(1); r.hideColumns(1);
  (ss.getSheetByName(RANK) || ss.insertSheet(RANK, ss.getSheets().length));
  if (!ss.getSheetByName(EXCL)) {
    var x = ss.insertSheet(EXCL, ss.getSheets().length);
    x.getRange(1, 1, 1, 2).setValues([['名前（記録の「名前」と同じに書く）', 'メモ']]).setFontWeight('bold');
    x.setFrozenRows(1);
  }
  var h = ss.getSheetByName(README) || ss.insertSheet(README, ss.getSheets().length);
  h.clear();
  h.getRange(1, 1, 9, 1).setValues([
    ['このシートの見方'],
    ['「記録」：1人×1日で1行。どこまで聞いたか・合計で何秒聞いたかが自動で入ります（15秒ごとに更新）。'],
    ['「やる気ランキング」：1時間ごとに自動で並べ直します。'],
    ['点数：80%以上聞いた日 10点／その日のうちに聞いた +3点／最後まで聞いた +2点／2回以上聞いた +2点／一番長い連続日数 ×1点'],
    ['同じ名前は同じ人としてまとめます（全角・半角・空白の違いはそろえます）。'],
    ['端末の欄に番号が2つ以上ある人は、LINE内と外部ブラウザの両方で聞いたか、同じ名前の別の人です。'],
    ['先送りして最後まで飛ばした分は「聞いた」に入りません（再生して進んだところだけ数えます）。'],
    ['「ランキングから外す名前」：ここに書いた名前（さとぴー本人・テスト・スタッフ）は、記録は残りますがランキングと音声ページの順位には出ません。'],
    ['音声ページのランキング：「今週」はその週に配った7日分の音声の点数、「ここまでの合計」は全部の点数。上位5人と、本人の順位が出ます。']
  ]);
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rebuildRanking').timeBased().everyHours(1).create();
  rebuildRanking();
}

function norm_(s) {
  return String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 30);
}

var NICK = 'ニックネーム'; // 選ばれたニックネームの控え（かぶり防止）

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// 使われているニックネームの一覧（記録の名前＋選ばれた控え）
function takenNames_() {
  var cache = CacheService.getScriptCache(), c = cache.get('taken');
  if (c) return JSON.parse(c);
  var ss = ss_(), set = {};
  [[REC, 2], [NICK, 1]].forEach(function (t) {
    var sh = ss.getSheetByName(t[0]); if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, t[1], sh.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0]) set[String(r[0])] = 1; });
  });
  var names = Object.keys(set);
  cache.put('taken', JSON.stringify(names), 60);
  return names;
}

// ?taken=1 → 使用中の名前一覧 ／ ?reserve=名前&d=端末 → 控えに書く（使用中なら ok:false）
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.taken) return json_({ names: takenNames_() });
  if (p.rank) return json_(rankJson_(p.n || ''));
  if (p.reserve) {
    var name = norm_(p.reserve), dev = String(p.d || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
    if (!name) return json_({ ok: false });
    var lock = LockService.getScriptLock(); lock.waitLock(15000);
    try {
      CacheService.getScriptCache().remove('taken');
      if (takenNames_().indexOf(name) >= 0) return json_({ ok: false });
      var ss = ss_(), sh = ss.getSheetByName(NICK);
      if (!sh) { sh = ss.insertSheet(NICK, ss.getSheets().length); sh.getRange(1, 1, 1, 3).setValues([['ニックネーム', '端末', '選んだ日時']]).setFontWeight('bold'); sh.setFrozenRows(1); }
      sh.appendRow([name, dev, Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd HH:mm:ss')]);
      CacheService.getScriptCache().remove('taken');
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
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
  var line = p.ua === 'line';
  if (!name || !(day >= 1 && day <= 31)) return ContentService.createTextOutput('ng');

  var key = name.toLowerCase() + '|' + day;
  var now = new Date();
  var stamp = Utilities.formatDate(now, TZ, 'yyyy/MM/dd HH:mm:ss'); // ファイルのタイムゾーンに関係なく日本時間で書く
  var today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var release = Utilities.formatDate(new Date(START.getTime() + (day - 1) * 86400000), TZ, 'yyyy-MM-dd');

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = ss_().getSheetByName(REC);
    var cache = CacheService.getScriptCache();
    var row = Number(cache.get(key)) || 0;
    if (row && sh.getRange(row, 1).getValue() !== key) row = 0;
    if (!row) {
      var last = sh.getLastRow();
      if (last >= 2) {
        var keys = sh.getRange(2, 1, last - 1, 1).getValues();
        for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) { row = i + 2; break; }
      }
    }
    if (!row) {
      sh.appendRow([key, name, day, 0, 0, 0, 0, stamp, stamp, '', '', '', '']);
      row = sh.getLastRow();
    }
    cache.put(key, String(row), 21600);
    var v = sh.getRange(row, 1, 1, REC_HEAD.length).getValues()[0];
    v[3] = Math.max(Number(v[3]) || 0, Math.round(max));
    v[4] = Math.max(Number(v[4]) || 0, Math.round(dur));
    v[5] = v[4] ? Math.min(100, Math.round(v[3] / v[4] * 100)) : 0;
    v[6] = Math.round((Number(v[6]) || 0) + add);
    v[8] = stamp;
    if (today <= release && v[5] >= 80) v[9] = '○';
    if (line) v[10] = '○'; else v[11] = '○';
    var devs = String(v[12] || '').split(',').filter(String);
    if (dev && devs.indexOf(dev) < 0 && devs.length < 5) devs.push(dev);
    v[12] = devs.join(',');
    sh.getRange(row, 1, 1, REC_HEAD.length).setValues([v]);
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput('ok');
}

function excluded_() {
  var sh = ss_().getSheetByName(EXCL), set = {};
  if (sh && sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) {
    var n = norm_(r[0]); if (n) set[n.toLowerCase()] = 1;
  });
  return set;
}

// 今日が何日目か（配る前は0、最後は31まで）
function todayDay_() {
  var d = Math.floor((new Date().getTime() - START.getTime()) / 86400000) + 1;
  return Math.max(0, Math.min(31, d));
}

// 1人分の点数（from〜to日目の音声だけで数える）
function score_(p, from, to) {
  var n = 0, ontime = 0, full = 0, twice = 0, best = 0, cur = 0, sec = 0;
  for (var d = from; d <= to; d++) {
    var x = p.days[d];
    if (x) { sec += x.add; if (x.ontime) ontime++; if (x.full) full++; if (x.twice) twice++; }
    if (x && x.ok) { n++; cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return { s: n * 10 + ontime * 3 + full * 2 + twice * 2 + best, n: n, ontime: ontime, full: full, twice: twice, best: best, min: Math.round(sec / 60) };
}

// 記録から全員の点数をまとめる（外す名前は除く）
function snapshot_() {
  var sh = ss_().getSheetByName(REC), last = sh.getLastRow(), people = {}, ex = excluded_();
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, REC_HEAD.length).getValues().forEach(function (v) {
      var k = String(v[0]).split('|')[0], day = Number(v[2]);
      if (!k || ex[k] || !(day >= 1 && day <= 31)) return;
      var p = people[k] || (people[k] = { name: String(v[1]), days: {}, last: String(v[8]) });
      var pct = Number(v[5]) || 0;
      p.days[day] = { ok: pct >= 80, ontime: v[9] === '○', full: pct >= 95, twice: !!(v[4] && Number(v[6]) >= Number(v[4]) * 1.5), add: Number(v[6]) || 0 };
      if (String(v[8]) > p.last) p.last = String(v[8]);
    });
  }
  var td = todayDay_(), wk = Math.max(0, Math.floor((Math.max(td, 1) - 1) / 7)), wf = wk * 7 + 1, wt = Math.min(31, wf + 6);
  var list = Object.keys(people).map(function (k) {
    var p = people[k], tot = score_(p, 1, 31), w = score_(p, wf, wt), st = 0;
    for (var d = td; d >= 1; d--) { if (p.days[d] && p.days[d].ok) st++; else if (d === td) continue; else break; }
    var done = Object.keys(p.days).filter(function (d) { return p.days[d].ok; }).map(Number);
    return { k: k, n: p.name, tot: tot, w: w, st: st, done: done, last: p.last };
  });
  function order(f) {
    return list.slice().sort(function (a, b) { return b[f].s - a[f].s || b[f].min - a[f].min || (a.last < b.last ? -1 : 1); });
  }
  var snap = { td: td, wf: wf, wt: wt, at: Utilities.formatDate(new Date(), TZ, 'M/d H:mm'), w: [], tot: [], me: {} };
  ['w', 'tot'].forEach(function (f) {
    order(f).forEach(function (x, i) {
      if (x[f].s <= 0) return;
      if (i < 5) snap[f].push({ n: x.n, s: x[f].s, st: x.st });
      var m = snap.me[x.k] || (snap.me[x.k] = { st: x.st, done: x.done });
      m[f] = { r: i + 1, s: x[f].s };
    });
  });
  return { snap: snap, list: list, order: order };
}

function saveSnap_(snap) {
  try { CacheService.getScriptCache().put('rank', JSON.stringify(snap), 21600); } catch (e) { }
}

// 音声ページ用：?rank=1&n=ニックネーム → 上位5人（今週・合計）と本人の順位
function rankJson_(name) {
  var c = CacheService.getScriptCache().get('rank'), snap;
  if (c) snap = JSON.parse(c); else { snap = snapshot_().snap; saveSnap_(snap); }
  var k = norm_(name).toLowerCase(), out = { td: snap.td, wf: snap.wf, wt: snap.wt, at: snap.at, w: snap.w, tot: snap.tot, me: null };
  if (k) {
    if (snap.me[k]) out.me = snap.me[k];
    else if (excluded_()[k]) out.ex = true;
  }
  return out;
}

function rebuildRanking() {
  var ss = ss_(), out = ss.getSheetByName(RANK);
  var r = snapshot_(), snap = r.snap;
  saveSnap_(snap);
  var rows = r.order('tot').map(function (x, i) {
    var t = x.tot;
    return [i + 1, x.n, t.s, x.w.s, t.n, t.ontime, t.full, t.twice, t.best, x.st, t.min, x.last];
  });
  out.clear();
  var head = ['順位', '名前', 'やる気スコア（合計）', '今週の点数', '聞いた日数(80%以上)', 'その日のうちに聞いた', '最後まで聞いた', '2回以上聞いた', '最長連続日数', 'いまの連続日数', '聞いた合計(分)', '最後に聞いた'];
  out.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  out.setFrozenRows(1);
  if (rows.length) out.getRange(2, 1, rows.length, head.length).setValues(rows);
  out.getRange(2, 1, Math.min(3, Math.max(rows.length, 1)), head.length).setBackground(rows.length ? '#fff4c2' : null);
  out.getRange(1, head.length + 2).setValue('更新: ' + Utilities.formatDate(new Date(), TZ, 'M/d HH:mm') + '（今週＝' + snap.wf + '〜' + snap.wt + '日目）');
}
