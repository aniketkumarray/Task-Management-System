# Demo pitch video

`task-tracker-demo.mp4` — 1920×1080, 30 fps, ~110 s, voiceover + original music.
Everything is generated from code: real product screenshots are captured from the app, the motion is a
deterministic DOM animation (`scene.html`, `frame(t)`), frames are rendered with headless Chrome, and the
audio is synthesised (music) and neural-TTS (voiceover), then mixed and loudness-normalised to −14 LUFS.

## Re-rendering

Prerequisites: Node 18+, Python 3.10+, Google Chrome (or Edge — change `channel` in the scripts).

```bash
cd video
npm install                               # playwright + geist fonts (no browser download; uses system Chrome)
pip install numpy scipy pillow imageio-ffmpeg edge-tts

# 1. demo data + screenshots (needs the app running in production mode, e.g. `npm run build && npm start -- --port 3111`)
node seed-demo.mjs                        # creates 4 demo users + 10 tasks (recorded in demo-ids.json)
MANAGER_EMAIL=you@example.com MANAGER_PASS=... node capture.mjs
MANAGER_EMAIL=you@example.com MANAGER_PASS=... node capture-extra.mjs
node cleanup-demo.mjs                     # removes exactly what seed-demo created

# 2. voiceover → timeline → music/mix
python vo.py                              # work/vo/*.wav + vo.json (word timings)
python timeline.py                        # work/timeline.json (scene boundaries from the VO)
python music.py                           # work/music.wav + work/mix.wav
python audio_qa.py                        # optional: work/audio_qa.png waveform/spectrogram

# 3. pictures
node render.mjs sheet                     # contact sheet for review: work/preview/sheet.png
node render.mjs preview 12.5,40,66        # specific frames
node render.mjs render 4                  # full render with 4 parallel pages → task-tracker-demo.mp4
python finish.py                          # fallback: concat + mux if render.mjs was interrupted after the segments
```

## Editing

- **Script / voice:** `vo.py` (`SECTIONS`, `VOICE`, `RATE`). Scene lengths follow the speech automatically.
- **Motion:** `scene.html`. Each scene keys its animations to spoken words via `wt("scene", "word")`, so
  changing the script re-times the visuals. Callout anchors are measured on 2000 px-wide previews of the
  screenshots (`local(x, y)`).
- **Music:** `music.py` — 104 BPM, Am7–Fmaj7–Cadd9–G; hits land on scene starts.
- **Screens:** `capture.mjs` — swap/add shots in `shots/` and reference them in `SHOT` inside `scene.html`.
