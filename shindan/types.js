// 診断レポートの文（型）。GAS の Types.gs と同じ中身にする（このファイルを丸ごとコピー）。
var SHINDAN = {
  types: [
    { n: 1, name: '他責',
      watch: '「この中で、自分に変えられるところはどこか」を探しながら', gain: '周りのせいにしていた出来事の中に、自分で動かせるところが1つは見つかります',
      what: '原因を景気・会社・家族など、周りに置く止まり方です。周りのことは、自分では変えられません。だから、原因を全部周りに置くと、自分にできることがなくなって、同じ場所にとどまることになります。',
      scene: '家族の反対、会社の方針、仕事の少ない時期。「〇〇が変わってくれれば」と思ったときです。',
      word: '全部を自分のせいにしなさい、という話ではありません。周りのせいにしない、でも自分を責めすぎない。「この中で、自分に変えられるところはどこだろう」と考える。それだけで、次の一歩が見えてきます。',
      step: '最近「〇〇のせいで」と思ったことを1つ書き、その横に「その中で自分が変えられること」を1つ書く。',
      lesson: '第2回' },
    { n: 2, name: '理由探し',
      watch: 'お金と時期の話を、自分の数字と日付に置きかえながら', gain: '「いつか」が「いつまでに、いくら」に変わります',
      what: '「お金が貯まったら」「時期が来たら」と、やらない理由を探す止まり方です。待っているあいだにも、機会は通り過ぎていきます。',
      scene: '貯金の残高を見たとき、「今じゃない」と思ったとき。やらない理由なら、すぐにいくつも思いつきます。',
      word: '同じ「お金を貯める」でも、「お金が貯まったら開業する」人と、「開業するために、今お金を貯めている」人がいます。やっていることは同じでも、後の人のほうがずっと早く動き出します。行き先から逆算して、今やることが決まるからです。',
      step: 'よく使う「〜になったら、やる」を1つ書き、「〜のために、今〇〇する」に言い換える。',
      lesson: '第3回' },
    { n: 3, name: '正解待ち',
      watch: '正解を探すのではなく、「自分はどう決めるか」を探しながら', gain: '迷ったときに、自分で決める順番が手に入ります',
      what: '正しい答えや順番が分かるまで動けない止まり方です。でも、決めた時点では、誰にも正解は分かりません。調べれば調べるほど、決められなくなることもあります。',
      scene: 'やり方を調べているとき、「前例がない」「平均はこう」と外の物差しで比べたときです。',
      word: 'データを見るのはいいんです。その上で、最後に決めるのは「自分は、何のためにそれをしたいのか」という自分の価値観です。行き先が見えている人は、データに振り回されません。',
      step: '今迷っていることを1つ書き、「今決める」「足りない情報は何か」「いつ決めるか」のどれかに入れる。どれにも入れずに止まっているのが、一番まずい状態です。',
      lesson: '第4回・第5回' },
    { n: 4, name: '抱え込み・自己流',
      watch: '「自分なら、これを誰に相談するか」を考えながら', gain: '一人で抱えていたことを、渡せる先が見えてきます',
      what: '不安なとき、人に相談せず一人で抱える止まり方です。教わったことを、つい自分のやり方に変えてしまうことも含みます。一人でやる限り、同じ天井が続きます。',
      scene: '分からないことが出たとき、「自分でやったほうが確かだ」と思ったときです。',
      word: 'うまくいかないのは、能力の問題ではなく、相談先の問題であることが多いです。相談先がまだいない欄があっても大丈夫。そこが、これから探す場所です。',
      step: '「技術・お金・集客・気持ち」の4つについて、今相談できる人がいるかを書き出す。いない欄を1つ選び、どこで探すかを書く。',
      lesson: '第6回' },
    { n: 5, name: '失敗恐怖',
      watch: '頭の中で「やめとけ」の声が出た場面に、しるしを付けながら', gain: '怖さの正体が言葉になって、その声の出番を自分で決められるようになります',
      what: '失敗や、周りの目が怖い止まり方です。前に失敗した経験が、今も決断にブレーキをかけていることもあります。頭の中の「やめとけ」は、自分を守ろうとする防衛反応の声です。',
      scene: '人に話すとき、お金を使う決断のとき、「結局また同じことになるんじゃないか」と思ったときです。',
      word: 'その声は、追い出さなくていい。名前を付けて、出番を決めます。見積もりや月末の数字の確認は、その声の出番100%。商談や値決め、最初の一歩は、出番0%。「今日は出番なし」と言ってあげてください。',
      step: '頭の中の「やめとけ」の声を、そのまま一文で書く。その声に名前を付ける（「〇〇な自分」）。',
      lesson: '第3回' },
    { n: 6, name: '完璧主義・先延ばし',
      watch: '「60%できたら合格」の目で', gain: '止まっていたことを、今週中に1つ出せる形にできます',
      what: '「もうちょっと準備してから」「もう少し良くしてから」で手が止まる止まり方です。止めているのは、たいてい作業ではなく、気持ちのほうです。',
      scene: '始める直前、人に見せる直前、「明日でいいか」が続いているときです。',
      word: '宣言は、変わってもいい。先に「ここまでできたら合格」を決めておくと、動けます。60%書けたら合格。まず出して、あとで直す。',
      step: '先延ばしにしていることを1つ書き、「100%できた状態」と「60%できたら合格の状態」を書く。60%のほうを、今週やる。',
      lesson: '第4回' },
    { n: 7, name: '現状維持・ブレーキ',
      watch: '第1回の将来像の表を横に置いて', gain: '変わる理由を、自分の言葉で書けるようになります',
      what: '今がそこそこなので、変わる理由が見つからない止まり方です。慣れた場所から出ようとするときの、当たり前の反応でもあります。',
      scene: '大きな目標を聞いたとき、新しいことを考えて、なんとなく落ち着かなくなったときです。',
      word: '不安の正体は「知らないこと」です。行き先を仮でいいので言葉にすると、変わる理由が見えてきます。「わからない」とは書かず、仮で書く。何度書き直してもいい。',
      step: '1年後・3年後・5年後・10年後の「仕事・お金・家族・自分の時間」を、1行ずつ仮で書く（第1回の将来像の表）。',
      lesson: '第2回（第1回の将来像の表とあわせて）' },
    { n: 8, name: '自己否定・思い込み',
      watch: '「事実」と「自分でつけた意味づけ」を分けながら', gain: '「無理」の多くが、自分でつけた意味だったと気づけます',
      what: '「自分なんて」「どうせ自分は」と思う止まり方です。止めているのは事実ではなく、自分でつけた意味づけのほうです。',
      scene: '人と比べたとき、うまくいかなかった直後、「向いていない」と決めつけたときです。',
      word: '「今、貯金が〇〇万円ある」は事実。「だから独立は無理だ」は意味づけ。一度、事実と意味づけに分けてみてください。意外なほど、「無理」の部分が、自分でつけた意味だったと気づきます。',
      step: '「自分なんて」と思ったことを1つ書き、「事実」と「自分がつけている意味づけ」の2つに分けて書く。',
      lesson: '第2回' },
    { n: 9, name: '不安ループ',
      watch: 'メモを手元に置いて、不安を日付と数字に直しながら', gain: 'ぐるぐるしていた不安が、手を付けられる大きさになります',
      what: '不安が不安を呼び、同じことをぐるぐる考える止まり方です。不安をまぎらわすために、別のことに逃げてしまうこともあります。',
      scene: '夜、一人のとき、仕事の少ない時期、お金のことを考えたときです。',
      word: '不安は、書き出して言葉にすると扱えるようになります。頭の中で流しているうちは大きくなり、紙に書くと、大きさが決まります。',
      step: '今の不安を、日付と数字の入った言葉に直す（例：「お金が心配」→「来年3月までに、開業資金〇〇万円のうち〇〇万円が足りない」）。',
      lesson: '第3回' }
  ],
  low: '今は、はっきり止まっているところが少ないようです。この場合は、第1回の将来像の表を先に書いてみてください。行き先が見えると、止まり方も見えてきます。',
  sceneYes: 'その場面で、この止まり方が出てきたら、『今、止めている意図は何だろう？』と自分に聞いてみてください。止めているのは、たいてい作業ではなく気持ちです。',
  sceneNo: '出てくる場面は、あとから書き足せます。次に止まったとき、『どんな場面だったか』を1行だけメモしてみてください。',
  kuseNone: '6つのクセは、どれもB寄りでした。動けるクセです。あとは行き先（第1回の将来像の表）がはっきりしているかを確かめてください。',
  kuse: [
    { n: 1, name: '調べてから動く', text: '慎重に調べてから動くクセは、点検や見積もりでは強みです。ただ、独立の前では「調べ終わる日」が来ないことがあります。調べる期限を、先に日付で決めてください。' },
    { n: 2, name: '条件がそろったら動く', text: '「自分がちゃんと覚えてから」「少しずつ」と、条件がそろうのを待つクセです。条件がそろう日は、なかなか来ません。「〜のために、今〇〇する」に言い換えてみてください。' },
    { n: 3, name: '人の評価で決める', text: '他人の目を気にした瞬間、ボールを他人に預けています。独立すると、いい評価も厳しい評価も必ずもらいます。自分がやると決めたことを、自分で認められるかどうかが分かれ目です。' },
    { n: 4, name: '原因は周りにある', text: '周りは変えられません。変えられるのは、自分の側だけです。ただし、全部を自分のせいにしなくていい。「この中で、自分に変えられるところはどこだろう」と考えてみてください。' },
    { n: 5, name: '最悪を考える', text: '最悪を想定すること自体は、悪くありません。「またそうなるんじゃないか」で止まらずに、「じゃあ、良くするにはどうするか」まで考える。その一歩を足すだけで、行動が変わります。' },
    { n: 6, name: '前例やデータで決める', text: '外の物差しだけで決めると、結果も平均になります。データを見た上で、最後に決めるのは「自分は、何のためにそれをしたいのか」です。' }
  ],
  kuseLevels: ['A', 'ややA', 'ややB', 'B'],
  // 各回のふりかえり（2回目からの成長チェックで、27問のあとに聞く）。有料回の中身は書かない。
  lessonQ: {
    1: ['1年後の将来像を、仮でも1行書けた', '「何のために独立したいか」を一言で言える'],
    2: ['「〇〇のせいで」を「自分に変えられること」に言い換えられた', '「事実」と「自分でつけた意味づけ」を分けて考えられた', '6つのクセのうち、自分のA寄りを1つ言える'],
    3: ['今の不安を、日付と数字の入った言葉にできた', '頭の中の「やめとけ」の声に、名前を付けられた', '「〜になったら」を「〜のために、今〇〇する」に言い換えられた'],
    4: ['迷っていることを「今決める・足りない情報・いつ決める」に分けられた', '先延ばしにしていたことを、60%で1つ出せた'],
    5: ['決めるときの自分の物差し（何のためにやるか）を言える', '調べる期限を、日付で決めた'],
    6: ['技術・お金・集客・気持ちの相談先を書き出せた', '人に任せることを1つ決めた'],
    7: ['1年後までの道のりを、1枚に書けた', '次の一歩を、いつやるか日付で決めた']
  },
  lessonA: ['できた', '少し', 'まだ'],
  closing: '1つだけの人は、ほとんどいません。たいてい2つか3つが重なっています。\n点数が高いこと自体は、悪いことではありません。名前が付けば、外し方も見えてきます。\n何度でも答え直せます。答えが変わったら、それは動いた証拠です。'
};

