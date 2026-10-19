// 止まり方診断シート（第1〜3回）＋第2回のクセ。結果は画面に出し、GASへ送るとメールでも届く。
var RECEIVER_URL = '';   // 「エバー診断レポート」GASのウェブアプリURL
var KEY = 'shd-zoY_2xXtDpzjaZjk';
// 原文：ワークシート_第1〜3回_無料公開 の止まり方診断シート
var QUESTIONS = [
  ['うまくいかないのは、環境や人のせいだと思うことがある', 'うまくいかないのは、景気・会社・家族など周りのせいだと思うことが多い', '「〇〇が変わってくれれば」と思うことがある'],
  ['「お金」「時期」が、いつも一番の理由になる', '「お金が貯まったら」「時期が来たら」と言っている', 'やらない理由なら、すぐにいくつも思いつく'],
  ['正しい順番や、確実な方法が分かるまで動きたくない', '調べれば調べるほど、決められなくなる', '「前例がない」「平均はこう」と、外の物差しで決めることが多い'],
  ['不安なとき、人に相談せず一人で抱える', '教わったことを、つい自分のやり方に変えてしまう', '「自分でやったほうが確かだ」と思って、人に任せられない'],
  ['失敗したときの、周りの目や一言が怖い', '前に失敗した経験が、今も決断にブレーキをかけている', '「結局また同じことになるんじゃないか」と、最悪のことを考えてしまう'],
  ['「もうちょっと準備してから」「もう少し良くしてから」が口ぐせ', '「明日でいいか」が続いている', '一度言ったら絶対にやり切らなきゃと思って、口に出せない'],
  ['今がそこそこなので、変わる理由が見つからない', '大きな目標を聞いても、ピンとこない', '新しいことを考えると、なんとなく落ち着かず、今のままがいいと思ってしまう'],
  ['「自分なんて」「どうせ自分は」と思うことがある', '自分には向いていない、縁がないと決めつけていることがある', '動けないのは「自分には能力が足りないからだ」と思う'],
  ['不安になると、同じことをぐるぐる考えてしまう', '不安をまぎらわすために、別のことに逃げてしまう', '不安から、同じ毎日をぐるぐる繰り返している']
];
var TYPE_LABEL = ['他責', '理由探し（お金・時期）', '正解待ち', '抱え込み・自己流', '失敗恐怖', '完璧主義・先延ばし', '現状維持・ブレーキ', '自己否定・思い込み', '不安ループ'];
var KUSE_B = ['思ったら動く', 'そのために今動く', '自分の確信で決める', '原因は自分の側にもある', '良くするシナリオを考える', '自分の価値観で決める'];
var STORE = 'ever_shindan_v1';

