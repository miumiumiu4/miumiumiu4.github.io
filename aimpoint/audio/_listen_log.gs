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
var REC_HEAD = ['キー', '名前', '日', '一番先まで聞いた(秒)', '音声の長さ(秒)', '進み(%)', '聞いた合計(秒)',
  'はじめて聞いた', '最後に聞いた', '配った日のうちに聞いた', 'LINE内で聞いた', '外部ブラウザで聞いた', '端末'];

function setup() {
  var ss = ss_();
  var r = ss.getSheetByName(REC) || ss.insertSheet(REC, ss.getSheets().length);
  r.getRange(1, 1, 1, REC_HEAD.length).setValues([REC_HEAD]).setFontWeight('bold');
  r.setFrozenRows(1); r.hideColumns(1);
  (ss.getSheetByName(RANK) || ss.insertSheet(RANK, ss.getSheets().length));
  var h = ss.getSheetByName(README) || ss.insertSheet(README, ss.getSheets().length);
  h.clear();
  h.getRange(1, 1, 8, 1).setValues([
    ['このシートの見方'],
    ['「記録」：1人×1日で1行。どこまで聞いたか・合計で何秒聞いたかが自動で入ります（15秒ごとに更新）。'],
    ['「やる気ランキング」：1時間ごとに自動で並べ直します。'],
    ['点数：80%以上聞いた日 10点／その日のうちに聞いた +3点／最後まで聞いた +2点／2回以上聞いた +2点／一番長い連続日数 ×1点'],
    ['同じ名前は同じ人としてまとめます（全角・半角・空白の違いはそろえます）。'],
    ['端末の欄に番号が2つ以上ある人は、LINE内と外部ブラウザの両方で聞いたか、同じ名前の別の人です。'],
    ['先送りして最後まで飛ばした分は「聞いた」に入りません（再生して進んだところだけ数えます）。'],
    ['']
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

function rebuildRanking() {
  var ss = ss_();
  var sh = ss.getSheetByName(REC), out = ss.getSheetByName(RANK);
  var last = sh.getLastRow();
  var people = {};
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, REC_HEAD.length).getValues().forEach(function (v) {
      var k = String(v[0]).split('|')[0];
      var p = people[k] || (people[k] = { name: v[1], days: {}, ontime: 0, full: 0, twice: 0, minutes: 0, last: v[8] });
      var pct = Number(v[5]) || 0;
      if (pct >= 80) p.days[v[2]] = true;
      if (v[9] === '○') p.ontime++;
      if (pct >= 95) p.full++;
      if (v[4] && Number(v[6]) >= Number(v[4]) * 1.5) p.twice++;
      p.minutes += (Number(v[6]) || 0) / 60;
      if (v[8] > p.last) p.last = v[8];
    });
  }
  var rows = Object.keys(people).map(function (k) {
    var p = people[k], n = Object.keys(p.days).length, best = 0, cur = 0;
    for (var d = 1; d <= 31; d++) { cur = p.days[d] ? cur + 1 : 0; best = Math.max(best, cur); }
    var score = n * 10 + p.ontime * 3 + p.full * 2 + p.twice * 2 + best;
    return [p.name, score, n, p.ontime, p.full, p.twice, best, Math.round(p.minutes), p.last];
  }).sort(function (a, b) { return b[1] - a[1] || b[7] - a[7]; });
  rows.forEach(function (r, i) { r.unshift(i + 1); });
  out.clear();
  var head = ['順位', '名前', 'やる気スコア', '聞いた日数(80%以上)', 'その日のうちに聞いた', '最後まで聞いた', '2回以上聞いた', '最長連続日数', '聞いた合計(分)', '最後に聞いた'];
  out.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  out.setFrozenRows(1);
  if (rows.length) out.getRange(2, 1, rows.length, head.length).setValues(rows);
  out.getRange(2, 1, Math.min(3, Math.max(rows.length, 1)), head.length).setBackground(rows.length ? '#fff4c2' : null);
  out.getRange(1, 12).setValue('更新: ' + Utilities.formatDate(new Date(), TZ, 'M/d HH:mm'));
}
