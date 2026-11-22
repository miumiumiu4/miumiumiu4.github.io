"""加盟前の毎日音声（資料請求した方へ・毎朝3分 1〜14日目）のページを作る。デザインは aimpoint/audio と同じ。
題を直したら TITLES を直して python3 _make_pages.py。音声は mp3/<KEY>.mp3、波用の大きさは python3 _make_levels.py（mp3/<KEY>.json）。
ページは <KEY>/index.html。KEY は日ごとの推測できない12文字（11/23 さとぴー：01→02と打てば次が聞けてしまうのを防ぐ）。下の「個別面談で相談する」ボタンは UTM 付き（utm_content=dNN）。"""
from pathlib import Path
TITLES = ["お金がない人ほど、先に決めている", "不安は暇な人にだけやってくる", "失敗したい人だけが、うまくいく",
          "『自分にはできない』は、だれの声？", "頼れる人ほど、強くなる", "うまく回っている今がいちばん危ない",
          "60点で出した人が先にゴールする", "体が動くうちに、体に頼らない形を", "正解は、走りながら届く",
          "家族の反対は、応援の下書き", "危ないならやめる、怖いなら行く", "職人の地位は、自分で上げられる",
          "迷っている時間にも、家賃はかかる", "話すだけで、半分は決まる"]
KEYS = ['0hy0tt09hxl8', 'iaju7flbc1n1', 'bq0uivraermy', '5serw3fuadth', '3lefhoqyawoh', '67gheucnum3k', '7gxq3h47xzle', 'io9esdpoka7t', 'e3dwhpfvxm25', 'jbn3vbh8bbva', 'yhqcdmr1xtgf', '7yefqdjfzl4i', 'yli06vzoocv4', 'ipioz53mobj2']
TPL = Path(__file__).with_name("_template.html").read_text(encoding="utf-8")
for i, t in enumerate(TITLES, 1):
    d = Path(__file__).parent / KEYS[i - 1]
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(TPL.replace("{{N}}", str(i)).replace("{{NN}}", f"{i:02d}").replace("{{TITLE}}", t).replace("{{KEY}}", KEYS[i - 1]),
                                  encoding="utf-8")
print(len(TITLES), "pages")