// 答え（scores 9個, top/second 1〜9, kuse 6個 '' または A/ややA/ややB/B）から、A寄りの上位2つを返す。
function shindanKuseTop(kuse) {
  var rank = { 'A': 2, 'ややA': 1 };
  var list = [];
  for (var i = 0; i < 6; i++) if (rank[kuse[i]]) list.push({ i: i, r: rank[kuse[i]] });
  list.sort(function (a, b) { return b.r - a.r || a.i - b.i; });
  return list;
}

// 同点を除いた一番・2番目（同点は番号の若いほう）。chosenTop は同点から本人が選んだ番号（任意）。
function shindanRank(scores, chosenTop) {
  var order = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(function (a, b) { return scores[b] - scores[a] || a - b; });
  var max = scores[order[0]];
  var ties = order.filter(function (i) { return scores[i] === max; });
  var top = order[0];
  if (chosenTop && ties.indexOf(chosenTop - 1) >= 0) top = chosenTop - 1;
  var second = order.filter(function (i) { return i !== top; })[0];
  return { top: top + 1, second: second + 1, ties: ties.map(function (i) { return i + 1; }) };
}

// メール本文（テキスト）。d = { name, scores[9], top, second, scene, kuse[6] }
function shindanReport(d) {
  var T = SHINDAN.types, L = [];
  var total = d.scores.reduce(function (a, b) { return a + b; }, 0);
  var top = T[d.top - 1], second = T[d.second - 1];
  L.push(d.name ? d.name + 'さん' : '診断シートにお答えいただいた方へ', '');
  L.push('診断シートにお答えいただき、ありがとうございます。', '結果をお送りします。この結果は、三浦が面談や集客戦略会議の参考に読ませていただきます。', '');
  L.push('■ あなたの点数（印1つ＝1点、各3点満点）');
  T.forEach(function (t, i) { L.push(t.n + ' ' + t.name + ' ' + d.scores[i] + '点'); });
  L.push('合計 ' + total + '点（27点満点）', '');
  var g = shindanGrowth(d);
  if (g) {
    L.push('■ ' + g.label + 'の診断からの変化');
    g.rows.forEach(function (r) { L.push(r.name + ' ' + r.a + '点 → ' + r.b + '点'); });
    L.push('合計 ' + g.ta + '点 → ' + g.tb + '点', g.msg, '');
  }
  var tr = shindanTrend(d);
  if (tr) {
    L.push('■ これまでの推移（止まり方の点数：低いほど動けている）');
    tr.rows.forEach(function (x) { L.push('第' + x.lesson + '回のあと ' + x.total + '点' + (x.n ? '　ふりかえり「できた」' + x.done + '/' + x.n : '')); });
    L.push(tr.msg, '');
  }
  var lr = shindanLessonReview(d);
  if (lr) {
    L.push('■ ' + lr.title);
    lr.rows.forEach(function (r) { L.push('・' + r.q + '：' + r.a); });
    L.push(lr.msg, '');
  }
  if (total <= 3) L.push(SHINDAN.low, '');
  L.push('■ 一番、あなたを止めているもの：「' + top.name + '」', top.what, '', '出やすい場面：' + top.scene, '', top.word, '');
  L.push('■ 2番目に強いもの：「' + second.name + '」', second.what, '');
  L.push('■ あなたが書いた「出てくる場面」');
  if (d.scene) L.push('「' + d.scene + '」', '→ ' + SHINDAN.sceneYes);
  else L.push('（空欄）', '→ ' + SHINDAN.sceneNo);
  L.push('');
  var answered = d.kuse.some(function (k) { return !!k; });
  if (answered) {
    var kt = shindanKuseTop(d.kuse);
    L.push('■ 判断のクセ（第2回）');
    if (!kt.length) L.push(SHINDAN.kuseNone);
    else {
      L.push('A寄りだったもの：' + kt.map(function (x) { return SHINDAN.kuse[x.i].name; }).join('、'));
      kt.slice(0, 2).forEach(function (x) { L.push('', '・' + SHINDAN.kuse[x.i].name, SHINDAN.kuse[x.i].text); });
    }
    L.push('');
  }
  L.push('■ 今日できる一歩', top.step, '');
  L.push('■ 次に見る回', top.lesson + 'で、この止まり方の外し方を話しています。', '', shindanWatch(top), '');
  L.push(SHINDAN.closing, '');
  if (d.viewUrl) L.push('▼ 結果をグラフで見る', d.viewUrl, '');
  L.push('三浦公嗣（ありがとうグループ）');
  return L.join('\n');
}

