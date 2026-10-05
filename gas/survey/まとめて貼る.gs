/* このファイルは gas/survey/bundle.js が作ります。直すときは Hub.gs・Survey.gs・Admin.gs を直してから作りなおしてください。
   Apps Script の「コード.gs」の中身を全部消して、これを丸ごと貼りつけます。 */

/* ===== Hub.gs ===== */
/**
 * 顧客ハブ（どのシステムからも使う「お客さまの共通の台帳」）
 *
 * 例え：店の「顧客カード箱」。予約・アンケート・ありがとうシステム・品質チェックシートは、
 *       それぞれ自分のノートを持っていてよいが、「この人は誰か」は必ずこの箱のカード番号（顧客キー）で書く。
 *
 * ・つなぐ鍵：メールアドレス（正規化したもの）と LINE のユーザーID。どちらか一方で同じ人だと分かれば、同じ顧客キー
 * ・顧客キーはメールの SHA-256 から作るので、どのGASで計算しても同じになる（台帳を見なくても一致する）
 * ・予約データは「読むだけ」。予約のスプレッドシートは書きかえない
 *
 * スクリプトプロパティ（このGASの「プロジェクトの設定」）
 *   HUB_SHEET_ID     … 顧客ハブのスプレッドシートID（空なら、このGASがついているスプレッドシート）
 *   BOOKING_SOURCES  … 照合する予約表の一覧（JSON の配列）。1件ずつ：
 *       { "name": "読者限定キャンペーン", "sheetId": "…", "tab": "予約", "headerRow": 1,
 *         "email": "メール", "date": ["作業確定日", "受付日時"], "id": "受付番号" }
 *     ・date は左から順に見て、最初に日付が入っている列を使う（作業日が空なら受付日など）
 *     ・headerRow は見出しの行（2行目に英語のキーがある表なら 2）
 *   BOOKING_EXCLUDE  … 照合から外すメール（テスト用の自分のアドレスなど）。カンマ区切り
 *   予約表のIDは公開のGitHubに書かないため、コードには入れず、ここにだけ入れる。
 *   （前の形の BOOKING_SHEET_ID・BOOKING_SHEET_NAME・BOOKING_*_HEADER も、1件の予約表として読める）
 */

var HUB_SHEET = 'customers';
var HUB_HEADERS = ['顧客キー', 'メール(正規化)', 'LINEユーザーID', '最初に見た日時', '最後に見た日時', '経路', '予約回数', '最初の予約日', '最後の予約日', '予約番号(最新)', '照合日時', '予約のあった表'];

/**
 * 設定の読み方：スクリプトプロパティ → なければ下の既定値。
 * 秘密でない値（チャネルIDなど）は既定値に書いておき、手で入れる設定を減らす。
 * トークンなど秘密の値は、ここには絶対に書かない（スクリプトプロパティだけ）。
 */
var DEFAULTS = {
  CAMPAIGN_ID: '2026-needs-01',
  LINE_LOGIN_CHANNEL_ID: '2011871268',   // LINEログインチャネル（LIFF 2011871268-iKlrVVRY）
  WINNERS: '100',
  AMOUNT: '500',
  SURVEY_PAGE_URL: 'https://miumiumiu4.github.io/survey.html',
  FROM_NAME: 'ありがとうエアコンお掃除専門店'
};
function prop_(k, d) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  if (v !== null && v !== '') return v;
  if (DEFAULTS[k] !== undefined) return DEFAULTS[k];
  // 回答・顧客ハブの置き場所：指定がなければ、このGASがついているスプレッドシート
  if (k === 'SURVEY_SHEET_ID' || k === 'HUB_SHEET_ID') { var ss = SpreadsheetApp.getActiveSpreadsheet(); if (ss) return ss.getId(); }
  return d === undefined ? '' : d;
}

