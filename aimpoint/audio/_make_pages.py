"""音声を足したら python3 _make_levels.py で波用の大きさ（mp3/dayNN.json）も作る。
エイムポイントの音声ページ（朝の5分 1〜31日目）を作る。題を直したら TITLES を直して python3 _make_pages.py。
音声は mp3/<KEY>.mp3（波は <KEY>.json）。ページは <KEY>/index.html。KEY は日ごとの推測できない12文字（11/23 さとぴー：01→02と打てば聞けてしまうのを防ぐ）。
1日目だけは配布済みの 01/ も同じ中身で残す。"""
import json
from pathlib import Path
TITLES = ["自慢は布団の中でしなさい","頑張る人ほど人が逃げる","人脈はお腹で育つ","財布は配るほど膨らむ","根性は二人で持て",
"調子がいい日ほど人は逃げる","振り返る人ほど前に進む","欲しがるほど遠ざかる","問題だらけは元気の証拠","名前は一番短い贈り物",
"思い込みは勝手に育つ","許すは心の大掃除","チラ見せは最強の招待状","6つの合言葉はひとつの呼吸","無口な職人ほど呼ばれる",
"人づきあいは収穫を急ぐな","おにぎりの味は標高で決まる","笑顔は筋トレで作れ","手のひらの小鳥は握るな","旅先の他人は最高の先生",
"21日目の自分に拍手しろ","想像はまず黒板消しから","発酵する人間関係","先にあいさつした者が勝つ","ほめ言葉は下手なほど届く",
"三日坊主は若返りの薬","誇りはポケットにしまえ","準備は冷蔵庫から始まる","1か月前の自分は他人","前の夜は何もするな","今夜8時、密室が開く"]
SITE = "エイムポイント"
KEYS = ["i3sp60eulgun", "rwb2svczhcb9", "ojp7roxmi9uw", "s0wrnp1u1k1v", "7i8wzq0ii194", "w7kvh90rcw44", "r1uc18mcnd4v", "l92ypmoj3z2d", "06xabhp05osw", "bq41rljo2bj1", "doycmjxgg4r4", "cngtj3a89nit", "qlfv7yshnrut", "os7ajb2dbqwi", "74oqzugyv4ul", "lk1nrpzq41vp", "85s9p1ec7c5g", "0ykcr9tde4o5", "5a4yhl3bhe7t", "hpwr3s3xj7ic", "18tmupxsi7nh", "zimu55zzh8br", "ahdyoal0ap9u", "39obv6c3i82g", "15d012h556tz", "5csi9jt5dokr", "6mpsz2sn5x9i", "1bv8h0u1bwmk", "lszxj8srnvas", "oq2rgbvchpz4", "ookykncnm9kj"]
# 再生の記録を受け取るGAS（ウェブアプリのURL）。空なら記録しない。シートは new-gurucon/listen-log/Code.gs
LOG_URL = "https://script.google.com/macros/s/AKfycbx-ZoNE6ouWsx_Rn4HSwRQD4N0lECpzGKOvAZaa1Q9z2XrGClpx945BkN47Rdb0P7GJ/exec"
TPL = Path(__file__).with_name("_template.html").read_text(encoding="utf-8")
for i, t in enumerate(TITLES, 1):
    # 音声の一覧：題は31本ぜんぶ、住所（KEY）はこのページの日までだけ入れる（先の日の住所を見せない）
    lst = json.dumps([{"n": j, "t": TITLES[j - 1], "k": KEYS[j - 1] if j <= i else ""} for j in range(1, len(TITLES) + 1)], ensure_ascii=False)
    html = (TPL.replace("{{LIST}}", lst).replace("{{SITE}}", SITE).replace("{{N}}", str(i)).replace("{{NN}}", f"{i:02d}")
                                  .replace("{{TITLE}}", t).replace("{{COURSE}}", "うぬぼれは密室で育てろ").replace("{{LOG_URL}}", LOG_URL).replace("{{KEY}}", KEYS[i - 1]))
    for name in ([KEYS[i - 1]] + (["01"] if i == 1 else [])):
        d = Path(__file__).parent / name
        d.mkdir(exist_ok=True)
        (d / "index.html").write_text(html, encoding="utf-8")
print(len(TITLES), "pages")