// 前回からの変化。d.prev = { lesson: 0〜7, scores: [9] }（無ければ null）
function shindanLessonLabel(n) { return n ? '第' + n + '回のあと' : '前回'; }
function shindanGrowth(d) {
  if (!d.prev || !d.prev.scores || d.prev.scores.length !== 9) return null;
  var T = SHINDAN.types, a = d.prev.scores, b = d.scores;
  var sum = function (x) { return x.reduce(function (p, q) { return p + q; }, 0); };
  var ta = sum(a), tb = sum(b), rows = [];
  T.forEach(function (t, i) { if (a[i] !== b[i]) rows.push({ name: t.name, a: a[i], b: b[i] }); });
  var best = rows.filter(function (r) { return r.b < r.a; }).sort(function (x, y) { return (y.a - y.b) - (x.a - x.b); })[0];
  var msg;
  if (tb < ta) msg = '止まり方の点数が、合計で' + (ta - tb) + '点下がりました。動いた証拠です。' + (best ? '特に「' + best.name + '」が' + best.a + '点から' + best.b + '点に下がっています。外し方が、もう体に入り始めています。' : '');
  else if (tb > ta) msg = '点数が上がっていても大丈夫です。講座を見て自分の止まり方が見えてくると、前より正直に印が付くようになります。それも、前に進んだ証拠です。' + (best ? 'その中でも「' + best.name + '」は' + best.a + '点から' + best.b + '点に下がっています。' : '');
  else msg = '合計は変わっていません。' + (best ? 'それでも「' + best.name + '」は' + best.a + '点から' + best.b + '点に下がっています。' : '') + '点数が同じでも、どこで止まるかに名前が付いていれば、外し方は見えてきます。';
  return { label: shindanLessonLabel(d.prev.lesson), rows: rows, ta: ta, tb: tb, msg: msg };
}

