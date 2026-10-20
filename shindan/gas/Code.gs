// 診断レポート（止まり方診断シート＋第2回のクセ＋各回のふりかえり＋成長スコアの記録）
// ページ miumiumiu4.github.io/shindan/ → doPost で顧客ログ「診断」タブに1人1行（メールで上書き）
// メールは doPost では送らず、5分ごとのトリガー sendQueue が順番に送る（無料Gmailの1日100通内）。
// 文の型は Types.gs（ページの types.js と同じ中身）。

// SHEET_ID（顧客ログ）・SHINDAN_KEY・TEST_MAIL は Secret.gs
var TAB = '診断';
var HEAD = ['更新日時', 'メール', '名前', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', '合計', 'top', 'second', 'scene',
  'k1', 'k2', 'k3', 'k4', 'k5', 'k6', '送信済み', '送信日時', '今日の送信数', 'json', '回', 'src'];
var C = {}; HEAD.forEach(function (h, i) { C[h] = i + 1; });
var HIST_TAB = '診断_履歴';   // 回ごとに1行（メール×回で上書き）。前回との比べに使う
var HIST_HEAD = ['日時', 'メール', '回', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', '合計', 'top', 'ふりかえり', 'クセ'];
var KEEP_QUOTA = 10;      // 残りがこれを切ったら翌日に回す
var PER_MAIL_DAY = 5;     // 同じメールに1日に送る上限（いたずら対策）

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.key !== SHINDAN_KEY || p.type !== 'shindan') return out_('ng');
  var mail = String(p.mail || '').trim().toLowerCase();
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(mail) || mail.length > 254) return out_('ng');
  var scores, kuse;
  try { scores = JSON.parse(p.scores); kuse = JSON.parse(p.kuse || '[]'); } catch (err) { return out_('ng'); }
  if (!Array.isArray(scores) || scores.length !== 9) return out_('ng');
  scores = scores.map(function (n) { n = Number(n) || 0; return Math.max(0, Math.min(3, Math.round(n))); });
  kuse = [0, 1, 2, 3, 4, 5].map(function (i) { return SHINDAN.kuseLevels.indexOf(kuse[i]) >= 0 ? kuse[i] : ''; });
  // 一番・2番目はサーバーでも計算し直す（top は同点の中から選んだときだけ採用）
  var r = shindanRank(scores, Number(p.top) || 0);
  var d = {
    name: /%/.test(p.name || '') ? '' : String(p.name || '').trim().slice(0, 40),   // UTAGEの差し込み失敗（%name%）は空に
    scores: scores, top: r.top, second: r.second,
    scene: String(p.scene || '').trim().slice(0, 500),
    kuse: kuse,
    lesson: Math.max(0, Math.min(7, parseInt(p.lesson, 10) || 0))
  };
  var lq = [];
  try { lq = JSON.parse(p.lq || '[]'); } catch (err) {}
  d.lq = (SHINDAN.lessonQ[d.lesson] || []).map(function (q, i) { return SHINDAN.lessonA.indexOf(lq[i]) >= 0 ? lq[i] : ''; });
  var src = String(p.src || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30);
  d.src = src;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var now = new Date();
    var hr = history_(mail, d, now);
    d.prev = hr.prev; d.hist = hr.hist;
    var row = findRow_(sh, mail);
    var prev = row ? sh.getRange(row, 1, 1, HEAD.length).getValues()[0] : null;
    var vals = [now, mail, safe_(d.name)].concat(scores, [scores.reduce(function (a, b) { return a + b; }, 0),
      SHINDAN.types[d.top - 1].name, SHINDAN.types[d.second - 1].name, safe_(d.scene)], kuse,
      ['', prev ? prev[C['送信日時'] - 1] : '', prev ? prev[C['今日の送信数'] - 1] : '', JSON.stringify(d), d.lesson, src]);
    if (row) sh.getRange(row, 1, 1, vals.length).setValues([vals]);
    else sh.appendRow(vals);
    event_(now, mail, d, src);
  } finally { lock.releaseLock(); }
  return out_('ok');
}

// 時間トリガーから。未送信を古い順に送る。
function sendQueue() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var sh = sheet_();
    var n = sh.getLastRow() - 1;
    if (n < 1) return;
    var rows = sh.getRange(2, 1, n, HEAD.length).getValues();
    var queue = [];
    rows.forEach(function (v, i) { if (v[C['送信済み'] - 1] === '') queue.push({ i: i, t: v[0] }); });
    queue.sort(function (a, b) { return a.t - b.t; });
    var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    for (var q = 0; q < queue.length; q++) {
      if (MailApp.getRemainingDailyQuota() < KEEP_QUOTA) break;
      var v = rows[queue[q].i], r = queue[q].i + 2;
      var cnt = String(v[C['今日の送信数'] - 1] || '');   // "2026-10-20:3"
      var c = cnt.indexOf(today + ':') === 0 ? Number(cnt.split(':')[1]) : 0;
      if (c >= PER_MAIL_DAY) { sh.getRange(r, C['送信済み']).setValue('skip:上限'); continue; }
      try {
        var d = withUrls_(JSON.parse(v[C['json'] - 1]), v[C['メール'] - 1]);
        MailApp.sendEmail({
          to: v[C['メール'] - 1], subject: shindanSubject(d), body: shindanReport(d), htmlBody: shindanReportHtml(d),
          name: '三浦公嗣（ありがとうグループ）', replyTo: 'miumiumiu4@gmail.com'
        });
        sh.getRange(r, C['送信済み'], 1, 3).setValues([['済', new Date(), today + ':' + (c + 1)]]);
      } catch (err) {
        sh.getRange(r, C['送信済み']).setValue('error:' + String(err).slice(0, 200));
      }
    }
  } finally { lock.releaseLock(); }
}

