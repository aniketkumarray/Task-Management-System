"""Synthesize the music bed from scratch, keyed to work/timeline.json, then mix with the voiceover.

Outputs: work/music.wav (bed only), work/mix.wav (bed ducked under VO + VO), both 48 kHz stereo.
"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import lfilter, lfilter_zi, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work")
SR = 48000
tl = json.load(open(os.path.join(WORK, "timeline.json"), encoding="utf8"))
S = {s["id"]: s for s in tl["scenes"]}
DUR = tl["duration"]
N = int(DUR * SR) + SR  # 1 s tail, trimmed later
rng = np.random.default_rng(7)

BPM = 104
BEAT = 60 / BPM
BAR = BEAT * 4
GROOVE_START = S["reveal"]["start"]           # downbeat lands on the logo reveal
GROOVE_END = S["close"]["start"]              # drums stop on the end card
INTRO_END = GROOVE_START

# A minor / C major: Am7 – Fmaj7 – Cadd9 – G  (one bar each)
def hz(midi): return 440.0 * 2 ** ((midi - 69) / 12)
CHORDS = [
    {"root": 45, "notes": [57, 60, 64, 67]},      # Am7  (A3 C4 E4 G4)
    {"root": 41, "notes": [57, 60, 65, 69]},      # Fmaj7 (A3 C4 F4 A4)
    {"root": 48, "notes": [55, 60, 64, 62]},      # Cadd9 (G3 C4 E4 D4)
    {"root": 43, "notes": [55, 59, 62, 67]},      # G    (G3 B3 D4 G4)
]
ARP = [0, 2, 1, 3, 0, 2, 3, 1, 0, 2, 1, 3, 2, 0, 3, 1]  # 16ths, index into chord notes

L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)

def add(buf, start_s, sig, gain=1.0):
    i0 = int(start_s * SR)
    if i0 >= N or i0 < 0: return
    n = min(len(sig), N - i0)
    buf[i0:i0 + n] += sig[:n] * gain

def add_st(start_s, sig_l, sig_r, gain=1.0):
    add(L, start_s, sig_l, gain); add(R, start_s, sig_r, gain)

def tvec(seconds): return np.arange(int(seconds * SR)) / SR

def onepole_lp(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([a], [1, -(1 - a)], x)

def onepole_hp(x, cutoff): return x - onepole_lp(x, cutoff)

def lp_sweep(x, c0, c1, curve=2.0):
    """One-pole lowpass whose cutoff sweeps c0→c1 over the signal (chunked, state-continuous)."""
    out = np.empty_like(x); chunk = 2400; zi = np.zeros(1); pos = 0
    while pos < len(x):
        f = (pos / len(x)) ** (1 / curve)
        c = c0 + (c1 - c0) * f
        a = 1 - np.exp(-2 * np.pi * c / SR)
        seg, zi = lfilter([a], [1, -(1 - a)], x[pos:pos + chunk], zi=zi)
        out[pos:pos + chunk] = seg; pos += chunk
    return out

def env_adsr(n, a, d, s, r):
    t = np.arange(n) / SR
    e = np.ones(n) * s
    ai = int(a * SR); di = int(d * SR); ri = int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if di: e[ai:ai + di] = np.linspace(1, s, min(di, max(0, n - ai)))[: max(0, min(di, n - ai))]
    if ri and ri < n: e[n - ri:] *= np.linspace(1, 0, ri)
    return e

# soft reverb impulse (exponential noise)
IR_T = tvec(1.1)
IR = rng.standard_normal(len(IR_T)) * np.exp(-IR_T * 4.5) * 0.08
IR = onepole_lp(IR, 5000)

def saw(freq, n, phase=0.0):
    ph = (np.arange(n) * freq / SR + phase) % 1.0
    return 2 * ph - 1

# ---------------------------------------------------------------- voices
def pad(chord, dur, dark=False):
    n = int(dur * SR)
    outl = np.zeros(n); outr = np.zeros(n)
    for k, m in enumerate(chord["notes"]):
        f = hz(m)
        for det, w in ((-0.0035, 0.5), (0.0, 0.7), (0.0035, 0.5)):
            outl += saw(f * (1 + det), n, rng.random()) * w
            outr += saw(f * (1 - det), n, rng.random()) * w
    cutoff = 650 if dark else 1500
    outl = onepole_lp(onepole_lp(outl, cutoff), cutoff * 1.6)
    outr = onepole_lp(onepole_lp(outr, cutoff), cutoff * 1.6)
    e = env_adsr(n, 0.35, 0.4, 0.85, 0.5)
    return outl * e / 8, outr * e / 8

def pluck(freq, dur=0.5):
    n = int(dur * SR); t = tvec(dur)
    x = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 7) + 0.45 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 11)
         + 0.2 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 16))
    x[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return onepole_lp(x, 4200) * 0.55

def bass(freq, dur):
    n = int(dur * SR); t = tvec(dur)
    x = np.sin(2 * np.pi * freq * t) + 0.25 * onepole_lp(saw(freq, n), 260)
    e = env_adsr(n, 0.006, 0.12, 0.7, 0.08)
    return x * e * 0.9

def kick():
    t = tvec(0.5)
    f = 46 + 130 * np.exp(-t * 32)
    ph = np.cumsum(f) / SR
    body = np.sin(2 * np.pi * ph) * np.exp(-t * 8.5)
    click = onepole_hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 350) * 0.35
    return (body + click) * 1.0

def clap():
    t = tvec(0.45)
    x = np.zeros(len(t))
    for off in (0, 0.011, 0.022, 0.03):
        i = int(off * SR)
        x[i:] += rng.standard_normal(len(t) - i) * np.exp(-t[: len(t) - i] * (70 if off < 0.03 else 18))
    x = onepole_hp(onepole_lp(x, 4200), 900)
    return x * 0.33

def hat(open_=False):
    d = 0.32 if open_ else 0.07
    t = tvec(d)
    x = rng.standard_normal(len(t)) * np.exp(-t * (14 if open_ else 75))
    return onepole_hp(onepole_hp(x, 7000), 9000) * (0.22 if open_ else 0.26)

def tick():
    t = tvec(0.05)
    x = rng.standard_normal(len(t)) * np.exp(-t * 180)
    return onepole_hp(onepole_lp(x, 6000), 2500) * 0.35

def impact(big=True):
    t = tvec(2.4)
    f = (90 if big else 70) * np.exp(-t * 2.2) + 32
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.0 if big else 3.5))
    noise = onepole_lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 7) * 0.5
    air = onepole_hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 2.8) * (0.16 if big else 0.08)
    return (boom * (1.0 if big else 0.6) + noise + air)

def riser(dur=2.6):
    t = tvec(dur)
    noise = rng.standard_normal(len(t))
    sw = lp_sweep(noise, 250, 9000, curve=1.6) * (t / dur) ** 2.2 * 0.5
    tone = np.sin(2 * np.pi * np.cumsum(180 + 620 * (t / dur) ** 2) / SR) * (t / dur) ** 3 * 0.12
    return onepole_hp(sw + tone, 150)

# ---------------------------------------------------------------- intro (hook)
intro_len = INTRO_END
tl_, tr_ = pad(CHORDS[0], intro_len + 0.5, dark=True)
fade_in = np.minimum(1, np.arange(len(tl_)) / (1.8 * SR))
add_st(0.0, tl_ * fade_in, tr_ * fade_in, 0.75)
# clock ticks on every beat, slowly getting louder; sub pulse every bar
b = GROOVE_START - BEAT * np.floor(GROOVE_START / BEAT)
t_beat = b
k = 0
while t_beat < INTRO_END - 0.05:
    g = 0.25 + 0.75 * (t_beat / INTRO_END)
    pan = 0.35 if k % 2 == 0 else -0.35
    tk = tick()
    add(L, t_beat, tk, g * (1 - pan) * 0.5); add(R, t_beat, tk, g * (1 + pan) * 0.5)
    if k % 4 == 0:
        sb = bass(hz(33), BEAT * 1.5) * 0.55
        add_st(t_beat, sb, sb, 0.5 + 0.5 * (t_beat / INTRO_END))
    t_beat += BEAT; k += 1
# riser into the reveal
rz = riser(2.8)
add_st(GROOVE_START - 2.8, rz, rz, 0.9)

# ---------------------------------------------------------------- groove
scene_hits = [S[i]["start"] for i in ("myday", "update", "history", "calendar", "team", "config", "mobile")]
bar_i = 0
t = GROOVE_START
kick_times = []
while t < GROOVE_END - 0.01:
    chord = CHORDS[bar_i % 4]
    # pad
    pl, pr = pad(chord, BAR + 0.6)
    add_st(t, pl, pr, 0.9)
    # drums
    for beat in range(4):
        tb = t + beat * BEAT
        if beat in (0, 2):
            add_st(tb, kick(), kick(), 0.95); kick_times.append(tb)
        if beat == 1 and bar_i % 2 == 1:
            tb2 = t + 2.5 * BEAT
            add_st(tb2, kick(), kick(), 0.6); kick_times.append(tb2)
        if beat in (1, 3):
            c = clap()
            add_st(tb, c, c, 0.8)
            add_st(tb, fftconvolve(c, IR)[: len(c) + len(IR)], fftconvolve(c, IR)[: len(c) + len(IR)], 0.9)
        for e8 in (0, 1):
            th = tb + e8 * BEAT / 2 + (0.018 if e8 else 0)      # slight swing on the offbeat
            is_open = (beat in (1, 3)) and e8 == 1 and bar_i % 2 == 0
            h = hat(is_open)
            add(L, th, h, (0.55 if e8 else 1.0) * 0.9 * 0.6); add(R, th, h, (0.55 if e8 else 1.0) * 0.9 * 1.0)
    # bass: 1, 2.5, 3, 4.5 (syncopated)
    for off, dur, g in ((0, 1.2, 1.0), (1.5, 0.45, 0.8), (2, 1.2, 1.0), (3.5, 0.45, 0.8)):
        bs = bass(hz(chord["root"]), BEAT * dur)
        add_st(t + off * BEAT, bs, bs, 0.55 * g)
    # arpeggio pluck, 16ths, alternating pan
    for i16, idx in enumerate(ARP):
        if bar_i == 0 and i16 < 4: continue             # let the impact breathe
        tn = t + i16 * BEAT / 4
        note = chord["notes"][idx] + (12 if i16 % 8 in (3, 6) else 0)
        p = pluck(hz(note))
        pan = 0.6 * np.sin(i16 * 0.9)
        add(L, tn, p, 0.5 * (1 - pan)); add(R, tn, p, 0.5 * (1 + pan))
        wet = fftconvolve(p, IR)[: len(p) + len(IR)]
        add_st(tn, wet, wet, 0.5)
    t += BAR; bar_i += 1

# reveal impact + scene hits (each with a short riser)
add_st(GROOVE_START, impact(True), impact(True), 0.95)
for h in scene_hits:
    rz = riser(1.6) * 0.55
    add_st(h - 1.6, rz, rz, 1.0)
    im = impact(False)
    add_st(h, im, im, 0.55)

# ---------------------------------------------------------------- close
cl_l, cl_r = pad({"root": 45, "notes": [57, 60, 64, 67, 71]}, S["close"]["end"] - GROOVE_END + 1.0)
add_st(GROOVE_END, cl_l, cl_r, 1.0)
im = impact(True)
add_st(GROOVE_END, im, im, 0.6)
# gentle shimmer: high pluck notes on the end card
for i, m in enumerate((76, 79, 83, 88)):
    p = pluck(hz(m), 1.4)
    add_st(S["close"]["vo_start"] + 0.3 + i * 0.42, p, p, 0.28)
    wet = fftconvolve(p, IR)[: len(p) + len(IR)]
    add_st(S["close"]["vo_start"] + 0.3 + i * 0.42, wet, wet, 0.6)

# ---------------------------------------------------------------- sidechain pump on kicks
sc = np.ones(N)
tt = np.arange(int(0.45 * SR)) / SR
dip = 1 - 0.55 * np.exp(-tt * 9)
for kt in kick_times:
    i0 = int(kt * SR); n = min(len(dip), N - i0)
    sc[i0:i0 + n] = np.minimum(sc[i0:i0 + n], dip[:n])
# apply pump only to the sustained layers: approximate by pumping the whole mix lightly
L *= 0.4 + 0.6 * sc
R *= 0.4 + 0.6 * sc

# master: trim, fade, soft clip, normalize
L = L[: int(DUR * SR)]; R = R[: int(DUR * SR)]
fade = np.ones(len(L)); fo = int(2.5 * SR); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.4) / np.tanh(1.4); R = np.tanh(R / peak * 1.4) / np.tanh(1.4)
music = np.stack([L, R], axis=1) * 0.7
wavfile.write(os.path.join(WORK, "music.wav"), SR, (music * 32767).astype(np.int16))
print("music.wav", round(len(L) / SR, 2), "s")

# ---------------------------------------------------------------- voiceover track + ducking
vo = np.zeros(len(L))
for s in tl["scenes"]:
    sr_, data = wavfile.read(os.path.join(WORK, "vo", f"{s['id']}.wav"))
    assert sr_ == SR
    x = data.astype(np.float64) / 32768.0
    i0 = int(s["vo_start"] * SR); n = min(len(x), len(vo) - i0)
    vo[i0:i0 + n] += x[:n]
vo *= 0.95 / max(np.abs(vo).max(), 1e-6)
vo = onepole_hp(vo, 80)

env = np.abs(vo)
win = int(0.08 * SR)
env = np.convolve(env, np.ones(win) / win, mode="same")
env = np.roll(env, -int(0.14 * SR))                       # look-ahead
# attack/release smoothing
a_att = 1 - np.exp(-1 / (0.05 * SR)); a_rel = 1 - np.exp(-1 / (0.45 * SR))
sm = np.empty_like(env); y = 0.0
for i in range(len(env)):
    a = a_att if env[i] > y else a_rel
    y += a * (env[i] - y); sm[i] = y
duck = 1 - 0.68 * np.minimum(1.0, sm / 0.04)               # ≈ −10 dB under speech
mix = music * duck[:, None] + np.stack([vo, vo], axis=1) * 0.8
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
wavfile.write(os.path.join(WORK, "mix.wav"), SR, (mix * 32767).astype(np.int16))
print("mix.wav", round(len(mix) / SR, 2), "s  peak", round(float(np.abs(mix).max()), 3))
