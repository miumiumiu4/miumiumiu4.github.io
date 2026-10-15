/**
 * 担当者メアドの受付係
 * タスク管理表のスプレッドシートで「拡張機能 → Apps Script」を開き、このファイルを貼り付けて
 * 「デプロイ → 新しいデプロイ → ウェブアプリ（実行ユーザー: 自分 / アクセス: 全員）」で公開する。
 */
var SHEET_NAME = '担当者メアド';
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return json_({ ok: true }); // ボット対策（人には見えない欄）

  var name = String(p.name || '').trim().slice(0, 50);
  var email = String(p.email || '').trim().toLowerCase().slice(0, 254);
  var memo = String(p.memo || '').trim().slice(0, 300);
  if (!name) return json_({ ok: false, error: 'お名前を入れてください。' });
  if (!EMAIL_RE.test(email)) return json_({ ok: false, error: 'メールアドレスの形を確かめてください。' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh) return json_({ ok: false, error: '受付の準備ができていません。' });
    var now = new Date();
    var last = sh.getLastRow();
    var emails = last > 1 ? sh.getRange(2, 2, last - 1, 1).getValues() : [];
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).toLowerCase() === email) {
        var row = i + 2;
        sh.getRange(row, 1).setValue(safe_(name));
        sh.getRange(row, 3).setValue(safe_(memo));
        sh.getRange(row, 5).setValue(now);
        return json_({ ok: true, updated: true });
      }
    }
    sh.appendRow([safe_(name), safe_(email), safe_(memo), now, now]);
    return json_({ ok: true, updated: false });
  } finally {
    lock.releaseLock();
  }
}

// 先頭が = + - @ の入力を数式として扱わせない
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
