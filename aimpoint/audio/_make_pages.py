"""エイムポイントの音声ページ（朝の5分 1〜31日目）を作る。題を直したら TITLES を直して python3 _make_pages.py。
音声は mp3/dayNN.mp3 に置く。ページは NN/index.html。"""
from pathlib import Path
TITLES = ["自慢は布団の中でしなさい","頑張る人ほど人が逃げる","人脈はお腹で育つ","財布は配るほど膨らむ","根性は二人で持て",
"調子がいい日ほど人は逃げる","振り返る人ほど前に進む","欲しがるほど遠ざかる","問題だらけは元気の証拠","名前は一番短い贈り物",
"思い込みは勝手に育つ","許すは心の大掃除","チラ見せは最強の招待状","6つの合言葉はひとつの呼吸","無口な職人ほど呼ばれる",
"人づきあいは収穫を急ぐな","おにぎりの味は標高で決まる","笑顔は筋トレで作れ","手のひらの小鳥は握るな","旅先の他人は最高の先生",
"21日目の自分に拍手しろ","想像はまず黒板消しから","発酵する人間関係","先にあいさつした者が勝つ","ほめ言葉は下手なほど届く",
"三日坊主は若返りの薬","誇りはポケットにしまえ","準備は冷蔵庫から始まる","1か月前の自分は他人","前の夜は何もするな","今夜8時、密室が開く"]
SITE = "エイムポイント"
TPL = Path(__file__).with_name("_template.html").read_text(encoding="utf-8")
for i, t in enumerate(TITLES, 1):
    d = Path(__file__).parent / f"{i:02d}"
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(TPL.replace("{{SITE}}", SITE).replace("{{N}}", str(i)).replace("{{NN}}", f"{i:02d}")
                                  .replace("{{TITLE}}", t).replace("{{COURSE}}", "うぬぼれは密室で育てろ"), encoding="utf-8")
print(len(TITLES), "pages")