// 回のふりかえり。d.lesson と d.lq（答え: できた/少し/まだ/''）から
function shindanLessonReview(d) {
  var qs = SHINDAN.lessonQ[d.lesson];
  if (!qs || !d.lq || !d.lq.some(function (x) { return !!x; })) return null;
  var rows = qs.map(function (q, i) { return { q: q, a: d.lq[i] || '（未回答）' }; });
  var done = d.lq.filter(function (x) { return x === 'できた'; }).length;
  var msg = done === qs.length ? '全部「できた」です。講座を、ただ見るだけでなく使っています。この調子です。'
    : '「まだ」「少し」のものは、次の回までに1つだけ、やってみてください。1つできると、次の回の入り方が変わります。';
  return { title: '第' + d.lesson + '回のふりかえり', rows: rows, msg: msg };
}

// これまでの推移。d.hist = [{ lesson, total, done, n }]（今回を含む、回の順）
function shindanTrend(d) {
  var h = (d.hist || []).filter(function (x) { return x && x.lesson; });
  if (h.length < 2) return null;
  h = h.slice().sort(function (a, b) { return a.lesson - b.lesson; });
  var first = h[0], last = h[h.length - 1];
  var msg = last.total < first.total
    ? '第' + first.lesson + '回のあとから、止まり方の点数が' + (first.total - last.total) + '点下がっています。回を重ねるごとに、動ける自分になってきています。'
    : '点数が下がっていなくても、答え続けていること自体が前に進んでいる証拠です。どこで止まるかが見えていれば、外し方も見えてきます。';
  return { rows: h, msg: msg };
}

