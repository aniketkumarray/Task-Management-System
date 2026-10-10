"""Render a waveform + spectrogram picture of work/mix.wav with scene markers for visual QA."""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import spectrogram
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); WORK = os.path.join(HERE, "work")
tl = json.load(open(os.path.join(WORK, "timeline.json")))
W, H1, H2 = 1800, 220, 300
img = Image.new("RGB", (W, H1 + H2 + 40), (18, 18, 24)); d = ImageDraw.Draw(img)

for name, y0, h in (("music.wav", 0, H1 // 2), ("mix.wav", H1 // 2, H1 // 2)):
    sr, x = wavfile.read(os.path.join(WORK, name)); x = x.astype(np.float32) / 32768
    mono = x.mean(axis=1); per = len(mono) // W
    for i in range(W):
        seg = mono[i * per:(i + 1) * per]
        if not len(seg): break
        rms = np.sqrt((seg ** 2).mean()); pk = np.abs(seg).max()
        cy = y0 + h // 2
        d.line([(i, cy - pk * h / 2), (i, cy + pk * h / 2)], fill=(70, 90, 140))
        d.line([(i, cy - rms * h / 2), (i, cy + rms * h / 2)], fill=(120, 170, 255))
    d.text((6, y0 + 4), name, fill=(220, 220, 220))

sr, x = wavfile.read(os.path.join(WORK, "mix.wav")); mono = x.astype(np.float32).mean(axis=1) / 32768
f, t, Sxx = spectrogram(mono, sr, nperseg=2048, noverlap=1024)
Sdb = 10 * np.log10(Sxx + 1e-12); Sdb = np.clip((Sdb + 100) / 70, 0, 1)
fmax = 12000; rows = f <= fmax
spec = (Sdb[rows][::-1] * 255).astype(np.uint8)
spec_img = Image.fromarray(spec).resize((W, H2)).convert("RGB")
img.paste(spec_img, (0, H1))

dur = tl["duration"]
for s in tl["scenes"]:
    xx = int(s["start"] / dur * W)
    d.line([(xx, 0), (xx, H1 + H2)], fill=(255, 120, 60))
    d.text((xx + 3, H1 + H2 + 4), s["id"], fill=(255, 200, 150))
    xv = int(s["vo_start"] / dur * W); xe = int(s["vo_end"] / dur * W)
    d.line([(xv, H1 + H2 + 24), (xe, H1 + H2 + 24)], fill=(120, 255, 160), width=3)
img.save(os.path.join(WORK, "audio_qa.png"))

# RMS per scene, music vs mix (dBFS)
sr, m = wavfile.read(os.path.join(WORK, "music.wav")); m = m.astype(np.float32).mean(axis=1) / 32768
for s in tl["scenes"]:
    a, b = int(s["vo_start"] * sr), int(s["vo_end"] * sr)
    rm = 20 * np.log10(np.sqrt((m[a:b] ** 2).mean()) + 1e-9)
    rx = 20 * np.log10(np.sqrt((mono[a:b] ** 2).mean()) + 1e-9)
    print(f"{s['id']:9s} music {rm:6.1f} dB   mix {rx:6.1f} dB")