/** メールの表記ゆれをそろえる（全角→半角・前後の空白・大文字小文字） */
function normEmail(s) {
  s = String(s || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  return /^[^@]+@[^@]+\.[^@]+$/.test(s) ? s : '';
}

/** 顧客キー：メールから必ず同じ値になる番号（C- + 16文字）。メールがない人は LINE ID から作る */
function customerKey(emailNorm, lineUserId) {
  var base = emailNorm ? 'e:' + emailNorm : (lineUserId ? 'l:' + lineUserId : '');
  if (!base) return '';
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, base, Utilities.Charset.UTF_8);
  return 'C-' + d.slice(0, 8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function hubSheet_() {
  var ss = SpreadsheetApp.openById(prop_('HUB_SHEET_ID'));
  var sh = ss.getSheetByName(HUB_SHEET);
  if (!sh) { sh = ss.insertSheet(HUB_SHEET); sh.appendRow(HUB_HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function findRow_(sh, col, value) {
  if (!value || sh.getLastRow() < 2) return 0;
  var hit = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(String(value)).matchCase(true).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

/**
 * 顧客カードを作る／更新する。ほかのシステムからもこれを呼ぶ。
 * @param {{email?:string, lineUserId?:string, source:string}} p
 * @return {string} 顧客キー
 * 先にメール、なければ LINE ID でカードを探す。LINE ID だけのカードにあとでメールが付いたら、同じカードにまとめる。
 */
function upsertCustomer(p) {
  var em = normEmail(p.email), lid = String(p.lineUserId || '');
  if (!em && !lid) return '';
  var sh = hubSheet_(), now = new Date();
  var row = findRow_(sh, 2, em) || findRow_(sh, 3, lid);
  if (!row) {
    var key = customerKey(em, lid);
    sh.appendRow([key, em, lid, now, now, p.source || '', '', '', '', '', '', '']);
    return key;
  }
  var r = sh.getRange(row, 1, 1, HUB_HEADERS.length).getValues()[0];
  if (em && !r[1]) r[1] = em;
  if (lid && !r[2]) r[2] = lid;
  r[4] = now;
  var src = String(r[5] || '').split(',').filter(String);
  if (p.source && src.indexOf(p.source) < 0) src.push(p.source);
  r[5] = src.join(',');
  sh.getRange(row, 1, 1, HUB_HEADERS.length).setValues([r]);
  return r[0];
}

/** 予約表の一覧（BOOKING_SOURCES）。なければ前の形の1件設定から作る */
function bookingSources_() {
  var raw = prop_('BOOKING_SOURCES');
  if (raw) {
    var list = JSON.parse(raw);
    if (!Array.isArray(list)) throw new Error('BOOKING_SOURCES は [ … ] の形（JSONの配列）で入れてください');
    return list;
  }
  var id = prop_('BOOKING_SHEET_ID');
  return id ? [{ name: '予約', sheetId: id, tab: prop_('BOOKING_SHEET_NAME', '予約'), headerRow: 1,
    email: prop_('BOOKING_EMAIL_HEADER', 'メール'), date: [prop_('BOOKING_DATE_HEADER', '作業日')], id: prop_('BOOKING_ID_HEADER', '予約番号') }] : [];
}

/** 予約表の日付を読む：日付の値・「2026/09/30(水)」・「2026-10-15 12時〜」・「2026/09/23 0:02」など。年のない日付は読まない */
function parseBookingDate_(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  var m = String(v || '').normalize('NFKC').match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * 予約表をすべて読んで、顧客ハブに「予約回数・最初／最後の予約日・どの表にあったか」を書きこむ。
 * 1時間ごとのトリガーで動かす（setupAll を参照）。予約表は読むだけ。
 * 1つの表が読めなくても、ほかの表の照合は続ける（読めなかった表は「照合の記録」シートに残す）。
 */
function linkBookings() {
  var sources = bookingSources_(); if (!sources.length) return;
  var exclude = {};
  prop_('BOOKING_EXCLUDE').split(',').forEach(function (e) { e = normEmail(e); if (e) exclude[e] = 1; });

  var byEmail = {}, report = [];
  sources.forEach(function (src) {
    try {
      var sh = SpreadsheetApp.openById(src.sheetId).getSheetByName(src.tab);
      if (!sh) throw new Error('タブ「' + src.tab + '」がありません');
      var hr = Number(src.headerRow) || 1;
      var vals = sh.getDataRange().getValues();
      var head = (vals[hr - 1] || []).map(function (h) { return String(h).trim(); });
      var col = function (name) { return name ? head.indexOf(String(name).trim()) : -1; };
      var cE = col(src.email), cI = col(src.id);
      var cDs = [].concat(src.date || []).map(col).filter(function (c) { return c >= 0; });
      if (cE < 0) throw new Error('メールの列「' + src.email + '」が見出しにありません');
      var n = 0;
      vals.slice(hr).forEach(function (r) {
        var em = normEmail(r[cE]); if (!em || exclude[em]) return;
        var d = null;
        for (var i = 0; i < cDs.length && !d; i++) d = parseBookingDate_(r[cDs[i]]);
        var x = byEmail[em] || (byEmail[em] = { n: 0, first: null, last: null, id: '', from: {} });
        x.n++; n++; x.from[src.name] = 1;
        if (d) {
          if (!x.first || d < x.first) x.first = d;
          if (!x.last || d >= x.last) { x.last = d; x.id = cI >= 0 ? String(r[cI]) : ''; }
        }
      });
      report.push([new Date(), src.name, '読めた', n]);
    } catch (err) {
      report.push([new Date(), src.name || src.sheetId, '読めない：' + err.message, 0]);
    }
  });

  var sh = hubSheet_(), now = new Date();
  if (sh.getLastRow() >= 2) {
    var rng = sh.getRange(2, 1, sh.getLastRow() - 1, HUB_HEADERS.length), rows = rng.getValues();
    rows.forEach(function (r) {
      var x = byEmail[r[1]];
      r[6] = x ? x.n : 0; r[7] = x && x.first ? x.first : ''; r[8] = x && x.last ? x.last : ''; r[9] = x ? x.id : ''; r[10] = now;
      r[11] = x ? Object.keys(x.from).join('・') : '';
    });
    rng.setValues(rows);
  }
  logLink_(report);
}

/** 照合の記録（どの表が何件読めたか）。古いものから消して200行までにする */
function logLink_(rows) {
  var ss = hubSheet_().getParent(), lg = ss.getSheetByName('照合の記録');
  if (!lg) { lg = ss.insertSheet('照合の記録'); lg.appendRow(['日時', '予約表', '結果', 'メールのある予約の件数']); lg.setFrozenRows(1); }
  if (rows.length) lg.getRange(lg.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
  var extra = lg.getLastRow() - 201; if (extra > 0) lg.deleteRows(2, extra);
}

/** 顧客キーから、その人のカードを読む（ほかのシステム用） */
function getCustomer(key) {
  var sh = hubSheet_(), row = findRow_(sh, 1, key);
  if (!row) return null;
  var r = sh.getRange(row, 1, 1, HUB_HEADERS.length).getValues()[0], o = {};
  HUB_HEADERS.forEach(function (h, i) { o[h] = r[i]; });
  return o;
}

/* ===== Survey.gs ===== */
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

/* ===== Admin.gs ===== */
/**
 * 管理の作業（スプレッドシートの「アンケート管理」メニューから動かす）
 *
 *   1. はじめの準備 …… 署名の鍵・トリガーを作る（1回だけ）
 *   2. メール用リンクを作る …… mail_list シートのメール1件ずつに、署名つきのリンクを作る
 *   3. 抽選する …… しめきり後に1回だけ。「有効」の人から公平に選び、種（seed）を記録する
 *   4. 当選メールを送る …… W_ シートの「ギフトコード」が入っている人に送る（1日の上限まで・何度でも続きから）
 *   5. 結果を全員に知らせる …… LINEで答えた人はLINE、メールの人はメール（上限まで・続きから）
 *
 * 追加のスクリプトプロパティ
 *   WINNERS                … 当選人数（既定 100）
 *   AMOUNT                 … 金額（既定 500）
 *   REPORT_URL             … 結果レポートのURL（決まったら入れる）
 *   LINE_MESSAGING_TOKEN   … 公式LINE（Messaging API）のチャネルアクセストークン（長期）
 *   FROM_NAME              … メールの差出人名（既定：ありがとうエアコンお掃除専門店）
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('アンケート管理')
    .addItem('1. はじめの準備', 'setupAll')
    .addItem('2. メール用リンクを作る', 'makeMailLinks')
    .addItem('3. 抽選する（しめきり後に1回）', 'drawWinners')
    .addItem('4. 当選メールを送る', 'sendGiftMails')
    .addItem('5. 結果を全員に知らせる', 'notifyResults')
    .addSeparator()
    .addItem('予約データと今すぐ照合', 'hourly')
    .addToUi();
}

function setupAll() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('LINK_SECRET')) p.setProperty('LINK_SECRET', Utilities.getUuid() + Utilities.getUuid());
  var id = SpreadsheetApp.getActiveSpreadsheet().getId();   // ウェブアプリからも確実に同じシートを使うように記録
  if (!p.getProperty('SURVEY_SHEET_ID')) p.setProperty('SURVEY_SHEET_ID', id);
  if (!p.getProperty('HUB_SHEET_ID')) p.setProperty('HUB_SHEET_ID', id);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'hourly') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('hourly').timeBased().everyHours(1).create();
  toast_('準備ができました。1時間ごとに予約データと照合します。');
}

/** 1時間ごと：予約データ → 顧客ハブ → 分析シート */
function hourly() { linkBookings(); buildAnalysis(); }

/* ---------- 分析シート：回答 × 予約の記録 ---------- */
function buildAnalysis() {
  var campaign = prop_('CAMPAIGN_ID');
  var ss = SpreadsheetApp.openById(prop_('SURVEY_SHEET_ID')), src = ss.getSheetByName('R_' + campaign);
  if (!src || src.getLastRow() < 2) return;
  var vals = src.getDataRange().getValues(), head = vals.shift();
  var hub = hubSheet_(), hv = hub.getLastRow() >= 2 ? hub.getRange(2, 1, hub.getLastRow() - 1, HUB_HEADERS.length).getValues() : [];
  var byKey = {}; hv.forEach(function (r) { byKey[r[0]] = r; });
  var qCols = head.slice(FIXED_HEADERS.length);
  var outHead = ['回答ID', '顧客キー', '状態', '経路', 'お客さまの種類', '予約回数', '最後の予約日', '予約のあった表'].concat(qCols);
  var out = vals.map(function (r) {
    var h = byKey[r[3]] || [], n = Number(h[6]) || 0;
    var seg = n === 0 ? 'まだ予約なし' : n === 1 ? '1回利用' : 'リピーター';
    return [r[2], r[3], r[9], r[6], seg, n, h[8] || '', h[11] || ''].concat(r.slice(FIXED_HEADERS.length));
  });
  var sh = ss.getSheetByName('分析_' + campaign) || ss.insertSheet('分析_' + campaign);
  sh.clearContents();
  sh.getRange(1, 1, 1, outHead.length).setValues([outHead]);
  if (out.length) sh.getRange(2, 1, out.length, outHead.length).setValues(out);
  sh.setFrozenRows(1);
}

/* ---------- メール用リンク ---------- */
/** mail_list シート：A列=番号（自動）, B列=メール, C列=リンク（自動）。B列にメールを貼ってから動かす */
function makeMailLinks() {
  var ss = SpreadsheetApp.openById(prop_('SURVEY_SHEET_ID'));
  var sh = ss.getSheetByName('mail_list');
  if (!sh) { sh = ss.insertSheet('mail_list'); sh.appendRow(['番号', 'メール', 'リンク']); toast_('mail_list シートを作りました。B列にメールを貼ってから、もう一度動かしてください。'); return; }
  var base = prop_('SURVEY_PAGE_URL', 'https://miumiumiu4.github.io/survey.html');
  var last = sh.getLastRow(); if (last < 2) return;
  var rng = sh.getRange(2, 1, last - 1, 3), rows = rng.getValues();
  rows.forEach(function (r, i) {
    if (!normEmail(r[1])) return;
    var id = r[0] || (i + 1);
    r[0] = id;
    r[2] = base + '?src=mail&m=' + id + '.' + signId_(id);
    upsertCustomer({ email: r[1], source: 'maillist' });
  });
  rng.setValues(rows);
  toast_('リンクを作りました。メール配信ツールに C列 を差しこんでください。');
}

/* ---------- 抽選 ---------- */
function drawWinners() {
  var campaign = prop_('CAMPAIGN_ID');
  if (!isClosed_()) { toast_('まだしめきり前です。DEADLINE を過ぎてから抽選してください。'); return; }
  var ss = SpreadsheetApp.openById(prop_('SURVEY_SHEET_ID'));
  if (ss.getSheetByName('W_' + campaign)) { toast_('この回はもう抽選ずみです（やりなおしはできません）。'); return; }
  var src = ss.getSheetByName('R_' + campaign), vals = src.getDataRange().getValues(), head = vals.shift();
  var pending = vals.filter(function (r) { return r[9] === '要確認'; }).length;
  if (pending) { toast_('「要確認」が ' + pending + ' 件のこっています。R_ シートの「状態」を「有効」か「無効」にしてから抽選してください。'); return; }

  // 1人1回：メールと LINE ID の両方で重複を消す
  var seenE = {}, seenL = {}, pool = [];
  vals.forEach(function (r) {
    if (r[9] !== '有効') return;
    if (seenE[r[4]] || (r[5] && seenL[r[5]])) return;
    seenE[r[4]] = 1; if (r[5]) seenL[r[5]] = 1;
    pool.push(r);
  });
  pool.sort(function (x, y) { return String(x[2]) < String(y[2]) ? -1 : 1; });   // 回答IDの順にならべてから混ぜる（あとで同じ結果を再現できる）

  var seed = Utilities.getUuid();
  for (var i = pool.length - 1; i > 0; i--) { var j = rand_(seed, i) % (i + 1); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  var win = pool.slice(0, Number(prop_('WINNERS', 100)));

  var w = ss.insertSheet('W_' + campaign);
  w.appendRow(['順番', '回答ID', '顧客キー', 'メール', 'LINEユーザーID', 'ギフトコード', 'メール送信日時', 'LINE送信日時']);
  if (win.length) w.getRange(2, 1, win.length, 8).setValues(win.map(function (r, k) { return [k + 1, r[2], r[3], r[4], r[5], '', '', '']; }));
  w.setFrozenRows(1);
  var log = ss.getSheetByName('draw_log') || ss.insertSheet('draw_log');
  if (log.getLastRow() === 0) log.appendRow(['日時', '回', '対象人数', '当選人数', '種(seed)', 'やりかた']);
  log.appendRow([new Date(), campaign, pool.length, win.length, seed, '「有効」かつ1人1件を回答ID順にならべ、seed から作った数で Fisher-Yates の入れかえ']);
  toast_('抽選しました。対象 ' + pool.length + ' 人から ' + win.length + ' 人。W_ シートの「ギフトコード」を入れてから、4 を動かしてください。');
}
function rand_(seed, i) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed + ':' + i, Utilities.Charset.UTF_8);
  return ((d[0] & 127) << 24 | (d[1] & 255) << 16 | (d[2] & 255) << 8 | (d[3] & 255)) >>> 0;
}

/* ---------- 当選の連絡 ---------- */
function sendGiftMails() {
  var campaign = prop_('CAMPAIGN_ID'), amount = prop_('AMOUNT', 500);
  var w = SpreadsheetApp.openById(prop_('SURVEY_SHEET_ID')).getSheetByName('W_' + campaign);
  if (!w || w.getLastRow() < 2) { toast_('まだ抽選していません。'); return; }
  var rng = w.getRange(2, 1, w.getLastRow() - 1, 8), rows = rng.getValues(), sent = 0, left = 0;
  rows.forEach(function (r) {
    if (r[6] || !r[5]) return;                                  // 送ったもの・コード未入力はとばす
    if (MailApp.getRemainingDailyQuota() < 1) { left++; return; }
    MailApp.sendEmail({
      to: r[3], name: prop_('FROM_NAME', 'ありがとうエアコンお掃除専門店'),
      subject: '【当選のお知らせ】アンケートのお礼 Amazonギフトカード' + amount + '円分',
      body: [
        'アンケートにご協力いただき、ありがとうございました。',
        '抽選の結果、ご当選されましたので、Amazonギフトカード' + amount + '円分をお送りします。', '',
        'ギフトカード番号：' + r[5],
        '登録の方法：https://www.amazon.co.jp/gc/redeem', '',
        '集計結果のレポートは、こちらからご覧いただけます：' + (prop_('REPORT_URL') || '（準備ができしだい、お送りします）'), '',
        '本キャンペーンは ありがとうエアコンお掃除専門店（エイムポイント合同会社）による提供です。',
        'Amazon.co.jp および Amazonジャパン合同会社とは関係ありません。',
        'Amazon、Amazon.co.jp およびそのロゴは Amazon.com, Inc. またはその関連会社の商標です。'
      ].join('\n')
    });
    r[6] = new Date(); sent++;
    if (r[4] && !r[7] && pushLine_(r[4], 'アンケートの抽選に当選しました！ご登録のメールアドレスに、Amazonギフトカード' + amount + '円分をお送りしました。迷惑メールのフォルダもご確認ください。')) r[7] = new Date();
  });
  rng.setValues(rows);
  toast_(sent + ' 件送りました。' + (left ? '今日の送信上限のため ' + left + ' 件のこりました。明日もう一度動かしてください。' : ''));
}

/* ---------- 全員へ結果のお知らせ（当選者は 4 で連絡ずみなので、それ以外の人） ---------- */
function notifyResults() {
  var campaign = prop_('CAMPAIGN_ID'), ss = SpreadsheetApp.openById(prop_('SURVEY_SHEET_ID'));
  var src = ss.getSheetByName('R_' + campaign), w = ss.getSheetByName('W_' + campaign);
  if (!w) { toast_('先に抽選してください。'); return; }
  var winners = {}; if (w.getLastRow() >= 2) w.getRange(2, 2, w.getLastRow() - 1, 1).getValues().forEach(function (r) { winners[r[0]] = 1; });
  var head = src.getRange(1, 1, 1, src.getLastColumn()).getValues()[0];
  var cN = head.indexOf('結果通知日時');
  if (cN < 0) { cN = head.length; src.getRange(1, cN + 1).setValue('結果通知日時'); }
  var rng = src.getRange(2, 1, src.getLastRow() - 1, cN + 1), rows = rng.getValues();
  var report = prop_('REPORT_URL') || '';
  var text = 'アンケートにご協力いただき、ありがとうございました。\n抽選の結果、今回は当選となりませんでした。\n' +
    (report ? 'みなさんの声をまとめた結果レポートはこちらです：' + report + '\n' : '') + 'いただいた声をもとに、作ったものは試作の段階でお知らせします。';
  var done = 0, left = 0;
  rows.forEach(function (r) {
    if (r[cN] || winners[r[2]] || r[9] === '無効') return;
    var ok = false;
    if (r[5]) ok = pushLine_(r[5], text);
    if (!ok) {
      if (MailApp.getRemainingDailyQuota() < 1) { left++; return; }
      MailApp.sendEmail({ to: r[4], name: prop_('FROM_NAME', 'ありがとうエアコンお掃除専門店'), subject: '【結果のお知らせ】暮らしの困りごとアンケート', body: text });
      ok = true;
    }
    if (ok) { r[cN] = new Date(); done++; }
  });
  rng.setValues(rows);
  toast_(done + ' 件お知らせしました。' + (left ? 'メールの1日の上限のため ' + left + ' 件のこりました。明日もう一度動かしてください。' : ''));
}

/** 公式LINEから1人に送る。送れたら true */
function pushLine_(userId, text) {
  var token = prop_('LINE_MESSAGING_TOKEN'); if (!token || !userId) return false;
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', muteHttpExceptions: true, contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: userId, messages: [{ type: 'text', text: text }] })
  });
  return res.getResponseCode() === 200;
}

function toast_(msg) {
  try { SpreadsheetApp.getActive().toast(msg, 'アンケート管理', 10); } catch (e) { console.log(msg); }
}
