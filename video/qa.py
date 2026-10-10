"""QA the final MP4: contact sheet of decoded frames + audio/scene alignment check."""
import json, os, subprocess, re
import numpy as np
from PIL import Image, ImageDraw
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__)); WORK = os.path.join(HERE, "work")
FF = imageio_ffmpeg.get_ffmpeg_exe()
OUT = os.path.join(HERE, "task-tracker-demo.mp4")
tl = json.load(open(os.path.join(WORK, "timeline.json")))

# frames: 0.4 s after each scene start (first visible content) and mid-scene
times = []
for s in tl["scenes"]:
    times += [round(s["start"] + 0.4, 2), round((s["start"] + s["end"]) / 2, 2)]
os.makedirs(os.path.join(WORK, "qa"), exist_ok=True)
files = []
for t in times:
    f = os.path.join(WORK, "qa", f"f_{t:07.2f}.png")
    subprocess.run([FF, "-y", "-loglevel", "error", "-ss", str(t), "-i", OUT, "-frames:v", "1", f], check=True)
    files.append(f)
cols, w, h = 4, 480, 270
rows = -(-len(files) // cols)
sheet = Image.new("RGB", (cols * w, rows * (h + 22)), (10, 10, 14)); d = ImageDraw.Draw(sheet)
for i, (f, t) in enumerate(zip(files, times)):
    im = Image.open(f).resize((w, h)); x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im, (x, y + 22)); d.text((x + 6, y + 5), f"t={t:.2f}s", fill=(230, 230, 230))
sheet.save(os.path.join(WORK, "qa", "sheet.png"))

# audio: decode final track, find speech onset per scene (energy in 300–3000 Hz band after the scene start)
wav = os.path.join(WORK, "qa", "final.wav")
subprocess.run([FF, "-y", "-loglevel", "error", "-i", OUT, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
sr, x = wavfile.read(wav); x = x.astype(np.float32) / 32768
sos = butter(4, [300, 3000], btype="band", fs=sr, output="sos"); band = sosfilt(sos, x)
env = np.sqrt(np.convolve(band ** 2, np.ones(400) / 400, mode="same"))
print(f"{'scene':9s} {'vo_start':>8s} {'detected':>8s} {'delta':>6s}")
for s in tl["scenes"]:
    a = int(s["start"] * sr); b = int(s["vo_start"] * sr + 2.0 * sr)
    seg = env[a:b]
    thr = seg.max() * 0.25
    onset = s["start"] + np.argmax(seg > thr) / sr
    print(f"{s['id']:9s} {s['vo_start']:8.2f} {onset:8.2f} {onset - s['vo_start']:+6.2f}")
dur = len(x) / sr
print("audio duration", round(dur, 2), " video duration", tl["duration"])
