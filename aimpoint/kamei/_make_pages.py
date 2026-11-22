"""加盟前の毎日音声（資料請求した方へ・毎朝3分 1〜14日目）のページを作る。デザインは aimpoint/audio と同じ。
題を直したら TITLES を直して python3 _make_pages.py。音声は mp3/dayNN.mp3、波用の大きさは python3 _make_levels.py（mp3/dayNN.json）。
ページは NN/index.html。下の「個別面談で相談する」ボタンは UTM 付き（utm_content=dNN）。"""
from pathlib import Path
TITLES = ["お金がない人ほど、先に決めている", "不安は暇な人にだけやってくる", "失敗したい人だけが、うまくいく",
          "『自分にはできない』は、だれの声？", "頼れる人ほど、強くなる", "うまく回っている今がいちばん危ない",
          "60点で出した人が先にゴールする", "体が動くうちに、体に頼らない形を", "正解は、走りながら届く",
          "家族の反対は、応援の下書き", "危ないならやめる、怖いなら行く", "職人の地位は、自分で上げられる",
          "迷っている時間にも、家賃はかかる", "話すだけで、半分は決まる"]
TPL = Path(__file__).with_name("_template.html").read_text(encoding="utf-8")
for i, t in enumerate(TITLES, 1):
    d = Path(__file__).parent / f"{i:02d}"
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(TPL.replace("{{N}}", str(i)).replace("{{NN}}", f"{i:02d}").replace("{{TITLE}}", t),
                                  encoding="utf-8")
print(len(TITLES), "pages")
