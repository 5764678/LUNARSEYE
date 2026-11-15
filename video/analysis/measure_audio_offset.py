"""Measure the render pipeline's audio delay: where sharp effects really land in a rendered file
versus where the cue table put them.

    uv run --with librosa --with scipy --python 3.11 analysis/measure_audio_offset.py <render.wav> <src.mp3>:<start frame> ...
"""
import sys
import numpy as np
import librosa
from scipy.signal import correlate

FPS = 30
out, sr = librosa.load(sys.argv[1], sr=None, mono=True)
res = []
for spec in sys.argv[2:]:
    src, start = spec.rsplit(":", 1)
    probe, _ = librosa.load(src, sr=sr, mono=True)
    probe = probe[: int(sr * 0.25)]
    a = int((float(start) / FPS - 0.2) * sr)
    win = out[a : a + int(sr * 0.9)]
    c = correlate(win, probe, mode="valid")
    lag = (a + int(np.argmax(np.abs(c)))) / sr - float(start) / FPS
    res.append(lag)
    print(f"{src.split('/')[-1]:26s} designed {float(start):6.1f}f  landed {lag * FPS:+.2f}f ({lag * 1000:+.1f} ms)")
print(f"mean {np.mean(res) * 1000:+.1f} ms = {np.mean(res) * FPS:+.2f}f, spread {np.ptp(res) * 1000:.1f} ms")