(function () {
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {} }
  };
  var $ = function (id) { return document.getElementById(id); };
  var f = $('f');

  // 27問（タイプの名前は出さない＝先入観なしで答えてもらう）
  var h = [];
  QUESTIONS.forEach(function (qs, t) {
    h.push('<div class="type">');
    qs.forEach(function (q, j) {
      h.push('<label class="chk"><input type="checkbox" name="q" value="' + t + '-' + j + '"><span>' + esc(q) + '</span></label>');
    });
    h.push('</div>');
  });
  $('qs').innerHTML = h.join('');

  h = [];
  SHINDAN.kuse.forEach(function (k, i) {
    h.push('<div class="kuse"><div class="t">' + (i + 1) + '</div><div class="ab"><div>A：' + esc(k.name) + '</div><div>B：' + esc(KUSE_B[i]) + '</div></div><div class="opts">');
    SHINDAN.kuseLevels.forEach(function (lv) {
      h.push('<label><input type="radio" name="k' + i + '" value="' + lv + '">' + lv + '</label>');
    });
    h.push('</div></div>');
  });
  $('ks').innerHTML = h.join('');

  // もう一度押すと外せるラジオ（飛ばしたい人用）
  Array.prototype.forEach.call(document.querySelectorAll('.opts input'), function (r) {
    r.addEventListener('click', function () {
      if (r.dataset.was === '1') { r.checked = false; r.dataset.was = ''; }
      else { Array.prototype.forEach.call(document.getElementsByName(r.name), function (x) { x.dataset.was = ''; }); r.dataset.was = '1'; }
    });
  });

  var scores = function () {
    var s = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    Array.prototype.forEach.call(document.querySelectorAll('input[name=q]:checked'), function (c) { s[Number(c.value.split('-')[0])]++; });
    return s;
  };
  var kuse = function () {
    return [0, 1, 2, 3, 4, 5].map(function (i) { var c = document.querySelector('input[name=k' + i + ']:checked'); return c ? c.value : ''; });
  };

  // 同点の選択（一番の点が同じものが2つ以上あるときだけ出す）
  var refreshTie = function () {
    var s = scores(), r = shindanRank(s, 0), box = $('tieBox');
    var cur = document.querySelector('input[name=tie]:checked');
    var keep = cur ? Number(cur.value) : 0;
    if (r.ties.length < 2 || s[r.top - 1] === 0) { box.hidden = true; $('tie').innerHTML = ''; return; }
    box.hidden = false;
    $('tie').innerHTML = r.ties.map(function (n) {
      return '<label><input type="radio" name="tie" value="' + n + '"' + (n === keep ? ' checked' : '') + '>' + esc(TYPE_LABEL[n - 1]) + '（' + s[n - 1] + '点）</label>';
    }).join('');
  };
  $('qs').addEventListener('change', refreshTie);

  // URL の ?mail=&name=（UTAGEの差し込み）。差し込まれていない %mail% は使わない。
  var qp = new URLSearchParams(location.search);
  var fromUrl = function (k) { var v = (qp.get(k) || '').trim(); return /%/.test(v) ? '' : v; };

  var restore = function (a) {
    if (!a) return;
    f.mail.value = a.mail || ''; f.name.value = a.name || ''; f.scene.value = a.scene || '';
    (a.checked || []).forEach(function (v) { var c = document.querySelector('input[name=q][value="' + v + '"]'); if (c) c.checked = true; });
    (a.kuse || []).forEach(function (v, i) { var c = document.querySelector('input[name=k' + i + '][value="' + v + '"]'); if (c) { c.checked = true; c.dataset.was = '1'; } });
    refreshTie();
    if (a.tie) { var t = document.querySelector('input[name=tie][value="' + a.tie + '"]'); if (t) t.checked = true; }
    $('restored').hidden = false;
  };
  var saved = store.get();
  restore(saved);
  if (fromUrl('mail')) f.mail.value = fromUrl('mail');
  if (fromUrl('name') && !f.name.value) f.name.value = fromUrl('name');

  var render = function (d) {
    var T = SHINDAN.types, total = d.scores.reduce(function (a, b) { return a + b; }, 0);
    var top = T[d.top - 1], sec = T[d.second - 1], o = [];
    o.push('<h2>あなたの結果</h2>');
    d.scores.forEach(function (n, i) {
      o.push('<div class="score' + (i === d.top - 1 ? ' top' : '') + '"><span>' + (i + 1) + ' ' + esc(T[i].name) + '</span><span class="bar"><i style="width:' + (n / 3 * 100) + '%"></i></span><span>' + n + '点</span></div>');
    });
    o.push('<p class="hint">合計 ' + total + '点（27点満点）</p>');
    if (total <= 3) o.push('<p>' + esc(SHINDAN.low) + '</p>');
    o.push('<div class="label">一番、あなたを止めているもの</div><h2>「' + esc(top.name) + '」</h2><p>' + esc(top.what) + '</p><p>' + esc(top.word) + '</p>');
    o.push('<div class="label">2番目に強いもの</div><h3>「' + esc(sec.name) + '」</h3><p>' + esc(sec.what) + '</p>');
    var kt = shindanKuseTop(d.kuse);
    if (d.kuse.some(function (k) { return !!k; })) {
      o.push('<div class="label">判断のクセ（第2回）</div>');
      if (!kt.length) o.push('<p>' + esc(SHINDAN.kuseNone) + '</p>');
      else kt.slice(0, 2).forEach(function (x) { o.push('<h3>' + esc(SHINDAN.kuse[x.i].name) + '</h3><p>' + esc(SHINDAN.kuse[x.i].text) + '</p>'); });
    }
    o.push('<div class="label">今日できる一歩</div><p><b>' + esc(top.step) + '</b></p>');
    o.push('<div class="label">次に見る回</div><p>' + esc(top.lesson) + 'で、この止まり方の外し方を話しています。</p>');
    o.push('<p class="hint pre">' + esc(SHINDAN.closing) + '</p>');
    $('res').innerHTML = o.join('');
  };

  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = $('err'), btn = $('send');
    var mail = f.mail.value.trim();
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(mail)) { err.textContent = 'メールアドレスを確かめてください。'; err.hidden = false; f.mail.focus(); return; }
    var s = scores();
    var tieShown = !$('tieBox').hidden, tie = document.querySelector('input[name=tie]:checked');
    if (tieShown && !tie) { err.textContent = '点数が同じものがあります。一番自分を止めていると思うものを1つ選んでください。'; err.hidden = false; $('tieBox').scrollIntoView({ behavior: 'smooth' }); return; }
    var r = shindanRank(s, tie ? Number(tie.value) : 0);
    var d = { name: f.name.value.trim(), scores: s, top: r.top, second: r.second, scene: f.scene.value.trim().slice(0, 500), kuse: kuse() };
    store.set({ mail: mail, name: d.name, scene: d.scene, kuse: d.kuse, tie: tie ? Number(tie.value) : 0,
      checked: Array.prototype.map.call(document.querySelectorAll('input[name=q]:checked'), function (c) { return c.value; }) });
    err.hidden = true;
    var show = function (sent) {
      render(d);
      $('mailNote').hidden = !sent;
      f.hidden = true; $('done').hidden = false; window.scrollTo(0, 0);
      btn.disabled = false; btn.textContent = '結果を見る';
    };
    if (!RECEIVER_URL) { show(false); return; }
    var p = new URLSearchParams();
    p.set('key', KEY); p.set('type', 'shindan'); p.set('mail', mail); p.set('name', d.name);
    p.set('scores', JSON.stringify(s)); p.set('top', String(tie ? Number(tie.value) : 0)); p.set('second', String(d.second));
    p.set('scene', d.scene); p.set('kuse', JSON.stringify(d.kuse)); p.set('ua', navigator.userAgent.slice(0, 200));
    btn.disabled = true; btn.textContent = '送信しています…';
    fetch(RECEIVER_URL, { method: 'POST', mode: 'no-cors', body: p })
      .then(function () { show(true); })
      .catch(function () { show(false); err.textContent = ''; });
  });

  $('again').addEventListener('click', function () {
    f.hidden = false; $('done').hidden = true; window.scrollTo(0, 0);
  });
})();
