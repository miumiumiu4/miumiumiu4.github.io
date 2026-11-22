"""音声の大きさ（0.05秒ごと、0〜99）を mp3/<KEY>.json に書く。ページの波はこれを見て動く（スマホの画面を消しても再生が止まらないよう、Web Audio は使わない）。
使い方: python3 _make_levels.py            （mp3/ の中で json がまだないものを全部）"""
import json, subprocess, struct, math
from pathlib import Path
D = Path(__file__).parent / "mp3"
STEP = 0.05
for mp3 in sorted(D.glob("*.mp3")):
    out = mp3.with_suffix(".json")
    if out.exists() and out.stat().st_mtime > mp3.stat().st_mtime:
        continue
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    n = int(8000 * STEP)
    vals = []
    for i in range(0, len(raw) // 2 - n, n):
        s = struct.unpack_from(f"<{n}h", raw, i * 2)
        rms = math.sqrt(sum(x * x for x in s) / n) / 32768
        db = 20 * math.log10(rms + 1e-9)
        vals.append(max(0, min(99, round((db + 50) / 38 * 99))))   # -50dB→0、-12dB→99
    out.write_text(json.dumps({"step": STEP, "v": vals}, separators=(",", ":")))
    print(out.name, len(vals))
