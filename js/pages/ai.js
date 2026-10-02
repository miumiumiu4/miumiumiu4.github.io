/* AI向け情報：貼りつける文をコピーするボタン */
(function () {
  "use strict";
  var U = window.UI, btn = U.$("#copy"), msg = U.$("#copy-msg"), pre = U.$("#ai-prompt");
  if (!btn || !pre) return;
  btn.addEventListener("click", function () {
    var text = pre.textContent;
    function ok() { msg.textContent = "コピーしました。AIの入力欄に貼りつけてください。"; }
    function manual() {
      var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      msg.textContent = "文を選びました。コピー（Ctrl+C／Cmd+C）してください。";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, manual); else manual();
  });
})();
