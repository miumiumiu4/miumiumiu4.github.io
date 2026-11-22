// 予約（個別面談・無料コンサル）：三浦さんの Google カレンダーの空きを出して、その場で予約する部品。
// 使い方：Booking.mount(入れる場所, { type: 'mendan' | 'consult', note: 'メモ', nick: 'ニックネーム', preview: true/false })
// 空きの計算と予約は Apps Script「予約_個別面談と無料コンサル」（../../../ever-offer の gas-booking）。preview のときは予約を送らない。
(function () {
  var API = 'https://script.google.com/macros/s/AKfycbwcakHipXwzqQT49_oCnH76X30L4Bjs6h-vug2osSIi7rthbYnDYwy-zfNRGT0sOm-t4Q/exec';
  var WD = '日月火水木金土';
  var css = '.bk{margin-top:14px;text-align:left}.bk h3{margin:14px 0 8px;font-size:16px}.bk .days,.bk .times{display:flex;flex-wrap:wrap;gap:8px}' +
    '.bk button.c{font:inherit;font-size:15px;font-weight:700;padding:8px 10px;border-radius:6px;cursor:pointer;border:1px solid var(--bk-line,#2fb8ff);background:var(--bk-bg,rgba(3,12,28,.9));color:var(--bk-fg,#f2f8ff);min-width:5.2em}' +
    '.bk button.c.on{background:var(--bk-on,#0a6cff);color:#fff}.bk label{display:block;margin:10px 0 4px;font-size:14px;font-weight:700}' +
    '.bk input{width:100%;font:inherit;font-size:16px;padding:10px;border-radius:6px;border:1px solid var(--bk-line,#2fb8ff);background:#fff;color:#111}' +
    '.bk .row{display:flex;gap:8px}.bk .row input{flex:1}.bk .ok{margin-top:14px;width:100%;font:inherit;font-size:18px;font-weight:900;padding:14px;border:0;border-radius:8px;cursor:pointer;background:var(--bk-btn,linear-gradient(90deg,#0a6cff,#2fb8ff));color:var(--bk-btnfg,#fff)}' +
    '.bk .ok:disabled{opacity:.5;cursor:default}.bk .msg{margin-top:10px;font-size:14px;line-height:1.7}.bk .err{color:#ff8a8a}.bk .fine{font-size:12px;opacity:.8;margin-top:8px;line-height:1.6}' +
    '.bk .done{padding:14px;border:1px solid var(--bk-line,#2fb8ff);border-radius:8px;font-size:16px;line-height:1.8}';
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function jst(iso) { var d = new Date(new Date(iso).getTime() + 9 * 3600000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), w: WD.charAt(d.getUTCDay()), h: d.getUTCHours(), mi: d.getUTCMinutes() }; }
  function hm(t) { return t.h + ':' + (t.mi < 10 ? '0' : '') + t.mi; }
  function src() { var q = location.search.replace(/^\?/, ''); return (location.pathname + (q ? '?' + q : '')).slice(0, 200); }

  // 空き時間は、ページを開いたらすぐ取りに行く（エイミーが話している間に読み終わるように）
  var pre = {};
  function prefetch(type) { if (!pre[type]) pre[type] = fetch(API + '?slots=1&type=' + encodeURIComponent(type)).then(function (r) { return r.json(); }); return pre[type]; }
  function mount(box, opt) {
    if (!document.getElementById('bk-css')) { var s = document.createElement('style'); s.id = 'bk-css'; s.textContent = css; document.head.appendChild(s); }
    var root = document.createElement('div'); root.className = 'bk'; box.appendChild(root);
    root.innerHTML = '<p class="msg">空いている日時を調べています…</p>';
    prefetch(opt.type).then(function (j) {
      var slots = (j && j.slots) || [];
      if (!slots.length) { root.innerHTML = '<p class="msg">ただいま予約できる日時がありません。お手数ですが、届いたメールにご返信ください。こちらから日時をご案内します。</p>'; return; }
      var byDay = {}, order = [];
      slots.forEach(function (iso) { var t = jst(iso), k = t.m + '/' + t.d + '（' + t.w + '）'; if (!byDay[k]) { byDay[k] = []; order.push(k); } byDay[k].push(iso); });
      root.innerHTML = '<h3>① 日にちを選んでください</h3><div class="days"></div><div class="tw"></div><div class="fw"></div>';
      var days = root.querySelector('.days'), tw = root.querySelector('.tw'), fw = root.querySelector('.fw'), chosen = null;
      order.forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'c'; b.textContent = k;
        b.onclick = function () {
          [].forEach.call(days.children, function (x) { x.classList.toggle('on', x === b); }); chosen = null; fw.innerHTML = '';
          tw.innerHTML = '<h3>② 時間を選んでください（' + (opt.type === 'mendan' ? '60分' : '30分') + '）</h3><div class="times"></div>';
          var times = tw.querySelector('.times');
          byDay[k].forEach(function (iso) {
            var c = document.createElement('button'); c.type = 'button'; c.className = 'c'; c.textContent = hm(jst(iso));
            c.onclick = function () { [].forEach.call(times.children, function (x) { x.classList.toggle('on', x === c); }); chosen = iso; form(); };
            times.appendChild(c);
          });
          tw.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        days.appendChild(b);
      });
      function form() {
        var t = jst(chosen);
        fw.innerHTML = '<h3>③ ご連絡先（' + t.m + '/' + t.d + '（' + t.w + '）' + hm(t) + '〜）</h3>' +
          '<label>お名前</label><div class="row"><input id="bk-s" placeholder="姓" autocomplete="family-name"><input id="bk-g" placeholder="名" autocomplete="given-name"></div>' +
          '<label>メールアドレス</label><input id="bk-e" type="email" inputmode="email" autocomplete="email">' +
          '<label>携帯番号</label><input id="bk-p" type="tel" inputmode="tel" autocomplete="tel">' +
          '<button class="ok" type="button" id="bk-ok">この日時で予約する</button><p class="msg" id="bk-m"></p>' +
          '<p class="fine">ご入力いただいた情報は、この面談のご連絡のためだけに使います。Zoom（オンライン）で行います。</p>';
        fw.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var ok = document.getElementById('bk-ok'), m = document.getElementById('bk-m');
        ok.onclick = function () {
          var name = (document.getElementById('bk-s').value.trim() + ' ' + document.getElementById('bk-g').value.trim()).trim();
          var email = document.getElementById('bk-e').value.trim(), phone = document.getElementById('bk-p').value.trim();
          if (!document.getElementById('bk-s').value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10) { m.className = 'msg err'; m.textContent = 'お名前・メールアドレス・携帯番号をご確認ください。'; return; }
          if (opt.preview) { done({ when: t.m + '月' + t.d + '日（' + t.w + '）' + hm(t) }, true); return; }
          ok.disabled = true; m.className = 'msg'; m.textContent = '予約しています…';
          fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ type: opt.type, start: chosen, name: name, email: email, phone: phone, note: opt.note || '', nick: opt.nick || '', src: src() }) })
            .then(function (r) { return r.json(); }).then(function (j) {
              if (j && j.ok) { done(j, false); return; }
              ok.disabled = false; m.className = 'msg err';
              m.textContent = j && j.error === 'taken' ? 'すみません、その時間はたった今うまってしまいました。別の時間をお選びください。' : 'うまく送れませんでした。入力をご確認のうえ、もう一度お試しください。';
            }).catch(function () { ok.disabled = false; m.className = 'msg err'; m.textContent = '通信がうまくいきませんでした。もう一度お試しください。'; });
        };
      }
      function done(j, pv) {
        root.innerHTML = '<div class="done">✅ ご予約を受け付けました。<br><b>' + esc(j.when) + '</b><br>確認のメールと、Zoom の入り方をお送りしました。当日お会いできるのを楽しみにしています。' + (pv ? '<br><small>（見本表示なので、実際には予約していません）</small>' : '') + '</div>';
        if (opt.onDone) opt.onDone(j);
      }
    }).catch(function () { root.innerHTML = '<p class="msg">空き日時を読み込めませんでした。少し時間をおいて、もう一度開いてください。</p>'; });
  }
  window.Booking = { mount: mount, prefetch: prefetch };
})();
