/**
 * アンケートの受付（ウェブアプリ）
 *
 *   POST {kind:"survey.submit", ...}  … 回答を受けつける（LINEで開いた時は idToken を本物か確かめる）
 *   GET  ?action=survey.stats          … 「いま集まっている困りごとランキング」（答えた直後の画面で使う）
 *
 * 返事は、サイトの会社GASと同じ形：{ok:true,...} / {ok:false,error:"code",message:"お客様に見せてよい日本語"}
 * 個人情報（メール・LINE ID・トークン）はログに出さない。
 *
 * スクリプトプロパティ（Hub.gs の分に加えて）
 *   SURVEY_SHEET_ID        … 回答を入れるスプレッドシートID
 *   CAMPAIGN_ID            … 今回の回の名前（js/survey-config.js と同じ）
 *   DEADLINE               … しめきり（YYYY-MM-DD。この日の23:59まで）
 *   LINE_LOGIN_CHANNEL_ID  … LIFF を作った「LINEログイン」チャネルのチャネルID（IDトークンの確認に使う）
 *   LINK_SECRET            … メールのリンクの署名用。長い乱数（setupSecrets で自動で入る）
 *   MIN_SECONDS            … これより早く送られた回答は「要確認」（既定 40）
 */

var FIXED_HEADERS = ['受付日時', '更新日時', '回答ID', '顧客キー', 'メール(正規化)', 'LINEユーザーID', '経路', 'メールリストID', '回答秒数', '状態', '確認の理由', '更新回数'];
var MIN_TOP_CHARS = 15;

/* ---------- 入口 ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'survey.stats') return json_(Object.assign({ ok: true }, stats_(p.campaign || prop_('CAMPAIGN_ID'))));
    return json_({ ok: false, error: 'unknown', message: 'ページが見つかりません。' });
  } catch (err) { return fail_(err); }
}

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.kind === 'survey.submit') return json_(submit_(b));
    return json_({ ok: false, error: 'unknown', message: 'うけつけられない内容です。' });
  } catch (err) { return fail_(err); }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail_(err) {
  if (err && err.userMessage) return json_({ ok: false, error: err.code || 'failed', message: err.userMessage });
  console.error('survey error: ' + (err && err.stack || err));   // 個人情報は入れない
  return json_({ ok: false, error: 'failed', message: 'いま受けつけられません。少し待ってから、もう一度お試しください。' });
}
function userErr_(code, msg) { var e = new Error(code); e.code = code; e.userMessage = msg; return e; }

/* ---------- 受付 ---------- */
function submit_(b) {
  var campaign = prop_('CAMPAIGN_ID');
  if (b.campaign !== campaign) throw userErr_('closed', 'このアンケートは受付をしていません。');
  if (isClosed_()) throw userErr_('closed', 'このアンケートは、しめきりました。ご協力ありがとうございました。');

  var cache = CacheService.getScriptCache();
  var rid = String(b.requestId || '').slice(0, 64);
  if (rid) { var prev = cache.get('rid:' + rid); if (prev) return JSON.parse(prev); }   // 二度押し・やりなおしで二重にしない

  var email = normEmail(b.email);
  if (!email) throw userErr_('email', 'メールアドレスの形を確かめてください。');
  var a = cleanAnswers_(b.answers);
  if (String(a.top || '').replace(/\s/g, '').length < MIN_TOP_CHARS) throw userErr_('short', '「いちばん困ったこと」を' + MIN_TOP_CHARS + '文字以上で書いてください。');

  // 連続送信をおさえる（同じメールで10分に5回まで）
  var rk = 'rate:' + customerKey(email, '');
  var n = Number(cache.get(rk) || 0);
  if (n >= 5) throw userErr_('rate_limited', 'アクセスが集まっています。少し待ってから、もう一度お試しください。');
  cache.put(rk, String(n + 1), 600);

  var lineUserId = b.idToken ? verifyLine_(b.idToken) : '';
  var listId = b.m ? checkMailToken_(String(b.m)) : '';
  var src = lineUserId ? 'line' : (listId ? 'mail' : String(b.src || 'web').replace(/[^a-z]/g, '').slice(0, 10));
  var elapsed = Math.max(0, Math.min(86400, Number(b.elapsedSec) || 0));

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var key = upsertCustomer({ email: email, lineUserId: lineUserId, source: 'survey:' + campaign });
    var sh = responseSheet_(campaign, Object.keys(a));
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var col = function (h) { return head.indexOf(h) + 1; };

    // 1人1回：LINE ID で探す → なければメールで探す。見つかれば上書き
    var row = findRow_(sh, col('LINEユーザーID'), lineUserId) || findRow_(sh, col('メール(正規化)'), email);
    var flags = [];
    if (row && lineUserId) {
      var otherLine = sh.getRange(row, col('LINEユーザーID')).getValue();
      if (otherLine && otherLine !== lineUserId) { row = 0; flags.push('同じメールを別のLINEでも使用'); }
    }
    var now = new Date(), updated = !!row;
    var rec = row ? sh.getRange(row, 1, 1, head.length).getValues()[0] : head.map(function () { return ''; });
    if (!row) { rec[0] = now; rec[2] = Utilities.getUuid().slice(0, 8); rec[11] = 0; }
    rec[1] = now; rec[3] = key; rec[4] = email; rec[5] = lineUserId || rec[5]; rec[6] = src; rec[7] = listId || rec[7]; rec[8] = elapsed;
    rec[11] = (Number(rec[11]) || 0) + (updated ? 1 : 0);
    Object.keys(a).forEach(function (k) { rec[col(k) - 1] = Array.isArray(a[k]) ? a[k].join(' / ') : a[k]; });

    flags = flags.concat(qualityFlags_(sh, col, row, a, elapsed));
    var manual = String(rec[9] || '');
    rec[9] = manual === '無効' ? '無効' : (flags.length ? '要確認' : '有効');   // 人が「無効」にしたものは戻さない
    rec[10] = flags.join('・');

    if (row) sh.getRange(row, 1, 1, head.length).setValues([rec]);
    else sh.appendRow(rec);
  } finally { lock.releaseLock(); }

  cache.remove('stats:' + campaign);   // 自分の回答も入ったランキングを見せる
  var out = { ok: true, updated: updated, stats: stats_(campaign) };
  if (rid) cache.put('rid:' + rid, JSON.stringify(out), 600);
  return out;
}

