// Backing stays on the song clock. Accepted drum slices start at the input time.
export class StemPlayer {
  constructor(context,destination){this.context=context;this.destination=destination;this.parts=new Map();this.voices=new Set();this.drumVolume=1.35;}
  setDrumVolume(value){this.drumVolume=Math.max(0,Math.min(4,Number(value)||0));for(const p of this.parts.values())if(p.role==='playable'&&p.level)p.level.gain.setTargetAtTime(this.drumVolume*(p.gain||1),this.context.currentTime,.01);}
  async load(chart){
    this.stop();this.parts.clear();
    for(const spec of chart.stems||[{id:'mix',audio:chart.audio,role:'backing'}]){
      const response=await fetch(spec.audio);if(!response.ok)throw Error('音源が見つかりません: '+spec.audio);
      const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
      if(chart.clipStart+chart.duration>buffer.duration+.02)throw Error('譜面が音源の長さを超えています');
      this.parts.set(spec.id,{...spec,buffer});
    }
    const lengths=[...this.parts.values()].map(p=>p.buffer.duration);
    if(chart.stems&&Math.max(...lengths)-Math.min(...lengths)>.025)throw Error('パート音源の長さが一致しません');
  }
  start(chart,when){
    this.stop();this.startAt=when;this.clipStart=chart.clipStart;this.endAt=when+chart.duration;
    for(const p of this.parts.values()){
      p.level=this.context.createGain();p.level.gain.value=p.role==='playable'?this.drumVolume*(p.gain||1):1;p.level.connect(this.destination);
      if(p.role==='backing'){p.source=this.context.createBufferSource();p.source.buffer=p.buffer;p.source.connect(p.level);p.source.start(when,chart.clipStart,chart.duration);}
    }
  }
  hit(note){
    const p=this.parts.get(note.part);if(!p?.level||p.role!=='playable')return;
    const now=this.context.currentTime,offset=this.clipStart+note.time;
    const length=Math.min(note.duration,p.buffer.duration-offset,this.endAt-now);
    if(length<=0)return;
    for(const v of this.voices)if(v.id===note.part&&v.end>now){
      const value=voiceLevel(v,now);v.fade.gain.cancelScheduledValues(now);v.fade.gain.setValueAtTime(value,now);v.fade.gain.linearRampToValueAtTime(0,now+.004);v.source.stop(now+.004);v.end=now+.004;
    }
    const source=this.context.createBufferSource(),fade=this.context.createGain();source.buffer=p.buffer;source.connect(fade);fade.connect(p.level);
    const ramp=Math.min(.003,length/3),voice={id:note.part,source,fade,start:now,end:now+length,ramp};
    fade.gain.setValueAtTime(0,now);fade.gain.linearRampToValueAtTime(1,now+ramp);fade.gain.setValueAtTime(1,now+length-ramp);fade.gain.linearRampToValueAtTime(0,now+length);
    this.voices.add(voice);source.onended=()=>{source.disconnect();fade.disconnect();this.voices.delete(voice);};source.start(now,offset,length);
  }
  audible(id){const p=this.parts.get(id);return p?.role==='backing'||(this.drumVolume>0&&[...this.voices].some(v=>v.id===id&&v.end>this.context.currentTime));}
  stop(){for(const v of this.voices){try{v.source.stop();}catch{}v.source.disconnect();v.fade.disconnect();}this.voices.clear();for(const p of this.parts.values()){if(p.source){try{p.source.stop();}catch{}p.source.disconnect();p.source=null;}p.level?.disconnect();p.level=null;}}
}
function voiceLevel(v,time){return Math.max(0,Math.min(1,(time-v.start)/v.ramp,(v.end-time)/v.ramp));}
