/* メールアドレスのよくある打ち間違いを見つける（2026-11-24）
 * 例：taro@gmai.com → taro@gmail.com
 * 見つけたら「もしかして…ですか？」を出すだけ。直すかどうかは入力した人が決める。
 * 同じアドレスでもう一度送られたら、そのまま通す（本当にそのドメインの人もいるため）。 */
(function (root) {
  var FIX = {
    "gmai.com": "gmail.com", "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com",
    "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmail.con": "gmail.com", "gmail.om": "gmail.com",
    "gmaill.com": "gmail.com", "gmail.co.jp": "gmail.com", "gmali.com": "gmail.com", "gnail.com": "gmail.com",
    "yahoo.co.j": "yahoo.co.jp", "yahoo.co.jo": "yahoo.co.jp", "yahoo.co": "yahoo.co.jp", "yaho.co.jp": "yahoo.co.jp",
    "yahooo.co.jp": "yahoo.co.jp", "yahoo.cojp": "yahoo.co.jp", "yahoo.jp": "yahoo.co.jp",
    "icloud.co": "icloud.com", "icloud.con": "icloud.com", "iclod.com": "icloud.com", "icoud.com": "icloud.com",
    "docomo.ne.j": "docomo.ne.jp", "docomo.co.jp": "docomo.ne.jp", "docomo.ne.jo": "docomo.ne.jp",
    "ezweb.ne.j": "ezweb.ne.jp", "ezweb.co.jp": "ezweb.ne.jp",
    "softbank.ne.j": "softbank.ne.jp", "i.softbank.j": "i.softbank.jp",
    "outlook.co": "outlook.com", "outlok.com": "outlook.com", "hotmail.co": "hotmail.com", "hotmai.com": "hotmail.com"
  };
  function mailTypo(addr) {
    var s = String(addr || "").trim(), at = s.lastIndexOf("@");
    if (at < 1) return "";
    var dom = s.slice(at + 1).toLowerCase(), fix = FIX[dom];
    return fix ? s.slice(0, at + 1) + fix : "";
  }
  root.mailTypo = mailTypo;
  if (typeof module !== "undefined" && module.exports) module.exports = mailTypo;
})(typeof window !== "undefined" ? window : this);
