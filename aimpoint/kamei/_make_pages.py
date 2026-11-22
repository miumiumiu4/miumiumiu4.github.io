"""加盟前の毎日音声（資料請求した方へ・毎朝3分 1〜14日目）のページを作る。デザインは aimpoint/audio と同じ。
ページの住所と音声のファイル名は、次の日を当てられないよう日ごとにばらばらの10文字（連番にしない）。
日→名前の対応はこのリポジトリに置かない（Mac mini の ~/claude/ever-offer/kamei-audio/kamei_urls.json）。
使い方: python3 _make_pages.py ~/claude/ever-offer/kamei-audio/kamei_urls.json [音声のフォルダ]
  音声のフォルダ（dayNN.mp3 がある所）を渡すと、mp3/<名前>.mp3 に写す。そのあと python3 _make_levels.py で波の大きさ（mp3/<名前>.json）。
ページは <名前>/index.html。下の「個別面談で相談する」ボタンは UTM 付き（utm_content=dNN）。"""
import json, shutil, sys
from pathlib import Path
TITLES = ["お金がない人ほど、先に決めている", "不安は暇な人にだけやってくる", "失敗したい人だけが、うまくいく",
          "『自分にはできない』は、だれの声？", "頼れる人ほど、強くなる", "うまく回っている今がいちばん危ない",
          "60点で出した人が先にゴールする", "体が動くうちに、体に頼らない形を", "正解は、走りながら届く",
          "家族の反対は、応援の下書き", "危ないならやめる、怖いなら行く", "職人の地位は、自分で上げられる",
          "迷っている時間にも、家賃はかかる", "話すだけで、半分は決まる"]
HERE = Path(__file__).parent
KEYS = json.loads(Path(sys.argv[1]).expanduser().read_text())
SRC = Path(sys.argv[2]).expanduser() if len(sys.argv) > 2 else None
TPL = HERE.joinpath("_template.html").read_text(encoding="utf-8")
(HERE / "mp3").mkdir(exist_ok=True)
for i, t in enumerate(TITLES, 1):
    key = KEYS[f"{i:02d}"]
    d = HERE / key
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(TPL.replace("{{N}}", str(i)).replace("{{NN}}", f"{i:02d}").replace("{{KEY}}", key)
                                  .replace("{{TITLE}}", t), encoding="utf-8")
    if SRC:
        shutil.copy2(SRC / f"day{i:02d}.mp3", HERE / "mp3" / f"{key}.mp3")
print(len(TITLES), "pages")
