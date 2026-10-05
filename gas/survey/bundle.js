// 3つのGASファイルを、Apps Script に1回で貼れる1つのファイルにまとめる（node gas/survey/bundle.js）
const fs = require('fs'), path = require('path');
const dir = __dirname, files = ['Hub.gs', 'Survey.gs', 'Admin.gs'];
const head = '/* このファイルは gas/survey/bundle.js が作ります。直すときは Hub.gs・Survey.gs・Admin.gs を直してから作りなおしてください。\n   Apps Script の「コード.gs」の中身を全部消して、これを丸ごと貼りつけます。 */\n\n';
fs.writeFileSync(path.join(dir, 'まとめて貼る.gs'), head + files.map(f => '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n'));
console.log('ok まとめて貼る.gs');
