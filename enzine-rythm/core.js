export const WINDOWS={perfect:.055,great:.105,good:.16,relaxed:.24};
export const DEFAULTS={keys:['KeyD','KeyF','KeyJ','KeyK'],tapKey:'Space',offset:0,volume:.65,drumVolume:1.35,sfx:true};
export function validateChart(c){
  if(!c||c.version!==1||typeof c.title!=='string'||!Number.isFinite(c.clipStart)||c.clipStart<0||!Number.isFinite(c.duration)||c.duration<=0||c.duration>900)throw Error('曲情報が不正です');
  if(typeof c.audio!=='string'||! /^(?:\.\.\/)?assets\/bgm\/[\w.-]+\.mp3$/.test(c.audio))throw Error('音源は assets/bgm 内のMP3を指定してください');
  if(c.stems){
    if(!Array.isArray(c.stems)||c.stems.length<2||c.stems.length>8||new Set(c.stems.map(p=>p.id)).size!==c.stems.length)throw Error('パート構成が不正です');
    for(const p of c.stems)if(!/^[a-z][a-z0-9-]*$/.test(p.id)||!['backing','playable'].includes(p.role)||! /^(?:\.\.\/)?assets\/bgm\/[\w.-]+\.mp3$/.test(p.audio))throw Error('パート音源を確認してください');
    if(!c.stems.some(p=>p.role==='backing')||!c.stems.some(p=>p.role==='playable'))throw Error('伴奏と演奏パートが必要です');
    for(const ns of Object.values(c.charts||{}))for(const n of ns)if(!c.stems.some(p=>p.id===n.part&&p.role==='playable')||!Number.isFinite(n.duration)||n.duration<=0||n.time+n.duration>c.duration+.002)throw Error('ノーツのパート・発音時間を確認してください');
  }
  for(const level of ['easy','normal'])if(!Array.isArray(c.charts?.[level])||!c.charts[level].length)throw Error('やさしい・ふつう譜面が必要です');
  for(const [level,notes] of Object.entries(c.charts)){if(!['easy','normal','hard'].includes(level)||!Array.isArray(notes)||!notes.length||notes.length>10000)throw Error('譜面が空、またはノーツが多すぎます');let prev=-1;for(const n of notes){if(!Number.isFinite(n.time)||n.time<0||n.time>=c.duration||n.time<prev||!Number.isInteger(n.lane)||n.lane<0||n.lane>3)throw Error('ノーツ時刻・レーンを確認してください');prev=n.time;}}
  return c;
}
export function nearestNote(notes,lane,time,window=WINDOWS.good){let selected=null,delta=Infinity;for(const n of notes){if(n.done||n.lane!==lane)continue;const d=Math.abs(n.time-time);if(d<delta){delta=d;selected=n;}}return delta<=window?{note:selected,delta}:null;}
export function grade(delta){return delta<=WINDOWS.perfect?'perfect':delta<=WINDOWS.great?'great':'good';}
export function playableNotes(chart,level,mode){let last=-1;const notes=chart.charts[level].filter(n=>{if(mode==='tap'&&n.time-last<.18)return false;last=n.time;return true;}).map(n=>({...n,lane:mode==='tap'?0:n.lane,done:false}));
  // A successful earlier note must never cover the next missed note of that part.
  if(chart.stems)for(let i=0;i<notes.length;i++){const n=notes[i],next=notes.slice(i+1).find(m=>m.part===n.part);n.duration=Math.min(n.duration,chart.duration-n.time,next?Math.max(.001,next.time-n.time):Infinity);}
  return notes;
}
export function accuracy(stats,total){return Math.max(0,(stats.perfect+stats.great*.75+stats.good*.4-stats.empty*.2)/Math.max(1,total)*100);}
export function keyLabel(code){return code==='Space'?'SPACE':code.replace(/^(Key|Digit)/,'').replace('Arrow','');}
