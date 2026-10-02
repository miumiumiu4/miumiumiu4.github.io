/* 見積りの写真（最大3枚・任意）。写真は、このブラウザの中だけに置きます。
   ・選んだ写真は小さくして（長いほうを1000pxに）、タブを閉じると消える入れもの（sessionStorage）にだけ入れます。
   ・外へ送るのは、予約を確定したあとの「写真も送る」のチェックを入れた時だけ（会社のGASが受けられる時）。
   ・写真の自動読み取りは、まだありません。 */
(function () {
  "use strict";
  var U = window.UI, KEY = "arigatou.photos", MAX = 3;
  var LABELS = ["エアコン全体", "室内機のラベル（型番）", "設置している場所"];
  var list = [null, null, null];

  (function restore() { var r = U.store(function () { return JSON.parse(sessionStorage.getItem(KEY) || "null"); }); if (r && r.length) list = r.slice(0, MAX).concat([null, null, null]).slice(0, MAX); })();
  function persist() { U.store(function () { sessionStorage.setItem(KEY, JSON.stringify(list)); }); }

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var rd = new FileReader();
      rd.onerror = function () { reject(new Error("読めませんでした")); };
      rd.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("写真として読めませんでした")); };
        img.onload = function () {
          var s = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.72));
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  function mount(root) {
    function paint() {
      root.innerHTML = '<div class="photo-slots">' + LABELS.map(function (lab, i) {
        return '<div class="photo-slot"><b class="small">' + (i + 1) + ". " + U.esc(lab) + "</b>" +
          (list[i] ? '<img src="' + list[i] + '" alt="選んだ写真：' + U.esc(lab) + '">' + '<button type="button" class="btn sm ghost" data-del="' + i + '">この写真をはずす</button>'
            : '<label class="btn sm ghost" for="ph-' + i + '">写真をえらぶ（任意）</label><input class="sr" id="ph-' + i + '" type="file" accept="image/*" data-ph="' + i + '">') + "</div>";
      }).join("") + "</div>";
    }
    root.addEventListener("change", function (e) {
      var inp = e.target.closest("[data-ph]"); if (!inp || !inp.files[0]) return;
      var i = Number(inp.getAttribute("data-ph"));
      shrink(inp.files[0]).then(function (url) { list[i] = url; persist(); paint(); }, function (err) { root.insertAdjacentHTML("beforeend", '<p class="err" role="alert">' + U.esc(err.message) + "</p>"); });
    });
    root.addEventListener("click", function (e) { var b = e.target.closest("[data-del]"); if (b) { list[Number(b.getAttribute("data-del"))] = null; persist(); paint(); } });
    paint();
  }
  window.Photos = {
    mount: mount, count: function () { return list.filter(Boolean).length; },
    clear: function () { list = [null, null, null]; U.store(function () { sessionStorage.removeItem(KEY); }); },
    // 送る用：[{ seq, mime, data(base64) }]
    forUpload: function () { var out = []; list.forEach(function (u, i) { if (u) out.push({ seq: i + 1, mime: "image/jpeg", data: u.split(",")[1] }); }); return out; }
  };
})();
