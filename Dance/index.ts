import Phaser from 'phaser';
import type { GameContext, GameModule, Score, Settings } from '../src/core/types';
import songsData from './songs.json';
import { DanceAudio } from './audio';
import { alignDecodedAudio } from './alignment';
import { DanceScene } from './scene';
import { DIFFICULTIES, RhythmRound, layout, rank, type Difficulty, type Song } from './rhythm';
import { styles } from './style';
const SONGS: Song[] = songsData;
const KEYS: Record<string,number>={ArrowLeft:0,ArrowDown:1,ArrowUp:2,ArrowRight:3,KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
const arrows=['←','↓','↑','→'];
type Phase='title'|'loading'|'playing'|'result';
export class DanceController implements GameModule {
  context!: GameContext;
  root!: HTMLElement; surface!: HTMLElement; viewport!: HTMLElement;
  game?: Phaser.Game; audio?: DanceAudio; observer?: ResizeObserver;
  phase: Phase='title'; round?: RhythmRound; duration=1;
  songIndex=0; difficulty: Difficulty='normal'; reverse=false; calibration=0;
  geometry=layout(520,800); localPaused=false; hostPaused=false;
  flashes=[-999,-999,-999,-999]; keyboard=new Set<string>(); pointers=new Map<number,number>();
  abort=new AbortController(); ticket=0; destroyed=false; audioQueue=Promise.resolve(); audioTransition=0; lastHud='';
  constructor(private managed=false) {}
  get song(){return SONGS[this.songIndex];}
  get paused(){return this.localPaused||this.hostPaused;}
  el<T extends HTMLElement=HTMLElement>(selector:string){return this.root.querySelector<T>(selector)!;}
  bestKey(){return `dance:best:v1:${this.song.id}:${this.difficulty}`;}
  best(){return this.context.platform.storage.read(this.bestKey(),0);}
  async init(context:GameContext){
    this.context=context;
    const saved=context.platform.storage.read<{song?:string;difficulty?:Difficulty;reverse?:boolean;calibration?:number}>('dance:settings:v1',{});
    this.songIndex=Math.max(0,SONGS.findIndex(s=>s.id===saved.song));
    if(saved.difficulty&&DIFFICULTIES[saved.difficulty])this.difficulty=saved.difficulty;
    this.reverse=saved.reverse===true;this.calibration=Number.isFinite(saved.calibration)?Math.max(-300,Math.min(300,saved.calibration!)):0;
    this.root=document.createElement('section');this.root.className='dance-shell';this.root.setAttribute('aria-label','DDE ダンスダンスエボリューション');
    this.root.innerHTML=`<style>${styles}</style><div class="dance-viewport"><div class="dance-surface"><div class="dance-canvas"></div><div class="dance-ui">
      <div class="dance-top"><div class="dance-brand">D<span>D</span>E <span style="font-size:10px;letter-spacing:2px;color:#b09bc6">DANCE</span></div><div class="dance-tools">
      <button data-action="pause" hidden>一時停止</button><button data-action="mute" aria-label="消音する">音 ON</button><button data-action="fullscreen" aria-label="全画面表示">全画面</button></div></div>
      <div class="dance-menu"><div class="dance-hero"><div class="dance-eyebrow">FOUR LANES. YOUR RHYTHM.</div><div class="dance-logo">DDE</div><div class="dance-subtitle">DANCE DANCE EVOLUTION</div><p class="dance-copy">音にのって、矢印を重ねよう。</p><div class="dance-keys"><b>PC</b>　← ↓ ↑ → または D F J K<br><b>スマホ</b>　4つのレーンをタップ・2本同時もOK<br><span style="color:#ff89c7">● 表拍</span>　<span style="color:#7fd5ff">● 裏拍</span></div><div class="dance-credit">ORIGINAL GAME BY 佐藤さん</div></div>
      <div class="dance-setup"><div><p class="dance-label">01 / 曲をえらぼう</p><div class="dance-row">${SONGS.map((s,i)=>`<button class="dance-choice" data-song="${i}">${s.title}<small>${s.note} · BPM ${Math.round(s.bpm)}<br>${Math.floor(s.dur/60)}:${String(Math.floor(s.dur%60)).padStart(2,'0')}</small></button>`).join('')}</div></div>
      <div><p class="dance-label">02 / 流れる向き</p><div class="dance-row"><button class="dance-choice" data-direction="normal">ノーマル<small>下から上 ↑</small></button><button class="dance-choice" data-direction="reverse">リバース<small>上から下 ↓</small></button></div></div>
      <div><p class="dance-label">03 / むずかしさ</p><div class="dance-row dance-diffs">${Object.entries(DIFFICULTIES).map(([k,d])=>`<button class="dance-choice" data-difficulty="${k}">${d.name}<small data-count="${k}"></small></button>`).join('')}</div></div></div>
      <div class="dance-bottom"><div class="dance-cal"><label for="dance-cal">タイミング調整</label><input id="dance-cal" type="range" min="-300" max="300" step="5" value="${this.calibration}"><output for="dance-cal"></output></div><p class="dance-note">音が遅れて聞こえるときは ＋ 側へ。設定は保存されます。</p><div class="dance-best"></div><button class="dance-start" data-action="start">スタート　→</button><p class="dance-status" role="status">矢印がワクに重なる瞬間に押そう。</p></div></div>
      <div class="dance-live" hidden><div class="dance-live-top"><div class="dance-live-title"></div><div class="dance-score">0</div></div><div class="dance-live-stats"></div><div class="dance-input">${arrows.map((a,i)=>`<button data-lane="${i}" aria-label="${a} レーン"></button>`).join('')}</div><div class="dance-live-hint">← D　 /　 ↓ F　 /　 ↑ J　 /　 → K　 •　レーンをタップ</div></div>
      <div class="dance-overlay" data-overlay="pause" hidden><p>TAKE A BREATH</p><h2>ひと休み</h2><p>曲と譜面をいっしょに停止しています。</p><button class="dance-start" data-action="resume">つづける　→</button><button class="dance-small" data-action="title">曲をえらびなおす</button></div>
      <div class="dance-overlay" data-overlay="result" hidden><p data-result="song"></p><div class="dance-rank"></div><div class="dance-result-score"></div><p data-result="combo"></p><div class="dance-counts">${['PERFECT','GREAT','GOOD','MISS'].map(k=>`<span>${k}<b data-result="${k}">0</b></span>`).join('')}</div><p class="dance-feedback" data-result="record"></p><button class="dance-start" data-action="start">もう一回　→</button><button class="dance-small" data-action="title">曲をえらびなおす</button></div>
      </div></div></div>`;
    context.container.append(this.root);this.surface=this.el('.dance-surface');this.viewport=this.el('.dance-viewport');
    const options={signal:this.abort.signal};
    this.root.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
      const a=button.dataset.action;
      if(a==='start'){void this.begin();return;}
      if(a==='pause'){this.localPaused=true;void this.syncPause();return;}
      if(a==='resume'){this.localPaused=false;void this.syncPause();return;}
      if(a==='title'){this.toTitle();return;}
      if(a==='mute'){this.setSettings({muted:!this.context.settings.muted});return;}
      if(a==='fullscreen'){void this.fullscreen();return;}
      if(this.phase!=='title')return;
      if(button.dataset.song!==undefined)this.songIndex=+button.dataset.song;
      if(button.dataset.direction)this.reverse=button.dataset.direction==='reverse';
      if(button.dataset.difficulty)this.difficulty=button.dataset.difficulty as Difficulty;
      this.save();this.selection();
    },options);
    this.el<HTMLInputElement>('#dance-cal').addEventListener('input',e=>{this.calibration=+(e.target as HTMLInputElement).value;this.save();this.selection();},options);
    window.addEventListener('keydown',e=>{
      if((e.target as HTMLElement)?.closest('input,select,textarea'))return;
      if(e.code==='Escape'&&!this.managed&&this.phase==='playing'){e.preventDefault();this.localPaused=!this.localPaused;void this.syncPause();return;}
      const lane=KEYS[e.code];if(lane===undefined||this.phase!=='playing')return;
      e.preventDefault();if(e.repeat||this.keyboard.has(e.code)||this.paused)return;
      this.keyboard.add(e.code);this.press(lane,e.timeStamp);
    },options);
    window.addEventListener('keyup',e=>this.keyboard.delete(e.code),options);
    this.el('.dance-input').addEventListener('pointerdown',e=>{
      const target=(e.target as HTMLElement).closest<HTMLElement>('[data-lane]');if(!target||this.paused||this.phase!=='playing')return;
      e.preventDefault();const lane=+target.dataset.lane!;target.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,lane);this.press(lane,e.timeStamp);
    },options);
    const release=(e:PointerEvent)=>this.pointers.delete(e.pointerId);
    window.addEventListener('pointerup',release,options);window.addEventListener('pointercancel',release,options);
    this.root.addEventListener('lostpointercapture',release,options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&['playing','loading'].includes(this.phase)){this.localPaused=true;void this.syncPause();}},options);
    window.addEventListener('blur',()=>{this.keyboard.clear();this.pointers.clear();if(['playing','loading'].includes(this.phase)){this.localPaused=true;void this.syncPause();}},options);
    document.addEventListener('fullscreenchange',()=>{
      const active=document.fullscreenElement===this.root;this.root.dataset.fullscreen=String(active);
      const button=this.el('[data-action=fullscreen]');button.textContent=active?'全画面を終了':'全画面';button.setAttribute('aria-label',active?'全画面を終了':'全画面表示');
    },options);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.viewport);this.resize();this.selection();this.renderPhase();
    await new Promise<void>((resolve,reject)=>{
      const timeout=window.setTimeout(()=>reject(new Error('ゲームの初期化に時間がかかっています。再読み込みしてください。')),12000);
      this.game=new Phaser.Game({type:Phaser.AUTO,parent:this.el('.dance-canvas'),width:this.geometry.width,height:this.geometry.height,
        backgroundColor:'#10091d',scene:new DanceScene(this,()=>{clearTimeout(timeout);resolve();}),
        scale:{mode:Phaser.Scale.NONE},audio:{noAudio:true},input:{keyboard:false,mouse:false,touch:false},render:{antialias:true},fps:{target:60}});
    });
  }
  resize(){
    const {width,height}=this.viewport.getBoundingClientRect();const next=layout(width,height),changed=next.width!==this.geometry.width;
    this.geometry=next;this.surface.classList.toggle('dance-wide',next.wide);
    Object.assign(this.surface.style,{width:`${next.width}px`,height:`${next.height}px`,left:`${(width-next.width*next.scale)/2}px`,top:`${(height-next.height*next.scale)/2}px`,transform:`scale(${next.scale})`});
    if(changed)this.game?.scale.resize(next.width,next.height);
  }
  save(){this.context.platform.storage.write('dance:settings:v1',{song:this.song.id,difficulty:this.difficulty,reverse:this.reverse,calibration:this.calibration});}
  selection(){
    this.root.querySelectorAll<HTMLElement>('[data-song]').forEach(e=>e.setAttribute('aria-pressed',String(Number(e.dataset.song) === this.songIndex)));
    this.root.querySelectorAll<HTMLElement>('[data-direction]').forEach(e=>e.setAttribute('aria-pressed',String((e.dataset.direction==='reverse')===this.reverse)));
    this.root.querySelectorAll<HTMLElement>('[data-difficulty]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.difficulty===this.difficulty)));
    Object.keys(DIFFICULTIES).forEach(d=>this.el(`[data-count="${d}"]`).textContent=`${this.song.charts[d as Difficulty].length} notes`);
    this.el('output').textContent=`${this.calibration>0?'+':''}${this.calibration} ms`;
    this.el('.dance-best').textContent=this.best()?`BEST　${this.best().toLocaleString()} pt`:'めざせ、フルコンボ。';
    this.setSettings(this.context.settings);
  }
  renderPhase(){
    this.root.dataset.phase=this.phase;this.root.dataset.paused=String(this.paused);
    this.el('.dance-menu').hidden=!['title','loading'].includes(this.phase);
    this.el('.dance-live').hidden=this.phase!=='playing';
    this.el('[data-overlay=pause]').hidden=!this.localPaused||this.phase!=='playing';
    this.el('[data-overlay=result]').hidden=this.phase!=='result';
    this.el('[data-action=pause]').hidden=this.phase!=='playing'||this.localPaused;
    this.root.querySelectorAll<HTMLButtonElement>('[data-song],[data-direction],[data-difficulty],[data-action=start]').forEach(b=>b.disabled=this.phase==='loading'||this.hostPaused);
    this.el<HTMLInputElement>('#dance-cal').disabled=this.phase==='loading';
  }
  async begin(){
    if(this.phase==='loading'||this.hostPaused||this.destroyed)return;
    const ticket=++this.ticket;this.localPaused=false;this.phase='loading';this.renderPhase();this.el('.dance-status').textContent='曲を準備しています…';
    try{
      this.audio??=new DanceAudio();this.audio.mute(this.context.settings.muted);
      // Resume is invoked inside the user gesture, before waiting for download/decode.
      const unlocked=this.audio.unlock(),bufferPromise=this.audio.load(this.context.assetUrl(this.song.audio));
      const [,buffer]=await Promise.all([unlocked,bufferPromise]);
      if(this.destroyed||ticket!==this.ticket)return;
      this.audio.chartShift=alignDecodedAudio(buffer,this.song.sync).shift;
      this.round=new RhythmRound(this.song.charts[this.difficulty]);this.duration=buffer.duration-this.audio.chartShift;this.flashes.fill(-999);this.keyboard.clear();this.pointers.clear();this.lastHud='';
      this.audio.play(buffer);this.phase='playing';this.context.reportScore(null);
      this.el('.dance-live-title').innerHTML=`${this.song.title}<small>${DIFFICULTIES[this.difficulty].name}<br>${this.reverse?'上から下 ↓':'下から上 ↑'} · BPM ${Math.round(this.song.bpm)}</small>`;
      this.renderPhase();if(this.paused)await this.syncPause();
    }catch(error){
      if(ticket!==this.ticket||this.destroyed)return;
      this.phase='title';this.renderPhase();this.el('.dance-status').textContent=`${error instanceof Error?error.message:'音声を読み込めませんでした。'} 再試行できます。`;
    }
  }
  held(lane:number){return [...this.keyboard].some(k=>KEYS[k]===lane)||[...this.pointers.values()].includes(lane);}
  press(lane:number,eventStamp:number){
    if(this.phase!=='playing'||this.paused||!this.audio||!this.round)return;
    const time=this.audio.time(this.calibration,eventStamp);this.flashes[lane]=time;
    this.round.press(lane,time);
  }
  tick(){
    if(this.phase!=='playing'||!this.round||!this.audio||this.paused||this.audioTransition>0)return;
    if(this.audio.context.state!=='running'){this.localPaused=true;void this.syncPause();return;}
    const time=this.audio.time(this.calibration);this.round.advance(time);
    const hud=`${this.round.score}:${this.round.judged}`;
    if(hud!==this.lastHud){this.lastHud=hud;this.el('.dance-score').textContent=this.round.score.toLocaleString();this.el('.dance-live-stats').textContent=`${this.round.judged} / ${this.round.notes.length} notes`;
      this.root.dataset.judged=String(this.round.judged);this.root.dataset.score=String(this.round.score);}
    if(time>this.duration+.25)this.finish();
  }
  finish(){
    if(!this.round)return;
    this.round.advance(Infinity);this.phase='result';this.audio?.stop();this.keyboard.clear();this.pointers.clear();
    const score=this.round.score,previous=this.best();if(score>previous)this.context.platform.storage.write(this.bestKey(),score);
    this.el('.dance-rank').textContent=rank(score);this.el('.dance-result-score').textContent=`${score.toLocaleString()} pt`;
    this.el('[data-result=song]').textContent=`${this.song.title} / ${DIFFICULTIES[this.difficulty].name}`;
    this.el('[data-result=combo]').textContent=`MAX COMBO ${this.round.maxCombo}${this.round.counts.MISS===0?'　FULL COMBO!':''}`;
    Object.entries(this.round.counts).forEach(([k,v])=>this.el(`[data-result="${k}"]`).textContent=String(v));
    this.el('[data-result=record]').textContent=score>previous?'NEW BEST! 自己ベスト更新':`BEST ${previous.toLocaleString()} pt`;
    this.context.reportScore(this.getScore());this.renderPhase();
  }
  syncPause(){
    this.keyboard.clear();this.pointers.clear();this.renderPhase();this.audioTransition++;
    // A render can run while AudioContext.resume() is pending; do not auto-pause it.
    this.audioQueue=this.audioQueue.then(async()=>{
      if(!this.audio||this.destroyed)return;
      try{if(this.paused)await this.audio.pause();else await this.audio.resume();}
      catch{this.localPaused=true;this.renderPhase();}
    }).finally(()=>{this.audioTransition--;});return this.audioQueue;
  }
  toTitle(){++this.ticket;this.audio?.stop();this.localPaused=false;this.phase='title';this.round=undefined;this.keyboard.clear();this.pointers.clear();this.context.reportScore(null);
    this.el('.dance-status').textContent='矢印がワクに重なる瞬間に押そう。';this.selection();this.renderPhase();}
  start(){}
  pause(){this.hostPaused=true;return this.syncPause();}
  resume(){this.hostPaused=false;return this.syncPause();}
  reset(){this.toTitle();}
  getScore():Score|null{return this.round?{value:this.round.score,unit:'点',direction:'higher'}:null;}
  setSettings(settings:Settings){this.context.settings=settings;this.audio?.mute(settings.muted);const b=this.el('[data-action=mute]');b.textContent=settings.muted?'音 OFF':'音 ON';b.setAttribute('aria-label',settings.muted?'音を出す':'消音する');}
  async fullscreen(){
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(this.root.requestFullscreen)await this.root.requestFullscreen();else this.el('.dance-status').textContent='このブラウザーでは、今の表示領域いっぱいに表示しています。';}
    catch{this.el('.dance-status').textContent='全画面に切り替えられませんでした。今の画面で遊べます。';}
  }
  async destroy(){
    this.destroyed=true;++this.ticket;this.abort.abort();this.observer?.disconnect();await this.audioQueue;await this.audio?.destroy();
    const game=this.game;this.game=undefined;
    if(game)await new Promise<void>(resolve=>{game.events.once(Phaser.Core.Events.DESTROY,resolve);game.loop.wake();game.destroy(true);});
    this.root.remove();
  }
}
export const createGame=(options:{managed?:boolean}={})=>new DanceController(options.managed);