function isClosed_() {
  var d = prop_('DEADLINE'); if (!d) return false;
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd') > d;
}

/** 回答の中身を整える（長すぎる文字・変な型を切る） */
function cleanAnswers_(raw) {
  var a = {};
  Object.keys(raw || {}).slice(0, 40).forEach(function (k) {
    if (!/^[a-z][a-z0-9_]{0,30}$/.test(k)) return;
    var v = raw[k];
    if (Array.isArray(v)) a[k] = v.slice(0, 20).map(function (x) { return safeCell_(String(x).slice(0, 200)); });
    else a[k] = safeCell_(String(v === null || v === undefined ? '' : v).slice(0, 1500));
  });
  return a;
}
/** =+-@ で始まる文字は、スプレッドシートの式として動かないようにする */
function safeCell_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

/**
 * 「抽選の対象にしてよいか」を人が確かめるための印。上手・下手では判定しない。
 * 白紙に近い・機械的・同じ人の重複だけを見る。
 */
function qualityFlags_(sh, col, selfRow, a, elapsed) {
  var f = [], top = String(a.top || '');
  if (elapsed && elapsed < Number(prop_('MIN_SECONDS', 40))) f.push('回答が速すぎる(' + elapsed + '秒)');
  var chars = top.replace(/\s/g, '');
  if (new Set(chars.split('')).size < 6) f.push('同じ文字のくりかえし');
  if (sh.getLastRow() >= 2 && top) {
    var hits = sh.getRange(2, col('top'), sh.getLastRow() - 1, 1).createTextFinder(top).matchEntireCell(true).findAll();
    if (hits.some(function (h) { return h.getRow() !== selfRow; })) f.push('ほかの回答と同じ文');
  }
  return f;
}

/** 回答のシート（回ごとに1枚）。質問が増えたら、列を右に足す */
function responseSheet_(campaign, answerKeys) {
  var ss = SpreadsheetApp.openById(prop_('SURVEY_SHEET_ID'));
  var name = 'R_' + campaign;
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(FIXED_HEADERS); sh.setFrozenRows(1); }
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var add = answerKeys.filter(function (k) { return head.indexOf(k) < 0; });
  if (add.length) sh.getRange(1, head.length + 1, 1, add.length).setValues([add]);
  return sh;
}

/* ---------- LINE の本人確認 ---------- */
function verifyLine_(idToken) {
  var res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post', muteHttpExceptions: true,
    payload: { id_token: String(idToken), client_id: prop_('LINE_LOGIN_CHANNEL_ID') }
  });
  if (res.getResponseCode() !== 200) throw userErr_('line', 'LINEの確認ができませんでした。LINEのアプリから開きなおしてください。');
  var j = JSON.parse(res.getContentText());
  if (!j.sub) throw userErr_('line', 'LINEの確認ができませんでした。LINEのアプリから開きなおしてください。');
  return j.sub;
}

/* ---------- メールのリンクの署名 ---------- */
function signId_(id) {
  var mac = Utilities.computeHmacSha256Signature(String(id), prop_('LINK_SECRET'));
  return Utilities.base64EncodeWebSafe(mac).replace(/=+$/, '').slice(0, 16);
}
function checkMailToken_(m) {
  var p = m.split('.');
  if (p.length !== 2 || !/^\d{1,7}$/.test(p[0])) return '';
  return signId_(p[0]) === p[1] ? p[0] : '';   // 署名が合わなければ、ただの「web」として扱う
}

/* ---------- 集計（答えた直後の画面に出す） ---------- */
function stats_(campaign) {
  var cache = CacheService.getScriptCache(), ck = 'stats:' + campaign;
  var hit = cache.get(ck); if (hit) return JSON.parse(hit);
  var ss = SpreadsheetApp.openById(prop_('SURVEY_SHEET_ID')), sh = ss.getSheetByName('R_' + campaign);
  var out = { total: 0, top: [] };
  if (sh && sh.getLastRow() >= 2) {
    var vals = sh.getDataRange().getValues(), head = vals.shift();
    var cP = head.indexOf('pains'), cS = head.indexOf('状態'), count = {};
    vals.forEach(function (r) {
      if (r[cS] === '無効') return;
      out.total++;
      String(r[cP] || '').split(' / ').forEach(function (x) { if (!x) return; if (x.indexOf('その他') === 0) x = 'その他'; count[x] = (count[x] || 0) + 1; });
    });
    out.top = Object.keys(count).map(function (k) { return { label: k, n: count[k] }; }).sort(function (x, y) { return y.n - x.n; }).slice(0, 5);
  }
  cache.put(ck, JSON.stringify(out), 300);
  return out;
}
