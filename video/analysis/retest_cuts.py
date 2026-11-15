"""After a render: do the cuts sit on the music's beats in the file people will actually watch?

Fits the kick grid of the rendered soundtrack (after the drums enter) and reports how far each cut
frame is from the nearest beat.

    uv run --with librosa --with scipy --python 3.11 analysis/retest_cuts.py <render.wav> name:frame ...
"""
import sys
import numpy as np
import librosa
from scipy.signal import butter, sosfilt

FPS = 30
y, sr = librosa.load(sys.argv[1], sr=None, mono=True)
sos = butter(4, [40, 200], btype="band", fs=sr, output="sos")
low = np.abs(sosfilt(sos, y))
w = int(sr * 0.008)
env = np.convolve(low, np.ones(w) / w, mode="same")
T = 0.48389
# kick attacks in the drummed section: steepest rise of the low band near each expected beat
d = np.diff(env, prepend=env[0])
best = None
for phase in np.arange(0, T, 0.001):
    ts = np.arange(16.3 + ((phase - 16.3) % T), 26.5, T)
    s = sum(d[int(t * sr) - int(0.004 * sr): int(t * sr) + int(0.004 * sr)].max() for t in ts)
    if best is None or s > best[0]:
        best = (s, phase)
phase = best[1]
print(f"kick grid in the render: t = {phase:.4f} + n x {T} s")
worst = 0
for spec in sys.argv[2:]:
    name, frame = spec.split(":")
    t = float(frame) / FPS
    n = round((t - phase) / T)
    err = (t - (phase + n * T)) * FPS
    worst = max(worst, abs(err))
    print(f"  {name:10s} frame {int(frame):4d}  nearest beat {n:3d}  error {err:+.2f} f")
print(f"worst {worst:.2f} f (pass <= 3, ideal <= 1.5)")
