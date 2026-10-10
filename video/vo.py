"""Generate the voiceover with word timings. Writes work/vo/<id>.mp3 + work/vo/vo.json."""
import asyncio, json, os, subprocess, sys
import edge_tts, imageio_ffmpeg

VOICE = "en-US-AndrewMultilingualNeural"
RATE = "-4%"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "work", "vo")
os.makedirs(OUT, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

SECTIONS = [
    ("hook",
     "Dashboards. Reports. Deadlines. When a team is juggling dozens of them, the hard question isn't what's being done. "
     "It's: who's doing what, and is it still on track?"),
    ("reveal",
     "Meet Task Tracker. One daily update from each person. Total visibility for everyone."),
    ("myday",
     "Every morning, each person lands on My Day: exactly which tasks need an update, what's overdue, "
     "and where every task stands in its workflow."),
    ("update",
     "Posting an update takes ten seconds. A one-line note. Move the stage. Log the hours. "
     "And if a deadline has to move, you say why. One post, everything captured."),
    ("history",
     "Every task keeps its full story: daily notes, stage changes, and every deadline move with its reason. "
     "No more digging through chat threads."),
    ("calendar",
     "The calendar shows the whole team's month at a glance. Switch to the timeline, and slippage jumps out: "
     "diamonds mark the original deadlines, red tails mark overdue work."),
    ("team",
     "Managers get the pulse without chasing anyone. Who's overdue, who hasn't updated today, "
     "and what the team shipped this week."),
    ("config",
     "And it fits your workflow, not the other way around. Task types, turnaround times, stages and team members, "
     "all configurable in about a minute."),
    ("mobile",
     "It installs on any phone like a native app, so updates happen wherever the work does."),
    ("close",
     "Task Tracker. One update a day. Nothing slips."),
]


async def synth(sid, text):
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    words = []
    mp3 = os.path.join(OUT, f"{sid}.mp3")
    with open(mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
    wav = os.path.join(OUT, f"{sid}.wav")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "1", wav], check=True)
    probe = subprocess.run([FFMPEG, "-i", wav], capture_output=True, text=True).stderr
    dur = 0.0
    for line in probe.splitlines():
        if "Duration:" in line:
            h, m, s = line.split("Duration:")[1].split(",")[0].strip().split(":")
            dur = int(h) * 3600 + int(m) * 60 + float(s)
    return {"id": sid, "text": text, "duration": round(dur, 3), "words": words}


async def main():
    out = []
    for sid, text in SECTIONS:
        sec = await synth(sid, text)
        out.append(sec)
        print(f"{sid:9s} {sec['duration']:6.2f}s  {len(sec['words'])} words")
    with open(os.path.join(OUT, "vo.json"), "w", encoding="utf8") as f:
        json.dump(out, f, indent=1)
    print("total speech:", round(sum(s["duration"] for s in out), 1), "s")


asyncio.run(main())
