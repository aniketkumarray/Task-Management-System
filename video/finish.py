"""Verify rendered segments, concatenate, loudness-normalise the mix and mux the final MP4."""
import json, os, re, subprocess, sys
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__)); WORK = os.path.join(HERE, "work")
FF = imageio_ffmpeg.get_ffmpeg_exe()
tl = json.load(open(os.path.join(WORK, "timeline.json")))
FPS = tl["fps"]; TOTAL = -(-int(tl["duration"] * FPS) // 1)
import math
TOTAL = math.ceil(tl["duration"] * FPS)


def run(args, **kw):
    return subprocess.run([FF, "-hide_banner", *args], capture_output=True, text=True, **kw)


segs = sorted(f for f in os.listdir(WORK) if re.fullmatch(r"seg_\d+\.mp4", f))
frames = 0
for s in segs:
    r = run(["-i", os.path.join(WORK, s), "-map", "0:v", "-c", "copy", "-f", "null", "-"])
    n = int(re.findall(r"frame=\s*(\d+)", r.stderr)[-1])
    frames += n
    print(f"{s}: {n} frames")
print(f"total {frames} frames, expected {TOTAL}")
if frames != TOTAL:
    sys.exit("frame count mismatch — re-render")

with open(os.path.join(WORK, "concat.txt"), "w") as f:
    for s in segs:
        f.write(f"file '{os.path.join(WORK, s).replace(os.sep, '/')}'\n")
r = run(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(WORK, "concat.txt"), "-c", "copy", os.path.join(WORK, "video.mp4")])
if r.returncode: sys.exit(r.stderr)

# two-pass loudnorm to -14 LUFS / -1.5 dBTP
mix = os.path.join(WORK, "mix.wav")
m = run(["-i", mix, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]).stderr
j = json.loads(m[m.rfind("{"): m.rfind("}") + 1])   # ffmpeg 7 prints a summary line after the JSON
ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
      f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true:print_format=summary")
out = os.path.join(HERE, "task-tracker-demo.mp4")
r = run(["-y", "-loglevel", "error", "-i", os.path.join(WORK, "video.mp4"), "-i", mix, "-af", ln,
         "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out])
if r.returncode: sys.exit(r.stderr)

# report
info = run(["-i", out]).stderr
print(re.search(r"Duration: [^,]+", info)[0], "|", os.path.getsize(out) // 1024 // 1024, "MB")
chk = run(["-i", out, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=summary", "-f", "null", "-"]).stderr
print("\n".join(l for l in chk.splitlines() if l.startswith(("Input Integrated", "Input True Peak"))))
