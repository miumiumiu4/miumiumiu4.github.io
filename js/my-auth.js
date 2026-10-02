/* マイページの合言葉の受けわたし（my.html と warranty.html で使う）。
   メールのリンク ?j=受付番号&t=合言葉（家族は &f=共有番号 もつく）を読んだら、すぐアドレス欄から消します（履歴・画面の共有に残さないため）。
   合言葉は sessionStorage（タブを閉じると消える）にだけ置きます。localStorage には入れません。 */
(function () {
  "use strict";
  var KEY = "arigatou.my", U = window.UI;
  function fromUrl() {
    var q = new URLSearchParams(location.search), j = q.get("j"), t = q.get("t"), f = q.get("f");
    if (!j || !t) return null;
    return { jobId: j, token: t, familyId: f || "" };
  }
  function get() {
    var a = fromUrl();
    if (a) {
      U.store(function () { sessionStorage.setItem(KEY, JSON.stringify(a)); });
      try { history.replaceState(null, "", location.pathname); } catch (e) { /* 消せなくても動く */ }
      return a;
    }
    var s = U.store(function () { return JSON.parse(sessionStorage.getItem(KEY) || "null"); });
    return s && s.jobId && s.token ? s : null;
  }
  function set(a) { U.store(function () { sessionStorage.setItem(KEY, JSON.stringify(a)); }); }
  function clear() { U.store(function () { sessionStorage.removeItem(KEY); }); }
  window.MyAuth = { get: get, set: set, clear: clear };
})();