// 次に見る回の「この前提で見ると、こう変わる」
function shindanWatch(t) {
  return 'あなたは「' + t.name + '」が一番強く出ていたので、' + t.lesson.replace(/（.*）/, '') + 'は、' + t.watch + '見てください。\nそう見ると、' + t.gain + '。\n成果が出る人は、「自分ならどう使うか」を前提に見ています。ただ眺めるより、ずっと身につきます。';
}

function shindanSubject(d) {
  return '【診断結果】あなたの止まり方は「' + SHINDAN.types[d.top - 1].name + '」でした';
}

// 結果ページのURL（点数とクセだけを ?r= に詰める。名前と場面の文は転送されても見えないよう入れない）
var SHINDAN_PAGE = 'https://miumiumiu4.github.io/shindan/';
function shindanPack(d) {
  var o = { s: d.scores, t: d.top, u: d.second, k: d.kuse, l: d.lesson || 0, q: d.lq || [] };
  if (d.prev) { o.p = d.prev.scores; o.pl = d.prev.lesson || 0; }
  if (d.hist) o.h = d.hist.map(function (x) { return [x.lesson, x.total, x.done || 0, x.n || 0]; });
  return JSON.stringify(o);
}
function shindanUnpack(j) {
  var o = JSON.parse(j);
  return { name: '', scores: o.s, top: o.t, second: o.u, scene: '', kuse: o.k || ['', '', '', '', '', ''], lesson: o.l || 0, lq: o.q || [],
    prev: o.p ? { scores: o.p, lesson: o.pl || 0 } : null,
    hist: (o.h || []).map(function (x) { return { lesson: x[0], total: x[1], done: x[2], n: x[3] }; }), page: true };
}

