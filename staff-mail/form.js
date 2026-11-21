(function () {
  var f = document.getElementById("f");
  var btn = document.getElementById("btn");
  var msg = document.getElementById("msg");
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var OTHER = "__other__";

  // 11/21 HAPPY Q19：店舗の一覧があれば選ぶ形に。一覧にない時だけ「その他」で書く
  var stores = Array.isArray(window.STAFF_MAIL_STORES) ? window.STAFF_MAIL_STORES.filter(function (s) { return typeof s === "string" && s.trim(); }) : [];
  var sel = document.getElementById("storeSel");
  if (stores.length) {
    stores.forEach(function (s) { var o = document.createElement("option"); o.value = s.trim(); o.textContent = s.trim(); sel.appendChild(o); });
    var other = document.createElement("option"); other.value = OTHER; other.textContent = "一覧にない（書いて入れる）"; sel.appendChild(other);
    sel.hidden = false; f.store.hidden = true; f.store.placeholder = "一覧にない店舗名";
    sel.addEventListener("change", function () { f.store.hidden = sel.value !== OTHER; if (sel.value === OTHER) f.store.focus(); });
  }

  function show(text, ok) {
    msg.textContent = text;
    msg.className = "msg " + (ok ? "ok" : "ng");
  }

  f.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var store = stores.length && sel.value !== OTHER ? sel.value : f.store.value.trim();
    var name = f.name.value.trim();
    var email = f.email.value.trim();
    var email2 = f.email2.value.trim();
    if (!store) return show("所属の店舗名を入れてください。", false);
    if (!name) return show("お名前を入れてください。", false);
    if (!EMAIL.test(email)) return show("メールアドレスの形を確かめてください。", false);
    if (email.toLowerCase() !== email2.toLowerCase()) return show("確認のメールアドレスが一致していません。", false);
    if (!window.STAFF_MAIL_GAS_URL) return show("ただいま準備中です。少し時間をおいてお試しください。", false);

    var body = new URLSearchParams({ store: store, name: name, email: email, website: f.website.value });
    btn.disabled = true;
    show("送信しています…", true);
    fetch(window.STAFF_MAIL_GAS_URL, { method: "POST", body: body })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) {
          show((res.updated ? "登録内容を更新しました。" : "登録しました。") + "ありがとうございます！続けて別の方も登録できます。", true);
          f.name.value = ""; f.email.value = ""; f.email2.value = "";   // 店舗はそのまま（続けて同じ店の人を入れられる）
        } else {
          show((res && res.error) || "登録できませんでした。もう一度お試しください。", false);
        }
      })
      .catch(function () { show("通信に失敗しました。電波の良い場所でもう一度お試しください。", false); })
      .then(function () { btn.disabled = false; });
  });
})();
