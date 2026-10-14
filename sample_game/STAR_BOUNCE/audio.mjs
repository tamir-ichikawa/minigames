// Original short sine chimes for this prototype; no audio reused from the old game.
import { writeFile, mkdir } from 'node:fs/promises';
import presets from './swing-presets.json' with {type:'json'};
export async function writeChimes(directory) {
  await mkdir(directory,{recursive:true});
  const tones={return:[660,880],goal:[523,659,784],miss:[330,247],bonus:[784,988,1175]};
  for(const [name,notes] of Object.entries(tones)) {
    const rate=22050,step=.085,frames=Math.ceil(notes.length*step*rate),buffer=Buffer.alloc(44+frames*2);
    buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
    buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
    buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);
    buffer.write('data',36);buffer.writeUInt32LE(frames*2,40);
    for(let i=0;i<frames;i++) {const time=i/rate,index=Math.min(notes.length-1,Math.floor(time/step)),local=time-index*step,envelope=Math.sin(Math.PI*local/step)**2;buffer.writeInt16LE(Math.round(Math.sin(2*Math.PI*notes[index]*local)*envelope*9000),44+i*2);}
    await writeFile(new URL(`chime-${name}.wav`,directory),buffer);
  }
}

// A short independently synthesized energy-blade sweep. No sampled film/game audio.
export async function writeSwings(directory){
  const rate=22050;
  await mkdir(directory,{recursive:true});
  for(const preset of presets)for(const side of ['good','dark']){
    const dark=side==='dark',original=preset.id==='original',duration=original?(dark?.29:.25):preset.duration,frames=Math.ceil(rate*duration),b=Buffer.alloc(44+frames*2);
    b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);
    let phase=0,filtered=0,seed=7391;
    for(let i=0;i<frames;i++){
      const t=i/frames,frequency=original?(dark?95:135)+Math.sin(Math.PI*t)*220*(1-t)+65*(1-t):(preset.base+Math.sin(Math.PI*t)*preset.sweep*(1-t)+20*(1-t))*(dark?.82:1);
      phase+=2*Math.PI*frequency/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const noise=seed/4294967296*2-1;filtered+=.12*(noise-filtered);
      const envelope=Math.min(1,t/.045)*Math.sin(Math.PI*t)**1.35;
      const tone=original?Math.sin(phase)*.53+Math.sin(phase*2.01)*.14+Math.sin(phase*(dark?3:4))*(dark?.18:.07)+filtered*.45:Math.sin(phase)*.65+Math.sin(phase*2)*preset.harmonic+filtered*preset.air;
      b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,tone*envelope)) * 23500),44+i*2);
    }
    await writeFile(new URL(`swing-${preset.id}-${side}.wav`,directory),b);
  }
}
