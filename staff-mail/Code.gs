/**
 * スタッフのメールアドレス受付係（案件共有用）
 * スプレッドシート「スタッフのメールアドレス（案件共有用）」で「拡張機能 → Apps Script」を開き、
 * このファイルの中身をそのまま貼り付けて、
 * 「デプロイ → 新しいデプロイ → ウェブアプリ（実行ユーザー: 自分 / アクセスできるユーザー: 全員）」で公開する。
 * 受け付けるだけで、一覧を外へ返す入口はありません。
 */
var SHEET_NAME = '回答';
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return json_({ ok: true }); // ボット対策（人には見えない欄）

  var store = clean_(p.store, 60);
  var name = clean_(p.name, 50);
  var email = String(p.email || '').trim().toLowerCase().slice(0, 254);
  if (!store) return json_({ ok: false, error: '所属の店舗名を入れてください。' });
  if (!name) return json_({ ok: false, error: 'お名前を入れてください。' });
  if (!EMAIL_RE.test(email)) return json_({ ok: false, error: 'メールアドレスの形を確かめてください。' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh) return json_({ ok: false, error: '受付の準備ができていません。' });
    var now = new Date();
    var last = sh.getLastRow();
    var emails = last > 1 ? sh.getRange(2, 3, last - 1, 1).getValues() : [];
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).toLowerCase() === email) {
        var row = i + 2;
        sh.getRange(row, 1, 1, 2).setValues([[safe_(store), safe_(name)]]);
        sh.getRange(row, 5).setValue(now);
        return json_({ ok: true, updated: true });
      }
    }
    sh.appendRow([safe_(store), safe_(name), safe_(email), now, now]);
    return json_({ ok: true, updated: false });
  } finally {
    lock.releaseLock();
  }
}

// 全角の空白をそろえ、前後の空白を取る
function clean_(v, max) {
  return String(v || '').replace(/　/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// 先頭が = + - @ の入力を数式として扱わせない
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
