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
  var outHead = ['回答ID', '顧客キー', '状態', '経路', 'お客さまの種類', '予約回数', '最後の予約日'].concat(qCols);
  var out = vals.map(function (r) {
    var h = byKey[r[3]] || [], n = Number(h[6]) || 0;
    var seg = n === 0 ? 'まだ予約なし' : n === 1 ? '1回利用' : 'リピーター';
    return [r[2], r[3], r[9], r[6], seg, n, h[8] || ''].concat(r.slice(FIXED_HEADERS.length));
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
