/* 写真で総額：写真（任意・ブラウザの中だけ）→ 内容をえらぶ → 総額 */
(function () {
  "use strict";
  var U = window.UI, seq = 0;
  Photos.mount(U.$("#photos"));
  var toBook = U.$("#to-book");
  var form = MenuForm.mount(U.$("#menu"), { withDay: true, onChange: update });

  function update(input) {
    var box = U.$("#result"), my = ++seq;
    if (!input.items.length) { MenuForm.renderQuote(box, null); toBook.setAttribute("aria-disabled", "true"); return; }
    U.busy(U.$("#result-card"), true);
    Api.quote(input).then(function (q) {
      if (my !== seq) return;
      MenuForm.renderQuote(box, q);
      if (q.needsQuote) { box.insertAdjacentHTML("beforeend", '<p class="caution">4LDK以上の空室清掃は見積りです。インターネットの予約は使えません。お電話かメールでご相談ください。</p>'); toBook.setAttribute("aria-disabled", "true"); }
      else toBook.removeAttribute("aria-disabled");
    }, function (err) { if (my === seq) { U.showError(box, err.message); toBook.setAttribute("aria-disabled", "true"); } })
      .then(function () { if (my === seq) U.busy(U.$("#result-card"), false); });
  }
  toBook.addEventListener("click", function (e) { if (toBook.getAttribute("aria-disabled") === "true") { e.preventDefault(); U.say(U.$("#result"), "先に、お願いしたい内容を選んでください。", "caution"); } });
})();
