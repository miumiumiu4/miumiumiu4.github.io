/*
  アンケート（survey.html）の設定。★ 空（""）の所は、三浦さんが決めて書き入れます ★
  ・GAS_URL が空のあいだは「デモ表示」（送っても記録されません）
  ・LIFF_ID が空、または LINE の外で開いた時は「メールだけで答える」形になります
  設定のしかたは gas/survey/README.md を見てください。
*/
window.SURVEY_CONFIG = {
  CAMPAIGN_ID: "2026-needs-01",     // アンケートの回の名前。GAS側の CAMPAIGN_ID と同じにする
  GAS_URL: "",                       // アンケート用GASのウェブアプリURL（…/exec）
  LIFF_ID: "2011871268-iKlrVVRY",     // LINE Developers の LIFF ID（i は小文字のアイ、l は小文字のエル）
  DEADLINE: "",                      // しめきり（例：2026-10-31）。この日の23:59まで受けつけ
  WINNERS: 100,                      // 当選人数
  AMOUNT: 500,                       // 1人あたりの金額（円）
  NOTICE_DAYS: 14                    // しめきりから何日以内に結果を知らせるか
};