// メール本文（HTML）。ページの結果表示にも使う。メールソフトでも崩れないよう、表と style 属性だけで組む。
function shindanReportHtml(d) {
  var T = SHINDAN.types;
  var e = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var NAVY = '#1F3A5F', ORANGE = '#E8833A', SUB = '#5B6676', LINE = '#D8DEE6', PALE = '#F5F7FA', CREAM = '#FFF4EA';
  var total = d.scores.reduce(function (a, b) { return a + b; }, 0);
  var top = T[d.top - 1], second = T[d.second - 1];
  var P = function (s, st) { return '<p style="margin:0 0 12px;font-size:16px;line-height:1.8;color:#1B2433;' + (st || '') + '">' + s + '</p>'; };
  var H = function (s) { return '<p style="margin:28px 0 10px;font-size:14px;color:' + SUB + ';font-weight:bold;letter-spacing:.05em">' + s + '</p>'; };
  var box = function (bg, border, inner) { return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:' + bg + ';border-left:6px solid ' + border + ';border-radius:8px"><tr><td style="padding:16px 18px">' + inner + '</td></tr></table>'; };
  var o = [];
  o.push('<div style="background:' + PALE + ';padding:16px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid ' + LINE + '"><tr><td style="padding:24px 20px;font-family:\'Hiragino Sans\',\'Noto Sans JP\',sans-serif">');
  o.push('<p style="margin:0 0 4px;font-size:14px;color:' + SUB + '">止まり方診断シート　結果</p>');
  o.push('<p style="margin:0 0 16px;font-size:22px;font-weight:bold;color:' + NAVY + ';line-height:1.5">あなたを一番止めているのは<br><span style="color:' + ORANGE + '">「' + e(top.name) + '」</span></p>');
  o.push(P(e(d.name ? d.name + 'さん' : '診断シートにお答えいただいた方へ') + '<br>お答えいただき、ありがとうございます。この結果は、三浦が面談や集客戦略会議の参考に読ませていただきます。'));
  // 点数の棒グラフ
  o.push(H('■ あなたの点数（各3点満点）'));
  o.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">');
  T.forEach(function (t, i) {
    var n = d.scores[i], isTop = i === d.top - 1, isSec = i === d.second - 1;
    var color = isTop ? ORANGE : isSec ? NAVY : '#9AA6B5';
    var cells = '';
    for (var k = 0; k < 3; k++) cells += '<td width="33%" style="height:16px;background:' + (k < n ? color : '#EEF1F5') + ';border-right:3px solid #fff;border-radius:4px"></td>';
    o.push('<tr><td style="padding:5px 8px 5px 0;white-space:nowrap;width:9em;' + (isTop || isSec ? 'font-weight:bold;color:' + color : 'color:#1B2433') + '">' + e(t.name) + '</td>' +
      '<td style="padding:5px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' + cells + '</tr></table></td>' +
      '<td style="padding:5px 0 5px 8px;width:2.5em;text-align:right;' + (isTop ? 'font-weight:bold;color:' + ORANGE : '') + '">' + n + '点</td></tr>');
  });
  o.push('</table>');
  o.push('<p style="margin:8px 0 0;font-size:14px;color:' + SUB + '">合計 ' + total + '点（27点満点）　<span style="color:' + ORANGE + '">■</span>一番　<span style="color:' + NAVY + '">■</span>2番目</p>');
  var g = shindanGrowth(d);
  if (g) {
    o.push(H('■ ' + e(g.label) + 'の診断からの変化'));
    var gr = g.rows.map(function (r) {
      var down = r.b < r.a, c = down ? '#2E8B57' : SUB;
      return '<tr><td style="padding:4px 0;font-size:15px">' + e(r.name) + '</td><td style="padding:4px 0;font-size:15px;text-align:right;white-space:nowrap">' + r.a + '点 <span style="color:' + c + '">' + (down ? '▼' : '▲') + '</span> <b style="color:' + c + '">' + r.b + '点</b></td></tr>';
    }).join('');
    var gd = g.tb < g.ta;
    o.push(box(gd ? '#EEF8F1' : PALE, gd ? '#2E8B57' : NAVY,
      '<p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:' + (gd ? '#2E8B57' : NAVY) + '">合計 ' + g.ta + '点 → ' + g.tb + '点</p>' +
      (gr ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">' + gr + '</table>' : '') + P(e(g.msg), 'margin:0')));
  }
  var tr = shindanTrend(d);
  if (tr) {
    o.push(H('■ これまでの推移'));
    var maxT = Math.max.apply(null, tr.rows.map(function (x) { return x.total; }).concat([1]));
    var bars = tr.rows.map(function (x, i) {
      var hgt = Math.max(4, Math.round(x.total / maxT * 90)), isLast = i === tr.rows.length - 1;
      return '<td valign="bottom" align="center" style="padding:0 4px">' +
        '<div style="font-size:13px;font-weight:bold;color:' + (isLast ? ORANGE : NAVY) + '">' + x.total + '点</div>' +
        '<div style="height:' + hgt + 'px;background:' + (isLast ? ORANGE : NAVY) + ';border-radius:4px 4px 0 0;margin:2px auto 0;width:70%"></div>' +
        '<div style="font-size:12px;color:' + SUB + ';padding-top:4px;border-top:1px solid ' + LINE + '">第' + x.lesson + '回</div>' +
        (x.n ? '<div style="font-size:11px;color:#2E8B57">できた' + x.done + '/' + x.n + '</div>' : '') + '</td>';
    }).join('');
    o.push(box(PALE, NAVY, '<p style="margin:0 0 8px;font-size:13px;color:' + SUB + '">止まり方の点数（低いほど動けている）</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:130px"><tr>' + bars + '</tr></table>' + P(e(tr.msg), 'margin:12px 0 0')));
  }
  var lr = shindanLessonReview(d);
  if (lr) {
    o.push(H('■ ' + e(lr.title)));
    o.push(box(PALE, NAVY, '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">' + lr.rows.map(function (r) {
      var c = r.a === 'できた' ? '#2E8B57' : r.a === '少し' ? ORANGE : SUB;
      return '<tr><td style="padding:4px 8px 4px 0;font-size:15px;line-height:1.6">' + e(r.q) + '</td><td style="padding:4px 0;font-size:15px;white-space:nowrap;text-align:right;font-weight:bold;color:' + c + '">' + e(r.a) + '</td></tr>';
    }).join('') + '</table>' + P(e(lr.msg), 'margin:0')));
  }
  if (total <= 3) o.push('<div style="margin-top:16px">' + box(PALE, NAVY, P(e(SHINDAN.low), 'margin:0')) + '</div>');
  // 一番
  o.push(H('■ 一番、あなたを止めているもの'));
  o.push(box(CREAM, ORANGE, '<p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:' + ORANGE + '">「' + e(top.name) + '」</p>' + P(e(top.what)) +
    P('<b>出やすい場面：</b>' + e(top.scene)) + P(e(top.word), 'margin:0')));
  // 2番目
  o.push(H('■ 2番目に強いもの'));
  o.push(box(PALE, NAVY, '<p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:' + NAVY + '">「' + e(second.name) + '」</p>' + P(e(second.what), 'margin:0')));
  // 場面
  if (!d.page) o.push(H('■ あなたが書いた「出てくる場面」'));
  if (d.page) {}
  else if (d.scene) o.push(P('<span style="display:inline-block;background:' + PALE + ';border-radius:6px;padding:8px 12px">「' + e(d.scene) + '」</span>') + P(e(SHINDAN.sceneYes)));
  else o.push(P(e(SHINDAN.sceneNo)));
  // クセ
  if (d.kuse.some(function (k) { return !!k; })) {
    var kt = shindanKuseTop(d.kuse);
    o.push(H('■ 判断のクセ（第2回）'));
    var dots = SHINDAN.kuse.map(function (k, i) {
      var lv = d.kuse[i], pos = SHINDAN.kuseLevels.indexOf(lv), c = '';
      for (var j = 0; j < 4; j++) c += '<td width="25%" style="text-align:center;font-size:18px;color:' + (j === pos ? (j < 2 ? ORANGE : NAVY) : LINE) + '">●</td>';
      return '<tr><td style="padding:4px 6px 4px 0;font-size:13px;width:30%;text-align:right;color:' + (pos >= 0 && pos < 2 ? ORANGE : SUB) + '">' + e(k.name) + '</td><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' + (pos < 0 ? '<td style="text-align:center;font-size:13px;color:' + SUB + '">（未回答）</td>' : c) + '</tr></table></td><td style="padding:4px 0 4px 6px;font-size:13px;width:30%;color:' + SUB + '">' + e(['思ったら動く', 'そのために今動く', '自分の確信で決める', '原因は自分の側にもある', '良くするシナリオを考える', '自分の価値観で決める'][i]) + '</td></tr>';
    }).join('');
    o.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td></td><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:11px;color:' + SUB + ';white-space:nowrap"><tr><td width="25%" align="center">A</td><td width="25%" align="center">やや<br>A</td><td width="25%" align="center">やや<br>B</td><td width="25%" align="center">B</td></tr></table></td><td></td></tr>' + dots + '</table>');
    if (!kt.length) o.push('<div style="margin-top:12px">' + P(e(SHINDAN.kuseNone)) + '</div>');
    else kt.slice(0, 2).forEach(function (x) {
      o.push('<div style="margin-top:12px">' + box(CREAM, ORANGE, '<p style="margin:0 0 6px;font-weight:bold;color:' + ORANGE + '">' + e(SHINDAN.kuse[x.i].name) + '</p>' + P(e(SHINDAN.kuse[x.i].text), 'margin:0')) + '</div>');
    });
  }
  // 今日の一歩
  o.push(H('■ 今日できる一歩'));
  o.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + NAVY + ';border-radius:10px"><tr><td style="padding:18px 20px;color:#fff;font-size:17px;line-height:1.8;font-weight:bold">✔ ' + e(top.step) + '</td></tr></table>');
  o.push(H('■ 次に見る回'));
  o.push(P('<b style="color:' + NAVY + '">' + e(top.lesson) + '</b>で、この止まり方の外し方を話しています。'));
  o.push(box(PALE, NAVY, P('<b style="color:' + NAVY + '">おすすめの見方</b>', 'margin:0 0 6px') + P(e(shindanWatch(top)).replace(/\n/g, '<br>'), 'margin:0')));
  o.push('<div style="border-top:1px solid ' + LINE + ';margin-top:24px;padding-top:16px">' + P(e(SHINDAN.closing).replace(/\n/g, '<br>'), 'color:' + SUB + ';font-size:15px') + '</div>');
  var btn = function (href, label, bg) { return '<a href="' + e(href) + '" style="display:inline-block;background:' + bg + ';color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:10px;font-size:16px;margin:6px 4px">' + label + '</a>'; };
  if (d.viewUrl || d.againUrl) o.push('<p style="text-align:center;margin:20px 0">' + (d.viewUrl ? btn(d.viewUrl, '結果をページで見る', NAVY) : '') + (d.againUrl ? btn(d.againUrl, '答え直す', ORANGE) : '') + '</p>');
  o.push(P('三浦公嗣（ありがとうグループ）', 'margin:16px 0 0'));
  o.push('</td></tr></table></div>');
  return o.join('');
}
