"""Build work/timeline.json: absolute scene/VO/word times from the generated voiceover."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
vo = json.load(open(os.path.join(HERE, "work", "vo", "vo.json"), encoding="utf8"))

LEAD = 0.9           # silence before the first word
GAP = {"hook": 0.7, "reveal": 1.0, "myday": 0.9, "update": 0.9, "history": 0.9,
       "calendar": 0.9, "team": 0.9, "config": 0.9, "mobile": 1.1, "close": 0.0}
CLOSE_HOLD = 4.0     # hold on the end card after the last word

scenes, t = [], 0.0
for i, s in enumerate(vo):
    start = t
    vo_start = start + (LEAD if i == 0 else 0.55)
    end = vo_start + s["duration"] + (CLOSE_HOLD if s["id"] == "close" else GAP[s["id"]])
    scenes.append({
        "id": s["id"], "start": round(start, 3), "end": round(end, 3), "vo_start": round(vo_start, 3),
        "vo_end": round(vo_start + s["duration"], 3),
        "words": [{"w": w["w"], "t": round(vo_start + w["t"], 3), "d": round(w["d"], 3)} for w in s["words"]],
    })
    t = end

timeline = {"fps": 30, "width": 1920, "height": 1080, "duration": round(t, 3), "scenes": scenes}
json.dump(timeline, open(os.path.join(HERE, "work", "timeline.json"), "w", encoding="utf8"), indent=1)
for s in scenes:
    print(f"{s['id']:9s} {s['start']:7.2f} â†’ {s['end']:7.2f}   vo {s['vo_start']:6.2f}â€“{s['vo_end']:6.2f}")
print("duration", timeline["duration"])

