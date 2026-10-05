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
