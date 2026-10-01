// Original short sine/triangle chimes. Re-run to reproduce the four game assets.
import { writeFile } from 'node:fs/promises';
const sampleRate = 22050;
const tones = {
  return: { notes: [740, 988], duration: .11 },
  goal: { notes: [523, 659, 784, 1047], duration: .32 },
  miss: { notes: [392, 330, 262], duration: .27 },
  bonus: { notes: [784, 988, 1175, 1568], duration: .30 }
};
for (const [name, {notes, duration}] of Object.entries(tones)) {
  const samples = Math.ceil(sampleRate * duration), wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  let phase = 0;
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate, note = Math.min(notes.length - 1, Math.floor(t / duration * notes.length));
    phase += 2 * Math.PI * notes[note] / sampleRate;
    const local = (t / duration * notes.length) % 1;
    const envelope = Math.min(1, local * 18) * Math.pow(1 - local, .7) * Math.min(1, (duration - t) * 100);
    wav.writeInt16LE(Math.round((Math.sin(phase) + .12 * Math.sin(phase * 2)) * envelope * 10000), 44 + i * 2);
  }
  await writeFile(new URL(`../games/pong/assets/${name}.wav`, import.meta.url), wav);
}
