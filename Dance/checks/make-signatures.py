"""Regenerate sync signatures from canonical 32 kHz, mono, PCM16 WAVs.
Run from repo root after afconvert; writes only sync metadata, preserving charts.
Also writes the optional coarse envelope used by tests/dance-preview.mjs.
"""
import json
from pathlib import Path
import wave
import numpy as np

path = Path('Dance/songs.json')
songs = json.loads(path.read_text())
reference = {}
for song in songs:
    with wave.open('/tmp/dance-' + song['id'] + '.wav') as wav:
        assert wav.getsampwidth() == 2 and wav.getnchannels() == 1
        rate = wav.getframerate()
        data = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(float) / 32768
    power = np.concatenate([[0], np.cumsum(data * data)])
    envelope = []
    for i in range(4000):
        a = round((12 + i * .001) * rate)
        b = round((12 + i * .001 + .005) * rate)
        envelope.append(round(float(np.sqrt((power[b] - power[a]) / (b - a))), 6))
    song['sync'] = {'start': 12, 'step': .001, 'window': .005, 'envelope': envelope}
    hop = round(rate * .005)
    frames = data[:len(data) // hop * hop].reshape(-1, hop)
    reference[song['id']] = np.round(np.sqrt(np.mean(frames ** 2, axis=1)), 6).tolist()
path.write_text(json.dumps(songs, ensure_ascii=False, indent=2) + '\n')
Path('.test-output').mkdir(exist_ok=True)
Path('.test-output/dance-envelope.json').write_text(json.dumps(reference, separators=(',', ':')))
