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
 *   HUB_SHEET_ID        … 顧客ハブのスプレッドシートID（アンケートと同じファイルでもよい）
 *   BOOKING_SHEET_ID    … 予約が入っているスプレッドシートID
 *   BOOKING_SHEET_NAME  … そのシート名（例：予約）
 *   BOOKING_EMAIL_HEADER… メールの列の見出し（既定：メール）
 *   BOOKING_DATE_HEADER … 作業日の列の見出し（既定：作業日）
 *   BOOKING_ID_HEADER   … 予約番号の列の見出し（既定：予約番号）
 */

var HUB_SHEET = 'customers';
var HUB_HEADERS = ['顧客キー', 'メール(正規化)', 'LINEユーザーID', '最初に見た日時', '最後に見た日時', '経路', '予約回数', '最初の予約日', '最後の予約日', '予約番号(最新)', '照合日時'];

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
    sh.appendRow([key, em, lid, now, now, p.source || '', '', '', '', '', '']);
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

/**
 * 予約のスプレッドシートを読んで、顧客ハブに「予約回数・最初／最後の予約日」を書きこむ。
 * 1時間ごとのトリガーで動かす（setupTriggers を参照）。予約シートは読むだけ。
 */
function linkBookings() {
  var bid = prop_('BOOKING_SHEET_ID'); if (!bid) return;
  var bs = SpreadsheetApp.openById(bid).getSheetByName(prop_('BOOKING_SHEET_NAME', '予約'));
  if (!bs || bs.getLastRow() < 2) return;
  var vals = bs.getDataRange().getValues(), head = vals.shift();
  var ci = function (name) { return head.indexOf(name); };
  var cE = ci(prop_('BOOKING_EMAIL_HEADER', 'メール')), cD = ci(prop_('BOOKING_DATE_HEADER', '作業日')), cI = ci(prop_('BOOKING_ID_HEADER', '予約番号'));
  if (cE < 0) throw new Error('予約シートにメールの列が見つかりません。BOOKING_EMAIL_HEADER を確かめてください');

  var byEmail = {};
  vals.forEach(function (r) {
    var em = normEmail(r[cE]); if (!em) return;
    var d = cD >= 0 && r[cD] ? new Date(r[cD]) : null;
    var x = byEmail[em] || (byEmail[em] = { n: 0, first: null, last: null, id: '' });
    x.n++;
    if (d && !isNaN(d)) {
      if (!x.first || d < x.first) x.first = d;
      if (!x.last || d >= x.last) { x.last = d; x.id = cI >= 0 ? String(r[cI]) : ''; }
    }
  });

  var sh = hubSheet_(); if (sh.getLastRow() < 2) return;
  var rng = sh.getRange(2, 1, sh.getLastRow() - 1, HUB_HEADERS.length), rows = rng.getValues(), now = new Date();
  rows.forEach(function (r) {
    var x = byEmail[r[1]];
    r[6] = x ? x.n : 0; r[7] = x && x.first ? x.first : ''; r[8] = x && x.last ? x.last : ''; r[9] = x ? x.id : ''; r[10] = now;
  });
  rng.setValues(rows);
}

/** 顧客キーから、その人のカードを読む（ほかのシステム用） */
function getCustomer(key) {
  var sh = hubSheet_(), row = findRow_(sh, 1, key);
  if (!row) return null;
  var r = sh.getRange(row, 1, 1, HUB_HEADERS.length).getValues()[0], o = {};
  HUB_HEADERS.forEach(function (h, i) { o[h] = r[i]; });
  return o;
}