// テスト：.../exec?t=test&k=合言葉 で TEST_MAIL に見本を1通（キューを通さずすぐ送る）
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.t !== 'test' || p.k !== SHINDAN_KEY) return out_('ok');
  var scores = [3, 1, 0, 2, 3, 0, 1, 0, 2], r = shindanRank(scores, 5);
  var d = withUrls_({ name: 'テスト', scores: scores, top: r.top, second: r.second, scene: '夜、一人で通帳を見ているとき', kuse: ['A', '', 'ややA', 'B', 'A', ''] }, TEST_MAIL);
  MailApp.sendEmail({ to: TEST_MAIL, subject: '【見本】' + shindanSubject(d), body: shindanReport(d), htmlBody: shindanReportHtml(d),
    name: '三浦公嗣（ありがとうグループ）', replyTo: 'miumiumiu4@gmail.com' });
  return out_('sent');
}

// 一度だけ手で実行：5分ごとのトリガーを入れる（二重には入れない）
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendQueue') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendQueue').timeBased().everyMinutes(5).create();
  sheet_();
}

// メールのボタン：結果ページ（答えを ?r= に詰める）と答え直し（メール入力済み）
function withUrls_(d, mail) {
  var r = Utilities.base64EncodeWebSafe(Utilities.newBlob(shindanPack(d)).getBytes()).replace(/=+$/, '');
  d.viewUrl = SHINDAN_PAGE + '?r=' + r;
  d.againUrl = SHINDAN_PAGE + '?mail=' + encodeURIComponent(mail);
  return d;
}

// 前回（同じメールの、今より前の回の一番新しい回。回が分からなければ最後に答えたもの）を探し、今回を履歴に書く
function history_(mail, d, now) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(HIST_TAB);
  if (!sh) {
    sh = ss.insertSheet(HIST_TAB);
    sh.getRange(1, 1, 1, HIST_HEAD.length).setValues([HIST_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < HIST_HEAD.length) {
    sh.getRange(1, 1, 1, HIST_HEAD.length).setValues([HIST_HEAD]).setFontWeight('bold');   // 列を足したとき
  }
  var js = function (x) { try { return JSON.parse(x || '[]') || []; } catch (e) { return []; } };
  var n = sh.getLastRow() - 1, mine = [];
  if (n > 0) sh.getRange(2, 1, n, HIST_HEAD.length).getValues().forEach(function (v, i) {
    if (String(v[1]).toLowerCase() === mail) mine.push({ row: i + 2, at: new Date(v[0]).getTime(), lesson: Number(v[2]) || 0, scores: v.slice(3, 12).map(Number), lq: js(v[14]), kuse: js(v[15]) });
  });
  var others = mine.filter(function (m) { return !(d.lesson && m.lesson === d.lesson); });
  var earlier = others.filter(function (m) { return d.lesson && m.lesson && m.lesson < d.lesson; });
  var pick = null;
  (earlier.length ? earlier : others).forEach(function (m) {
    if (!pick || (earlier.length ? m.lesson > pick.lesson : m.at > pick.at)) pick = m;
  });
  var vals = [now, mail, d.lesson].concat(d.scores, [d.scores.reduce(function (a, b) { return a + b; }, 0), SHINDAN.types[d.top - 1].name, JSON.stringify(d.lq || []), JSON.stringify(d.kuse || [])]);
  var same = mine.filter(function (m) { return m.lesson === d.lesson; })[0];
  if (same) sh.getRange(same.row, 1, 1, vals.length).setValues([vals]);
  else sh.appendRow(vals);
  return {
    prev: pick ? { lesson: pick.lesson, scores: pick.scores } : null,
    hist: mine.map(function (m) { return { l: m.lesson, s: m.scores, q: m.lq, k: m.kuse }; })   // 成長の記録（今回の回は shindanSeries で入れ替わる）
  };
}

function sheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.insertSheet(TAB);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < HEAD.length) {
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');   // 列を足したとき
  }
  return sh;
}

function findRow_(sh, mail) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var hit = sh.getRange(2, C['メール'], n, 1).createTextFinder(mail).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

// events タブは受け口GASと同じ8列：受信日時・種類・メール・名前・経路・登録日時・メモ・届いた中身
function event_(now, mail, d, src) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('events');
  if (!sh) return;
  sh.appendRow([now, 'shindan', mail, safe_(d.name), 'ever-shindan' + (src ? ':' + src : ''), '', SHINDAN.types[d.top - 1].name, JSON.stringify(d).slice(0, 45000)]);
}

// =,+,-,@ で始まる文字は数式として読まれないよう先頭に ' を付ける
function safe_(s) { s = String(s || ''); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function out_(s) { return ContentService.createTextOutput(s); }
