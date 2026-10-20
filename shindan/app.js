// 止まり方診断シート（第1〜7回のあと、毎回）＋第2回のクセ＋各回のふりかえり＋成長スコアの記録。結果は画面に出し、GASへ送るとメールでも届く。
var RECEIVER_URL = 'https://script.google.com/macros/s/AKfycby_4K5TxwMAzKFZLKgMeM51CW87z2-ybD1RNwi0jJ1CqutRKUIC_nraiOQIBaG3NrVcog/exec';   // 「エバー診断レポート」GASのウェブアプリURL
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
var HIST = 'ever_shindan_hist';   // { "回": { s: [9], at: 時刻 } } 前回との比べを画面に出す用

(function () {
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {} }
  };
  var $ = function (id) { return document.getElementById(id); };
  var hist = {
    get: function () { try { return JSON.parse(localStorage.getItem(HIST) || '{}') || {}; } catch (e) { return {}; } },
    set: function (v) { try { localStorage.setItem(HIST, JSON.stringify(v)); } catch (e) {} }
  };
  // 前回：回が分かるときはそれより前の回の一番新しいもの、分からないときは一番最後に答えたもの（GASと同じ決め方）
  var findPrev = function (h, lesson) {
    var ks = Object.keys(h).map(Number).filter(function (k) { return !(lesson && k === lesson); });
    var earlier = ks.filter(function (k) { return lesson && k && k < lesson; });
    var pick = earlier.length ? Math.max.apply(null, earlier)
      : ks.reduce(function (m, k) { return m === null || h[k].at > h[m].at ? k : m; }, null);
    return pick === null ? null : { lesson: pick, scores: h[pick].s };
  };
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
  var LESSON = Math.max(0, Math.min(7, parseInt(qp.get('lesson'), 10) || 0));
  var SRC = (qp.get('src') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30);
  if (LESSON) $('sub').textContent = '（第' + LESSON + '回のあと）';
  // その回のふりかえり（できた・少し・まだ）
  var LQ = SHINDAN.lessonQ[LESSON] || [];
  if (LQ.length) {
    $('lqBox').hidden = false;
    $('lqTitle').textContent = '4．第' + LESSON + '回のふりかえり';
    $('lq').innerHTML = LQ.map(function (q, i) {
      return '<div class="kuse"><div class="t">' + esc(q) + '</div><div class="opts" style="grid-template-columns:repeat(3,1fr)">' +
        SHINDAN.lessonA.map(function (a) { return '<label><input type="radio" name="lq' + i + '" value="' + a + '">' + a + '</label>'; }).join('') + '</div></div>';
    }).join('');
  }
  var lqAns = function () { return LQ.map(function (q, i) { var c = document.querySelector('input[name=lq' + i + ']:checked'); return c ? c.value : ''; }); };
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
  // 前に答えたことがあれば「成長チェック」として出す（前回の印入り、変わったところだけ直す）
  if (saved && Object.keys(hist.get()).length) {
    $('ttl').textContent = '成長チェック';
    $('restored').textContent = '前回の印が入っています。今の自分に合わせて、変わったところだけ直してください。30秒ほどで終わります。答えると、前回からの変化がレポートで届きます。';
    $('send').textContent = '前回との変化を見る';
  }
  if (fromUrl('mail')) f.mail.value = fromUrl('mail');
  if (fromUrl('name') && !/%/.test(fromUrl('name')) && !f.name.value) f.name.value = fromUrl('name');

  // ?r= 付きで開いたとき（メールの「結果をページで見る」）は結果だけを出す
  var b64decode = function (r) {
    r = r.replace(/-/g, '+').replace(/_/g, '/'); while (r.length % 4) r += '=';
    var bin = atob(r), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };

  var render = function (d) {
    $('res').innerHTML = shindanReportHtml(d);
  };
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = $('err'), btn = $('send');
    var mail = f.mail.value.trim();
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(mail)) { err.textContent = 'メールアドレスを確かめてください。'; err.hidden = false; f.mail.focus(); return; }
    if (!f.name.value.trim() || /%/.test(f.name.value)) { err.textContent = 'お名前を入れてください。'; err.hidden = false; f.name.focus(); return; }
    var s = scores();
    var tieShown = !$('tieBox').hidden, tie = document.querySelector('input[name=tie]:checked');
    if (tieShown && !tie) { err.textContent = '点数が同じものがあります。一番自分を止めていると思うものを1つ選んでください。'; err.hidden = false; $('tieBox').scrollIntoView({ behavior: 'smooth' }); return; }
    var r = shindanRank(s, tie ? Number(tie.value) : 0);
    var d = { name: f.name.value.trim(), scores: s, top: r.top, second: r.second, scene: f.scene.value.trim().slice(0, 500), kuse: kuse(), lesson: LESSON, lq: lqAns(), src: SRC };
    var h = hist.get();
    d.prev = findPrev(h, LESSON);
    d.hist = Object.keys(h).map(function (k) { return { l: Number(k), s: h[k].s, q: h[k].q || [], k: h[k].k || [] }; });
    h[LESSON] = { s: s, q: d.lq, k: d.kuse, at: Date.now() }; hist.set(h);
    store.set({ mail: mail, name: d.name, scene: d.scene, kuse: d.kuse, tie: tie ? Number(tie.value) : 0,
      checked: Array.prototype.map.call(document.querySelectorAll('input[name=q]:checked'), function (c) { return c.value; }) });
    err.hidden = true;
    var show = function (sent) {
      render(d);
      $('mailNote').hidden = !sent;
      f.hidden = true; $('done').hidden = false; window.scrollTo(0, 0);
      btn.disabled = false; btn.textContent = $('ttl').textContent === '成長チェック' ? '前回との変化を見る' : '結果を見る';
    };
    if (!RECEIVER_URL) { show(false); return; }
    var p = new URLSearchParams();
    p.set('key', KEY); p.set('type', 'shindan'); p.set('mail', mail); p.set('name', d.name);
    p.set('scores', JSON.stringify(s)); p.set('top', String(tie ? Number(tie.value) : 0)); p.set('second', String(d.second));
    p.set('scene', d.scene); p.set('kuse', JSON.stringify(d.kuse)); p.set('ua', navigator.userAgent.slice(0, 200)); p.set('lesson', String(LESSON)); p.set('lq', JSON.stringify(d.lq)); p.set('src', SRC);
    btn.disabled = true; btn.textContent = '送信しています…';
    fetch(RECEIVER_URL, { method: 'POST', mode: 'no-cors', body: p })
      .then(function () { show(true); })
      .catch(function () { show(false); err.textContent = ''; });
  });

  if (qp.get('r')) {
    try {
      var d0 = shindanUnpack(b64decode(qp.get('r')));
      if (d0.scores && d0.scores.length === 9) {
        render(d0); $('mailNote').hidden = true; f.hidden = true; $('done').hidden = false;
      }
    } catch (e) {}
  }

  $('again').addEventListener('click', function () {
    f.hidden = false; $('done').hidden = true; window.scrollTo(0, 0);
  });
})();
