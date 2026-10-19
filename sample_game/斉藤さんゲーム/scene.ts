import Phaser from 'phaser';
import type { GameContext, Score } from '../../src/core/types';
import { Adventure, LEVELS, WIDTH, HEIGHT, TOTAL_MEDALS, type Point } from './model';
import { paintMap } from './art';
import { WalkCycle, pose, registerWalkFrames, SHEET_DIRECTIONS } from './animation';

export const ASSET_ROOT='sample_game/maro-adventure/';
const clock=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const paw='<span aria-hidden="true">✦</span>';
type Best={seconds:number;misses:number;medals:number};
export class MaroScene extends Phaser.Scene {
  model=new Adventure(); paused=false; hostPaused=false;
  private map!:Phaser.GameObjects.Image;
  private maro!:Phaser.GameObjects.Sprite;
  private maroWalk=new WalkCycle(); private dogWalk=new WalkCycle();
  private comic!:Phaser.GameObjects.Graphics; private bubble!:Phaser.GameObjects.Text;
  private shadow!:Phaser.GameObjects.Ellipse;
  private dog!:Phaser.GameObjects.Sprite;
  private dogShadow!:Phaser.GameObjects.Ellipse;
  private marks!:Phaser.GameObjects.Graphics;
  private fireflies!:Phaser.GameObjects.Graphics;
  private keys=new Set<string>();
  private dragging=false; private pointerId=-1; private lastPointer:Point={x:0,y:0};
  private lastPhase=''; private oldStage=-1; private prevPos:Point={x:0,y:0};
  private overlay!:HTMLElement; private panel!:HTMLElement; private hud!:HTMLElement;
  private abort=new AbortController(); private storageSaved=true; private saved=false;
  private best:Best|null=null; private tutorial=false;
  constructor(private ctx:GameContext,private shell:HTMLElement,private ready:()=>void,private report:(score:Score|null)=>void,private managed=false){super('maro-adventure');}
  preload(){
    this.load.image('maro',this.ctx.assetUrl(ASSET_ROOT+'assets/maro.png'));
    for(const actor of ['maro','spike','knuckle'])for(const direction of SHEET_DIRECTIONS)this.load.image(`${actor}-${direction}-walk-source`,this.ctx.assetUrl(ASSET_ROOT+`assets/${actor}-${direction}-walk-v2.png`));
    for(const name of ['medal','miss','clear','checkpoint'])this.load.audio(name,this.ctx.assetUrl(ASSET_ROOT+`assets/${name}.wav`));
  }
  create(){
    registerWalkFrames(this);
    this.cameras.main.setBackgroundColor('#6d8a5e');
    this.map=this.add.image(0,0,paintMap(this,0)).setOrigin(0);
    this.marks=this.add.graphics();
    this.shadow=this.add.ellipse(0,0,29,15,0x2b4c36,.5).setStrokeStyle(2,0xfcf1cd,.95);
    this.maro=this.add.sprite(0,0,'maro-up-walk','up-0');
    this.dogShadow=this.add.ellipse(0,0,42,19,0x263829,.35);
    this.dog=this.add.sprite(0,0,'knuckle-down-walk','down-0');
    this.comic=this.add.graphics();
    this.bubble=this.add.text(0,0,'',{fontFamily:'sans-serif',fontSize:'17px',fontStyle:'bold',color:'#473b2d',backgroundColor:'#fff4d9',padding:{x:10,y:7},align:'center'}).setOrigin(.5,1).setDepth(1500);
    this.fireflies=this.add.graphics().setDepth(20);
    this.overlay=this.shell.querySelector('.maro-overlay')!;this.panel=this.shell.querySelector('.maro-panel')!;this.hud=this.shell.querySelector('.maro-hud')!;
    const stored=this.ctx.platform.storage.read<Best|null>('maro-adventure:best:v2',null);
    if(stored&&Number.isFinite(stored.seconds)&&stored.seconds>=0&&Number.isInteger(stored.misses)&&stored.misses>=0&&Number.isInteger(stored.medals)&&stored.medals>=0&&stored.medals<=TOTAL_MEDALS)this.best=stored;
    this.shell.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-maro-action]');if(button&&!button.disabled)this.action(button.dataset.maroAction!);},{signal:this.abort.signal});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      if(this.model.phase!=='playing'||this.paused||this.hostPaused||this.dragging)return;
      this.dragging=true;this.pointerId=p.id;this.lastPointer={x:p.x,y:p.y};this.model.target={...this.model.pos};this.game.canvas.focus();
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
      if(!this.dragging||p.id!==this.pointerId||!p.isDown||this.paused||this.hostPaused)return;
      this.model.moveTarget(p.x-this.lastPointer.x,p.y-this.lastPointer.y);this.lastPointer={x:p.x,y:p.y};
    });
    const release=(p:Phaser.Input.Pointer)=>{if(p.id===this.pointerId)this.clearInput();};
    this.input.on('pointerup',release);this.input.on('pointerupoutside',release);
    this.game.canvas.addEventListener('pointercancel',()=>this.clearInput(),{signal:this.abort.signal});
    this.game.canvas.addEventListener('lostpointercapture',()=>this.clearInput(),{signal:this.abort.signal});
    this.input.keyboard?.on('keydown',(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLButtonElement)return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();if(!this.paused&&!this.hostPaused)this.keys.add(e.code);}
      if(e.code==='Escape'&&!e.repeat&&!this.managed)this.togglePause();
    });
    this.input.keyboard?.on('keyup',(e:KeyboardEvent)=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>{this.clearInput();if(!this.managed&&['playing','miss'].includes(this.model.phase)&&!this.paused)this.togglePause();},{signal:this.abort.signal});
    this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','マロの大冒険。ドラッグ、または矢印キーで移動。Escapeで一時停止。');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.abort.abort());
    this.events.once(Phaser.Scenes.Events.DESTROY,()=>this.abort.abort());
    this.resetAdventure();this.ready();
  }
  clearInput(){this.dragging=false;this.pointerId=-1;this.model.clearInput();this.keys.clear();}
  resetAdventure(){this.model=new Adventure();this.paused=false;this.saved=false;this.storageSaved=true;this.tutorial=false;this.lastPhase='';this.oldStage=-1;this.clearInput();this.report(null);this.refresh();}
  togglePause(){
    if(this.hostPaused||!['playing','miss'].includes(this.model.phase))return;
    this.paused=!this.paused;this.clearInput();this.refreshOverlay();this.refreshHUD();
    if(!this.paused)this.game.canvas.focus();
  }
  setHostPaused(value:boolean){this.hostPaused=value;this.clearInput();}
  private action(action:string){
    if(this.hostPaused)return;
    if(action==='start'){this.model.begin();this.tutorial=false;this.refresh();}
    if(action==='play'){this.model.play();this.clearInput();this.refresh();this.game.canvas.focus();}
    if(action==='next'){this.model.next();this.refresh();}
    if(action==='pause'||action==='resume')this.togglePause();
    if(action==='retry'){this.model.retry();this.resetWalks();this.paused=false;this.clearInput();this.refresh();this.game.canvas.focus();}
    if(action==='how'){this.tutorial=true;this.refreshOverlay();}
    if(action==='back'){this.tutorial=false;this.refreshOverlay();}
    if(action==='home')this.resetAdventure();
  }
  update(_time:number,delta:number){
    if(!this.maro||this.hostPaused||this.paused)return;
    const previous=this.model.phase;
    this.prevPos={...this.model.pos};const previousDog=this.model.dog;
    this.model.tick(delta/1000,{x:Number(this.keys.has('ArrowRight')||this.keys.has('KeyD'))-Number(this.keys.has('ArrowLeft')||this.keys.has('KeyA')),y:Number(this.keys.has('ArrowDown')||this.keys.has('KeyS'))-Number(this.keys.has('ArrowUp')||this.keys.has('KeyW'))});
    if(previous==='miss'&&this.model.phase==='playing')this.resetWalks();
    else this.maroWalk.advance(this.prevPos,this.model.pos,previous==='playing'&&this.model.phase==='playing');
    const dog=this.model.dog;
    if(dog&&previousDog)this.dogWalk.advance(previousDog,dog,this.model.phase==='playing'&&!this.model.dogBlocked);
    else this.dogWalk.reset(this.model.level.hazard?.kind==='patrol'?'down':'up');
    const event=this.model.event;
    if(['medal','miss','clear','checkpoint'].includes(event))this.sound.play(event,{volume:event==='miss'?.2:.26});
    if(previous!==this.model.phase){this.clearInput();this.refresh();}
    this.drawActors();this.refreshHUD();
  }
  private refresh(){
    if(this.oldStage!==this.model.stage){this.map.setTexture(paintMap(this,this.model.stage));this.oldStage=this.model.stage;this.resetWalks();this.updateJournal();}
    if(this.model.phase==='ending'&&!this.saved)this.saveResult();
    this.refreshOverlay();this.refreshHUD();this.drawActors();
  }
  private saveResult(){
    this.saved=true;const record={seconds:this.model.seconds,misses:this.model.misses,medals:this.model.medals.size};
    if(!this.best||record.misses<this.best.misses||(record.misses===this.best.misses&&record.seconds<this.best.seconds)){
      this.best=record;this.storageSaved=this.ctx.platform.storage.write('maro-adventure:best:v2',record);
    }
    this.ctx.platform.storage.write('maro-adventure:cleared:v2',true);
    this.report({value:record.misses,unit:'ミス',direction:'lower'});
  }
  private resetWalks(){this.maroWalk.reset();this.dogWalk.reset(this.model.level.hazard?.kind==='patrol'?'down':'up');}
  private drawActors(){
    const m=this.model,p=m.pos;
    pose(this.maro,'maro',this.maroWalk);
    this.shadow.setPosition(p.x,p.y);this.maro.setPosition(p.x,p.y+2).setAngle(0).setAlpha(1);
    this.comic.clear();this.bubble.setVisible(false);this.shadow.setAlpha(.5);
    if(m.phase==='miss'){
      const t=1.15-m.deathTimer,fall=Math.min(1,t/.65);
      this.maro.setAngle(Math.sin(fall*Math.PI)*32).setY(p.y+2+fall*21).setAlpha(1-fall*.65);
      this.shadow.setAlpha(.5*(1-fall));
      const g=this.comic;g.setDepth(p.y+10);
      // A soft bush catches Maro; leaves scatter, and the same checkpoint resumes.
      for(let i=0;i<7;i++){g.fillStyle(i%2?0x698e52:0x476f48,Math.min(1,t*5));g.fillEllipse(p.x+(i-3)*9,p.y+15+(i%2)*5,29,23);}
      for(let i=0;i<6;i++){const a=i*Math.PI/3;g.fillStyle(0xb4ca76,1-fall*.7);g.fillEllipse(p.x+Math.cos(a)*(15+fall*45),p.y-7+Math.sin(a)*(12+fall*26),9,5);}
      this.say(t<.3?'！':'ぽすっ…',p.x,p.y-52);
    }
    const dog=m.dog;
    this.dog.setVisible(!!dog);this.dogShadow.setVisible(!!dog);
    if(dog){
      pose(this.dog,m.level.hazard?.kind==='patrol'?'knuckle':'spike',this.dogWalk);
      this.dog.setPosition(dog.x,dog.y+2).setAngle(0);this.dogShadow.setPosition(dog.x,dog.y);
      this.dog.setDepth(dog.y+5);this.dogShadow.setDepth(dog.y+3);
      if(m.phase!=='miss'){
        if(m.chase==='warning')this.say('見つけたぞ！',dog.x,dog.y-94);
        if(m.dogBlocked){
          this.dog.setAngle(-12+Math.sin(m.clock*8)*3);
          this.say('あれっ、通れない!?',dog.x,dog.y-101);
          const g=this.comic;g.setDepth(dog.y+10);
          for(let i=0;i<3;i++){const a=m.clock*3+i*Math.PI*2/3,x=dog.x+Math.cos(a)*30,y=dog.y-84+Math.sin(a)*8;g.fillStyle(0xffdc75);g.fillTriangle(x,y-6,x-5,y+4,x+5,y+4);}
        }else if(m.level.hazard?.kind==='patrol'&&p.y<210&&m.phase==='playing')this.say('ん？ いつの間に!?',dog.x,dog.y-85);
      }
    }
    this.maro.setDepth(p.y+6);this.shadow.setDepth(p.y+4);
    const g=this.marks;g.clear();
    m.level.medals.forEach((medal,i)=>{
      if(m.medals.has(`${m.stage}:${i}`))return;
      const y=medal.y+Math.sin(m.clock*2+i)*2;
      g.fillStyle(0xffebaf,.22);g.fillCircle(medal.x,y,20);g.fillStyle(0xe6b457,1);g.fillCircle(medal.x,y,12);g.lineStyle(2,0xffedb6,1);g.strokeCircle(medal.x,y,12);
      g.fillStyle(0x94703e,1);g.fillEllipse(medal.x-1,y,10,6);g.fillTriangle(medal.x+3,y,medal.x+8,y-4,medal.x+8,y+4);
    });
    if(m.checkpoint){g.lineStyle(2,0xe7edbd,.75);g.strokeCircle(m.level.checkpoint.x,m.level.checkpoint.y,31);}
    const f=this.fireflies;f.clear();
    for(let i=0;i<14;i++){const x=(i*137+Math.sin(m.clock*.3+i)*12)%WIDTH,y=(i*91+Math.cos(m.clock*.22+i)*18+HEIGHT)%HEIGHT;f.fillStyle(0xfff0bc,.12+Math.sin(m.clock+i)*.08);f.fillCircle(x,y,2.2);}
  }
  private say(text:string,x:number,y:number){this.bubble.setText(text).setPosition(Math.max(120,Math.min(WIDTH-120,x)),Math.max(48,y)).setVisible(true);}
  private refreshHUD(){
    const m=this.model;
    this.shell.dataset.phase=m.phase;this.shell.dataset.paused=String(this.paused||this.hostPaused);
    this.shell.dataset.stage=String(m.stage+1);this.shell.dataset.misses=String(m.misses);this.shell.dataset.medals=String(m.medals.size);
    const set=(id:string,value:string)=>{const el=this.hud.querySelector<HTMLElement>(`[data-stat="${id}"]`)!;if(el.textContent!==value)el.textContent=value;};
    set('stage',`${String(m.stage+1).padStart(2,'0')} / ${LEVELS.length}`);set('title',m.level.title);set('time',clock(m.seconds));set('misses',String(m.misses));set('medals',`${m.medals.size} / ${TOTAL_MEDALS}`);
    this.shell.querySelector<HTMLButtonElement>('[data-maro-action="pause"]')!.disabled=!['playing','miss'].includes(m.phase);
    const pause=this.shell.querySelector<HTMLButtonElement>('[data-maro-action="pause"]')!;pause.textContent=this.paused?'▶ 再開':'Ⅱ 休憩';
    const hint=this.shell.querySelector<HTMLElement>('.maro-hint')!;
    let message=m.level.tip;
    if(m.phase==='miss')message=m.missReason;
    else if(m.chase==='warning')message='！ スパイクが気づいた！ 抜け穴へ急ごう。';
    else if(m.chase==='chasing')message='スパイクが追ってくる！ 道に沿って抜け穴へ。';
    else if(m.chase==='escaped')message=m.dogBlocked?'スパイクは穴の手前で立ち往生！ 先へ進もう。':'すぽっ！ 抜け穴を通れた。先へ進もう。';
    else if(m.checkpointNotice>0)message='✦ チェックポイント！ ここから再挑戦できるよ。';
    if(hint.textContent!==message)hint.textContent=message;
    hint.dataset.urgent=String(m.chase==='chasing'||m.chase==='warning');
  }
  private updateJournal(){
    const m=this.model;
    this.shell.querySelector('.maro-journal')!.innerHTML=`<div class="maro-eyebrow">FIELD NOTES / ${String(m.stage+1).padStart(2,'0')}</div><h2>${m.level.subtitle}</h2><p>${m.level.story.replaceAll('\n','<br>')}</p><div class="maro-note-rule"></div><div class="maro-eyebrow">旅のヒント</div><ol><li>足元の白い輪が、マロの立つ場所。</li><li>道をはずれると、茂みにころりん。</li><li>緑の旗まで進むと、そこから再挑戦。</li></ol><div class="maro-note-card">${m.level.tip}</div><span class="maro-journal-bottom">ひとあしずつ、きみに会いに。</span>`;
  }
  refreshOverlay(){
    const m=this.model,phase=this.paused?'paused':m.phase;
    this.overlay.hidden=phase==='playing'||phase==='miss';
    if(this.overlay.hidden)return;
    const button=(action:string,label:string,secondary=false)=>`<button type="button" class="${secondary?'maro-secondary':'maro-primary'}" data-maro-action="${action}">${label}</button>`;
    const img=this.ctx.assetUrl(ASSET_ROOT+'assets/maro.png'),reunion=this.ctx.assetUrl(ASSET_ROOT+'assets/reunion.png');
    let body='';this.panel.className='maro-panel';
    if(phase==='title'&&!this.tutorial){
      this.panel.classList.add('maro-title-panel');
      body=`<div class="maro-title-visual"><span class="maro-visual-ring"></span><img src="${img}" alt="猫のマロ"><span class="maro-visual-caption">a little cat, a big adventure.</span><span class="maro-leaf l1">❧</span><span class="maro-leaf l2">❧</span></div><div class="maro-title-copy"><div class="maro-eyebrow">MARO’S LITTLE ADVENTURE</div><h1>マロの<br><span>大冒険</span></h1><p class="maro-tagline">ひとあしずつ、きみに会いに。</p><p>森の小道をぬけて、木橋をわたって。<br>はぐれた栞音のもとへ帰る、小さな冒険。</p><div class="maro-title-badges"><span>ドラッグで操作</span><span>全${LEVELS.length}ステージ</span><span>何度でも挑戦</span></div><div class="maro-modal-actions">${button('start','冒険にでかける　→')}${button('how','あそびかた',true)}</div><small>${this.best?`いちばんの冒険：${this.best.misses} ミス ・ ${clock(this.best.seconds)}`:'マウス・タッチ・矢印キーで遊べます'}</small></div>`;
    }else if(phase==='title'&&this.tutorial){
      body=`<div class="maro-eyebrow">HOW TO PLAY</div><h2>あわてず、ひとあしずつ。</h2><div class="maro-how"><p><b>01　ドラッグして歩く</b><br>画面の好きな場所を押して動かそう。指を離すと止まるよ。矢印キー・WASDでも移動できます。</p><p><b>02　足元を見て進む</b><br>白い輪が道からはみ出すとミス。緑の旗まで進むと、そこから再挑戦。</p><p><b>03　犬たちをかわそう</b><br>ナックルには待避所、スパイクには猫の抜け穴。止まって考えるなら「休憩」を押そう。</p></div><div class="maro-modal-actions">${button('start','冒険にでかける　→')}${button('back','もどる',true)}</div>`;
    }else if(phase==='intro'){
      body=`<div class="maro-eyebrow">CHAPTER ${String(m.stage+1).padStart(2,'0')} · ${m.level.tag}</div><div class="maro-chapter-number">${String(m.stage+1).padStart(2,'0')}</div><h2>${m.level.title}</h2><p class="maro-story">${m.level.story.replaceAll('\n','<br>')}</p><div class="maro-note-card">${m.level.tip}</div><div class="maro-modal-actions">${button('play','この道を進む　→')}</div>`;
    }else if(phase==='paused'){
      body=`<div class="maro-eyebrow">TAKE A LITTLE BREAK</div><h2>木かげで、ひとやすみ。</h2><p>マロも犬たちも、ここで待っています。</p><div class="maro-modal-actions">${button('resume','冒険をつづける　→')}${button('retry','チェックポイントから',true)}${button('home','タイトルへ戻る',true)}</div><small>タイトルへ戻ると、今回の進行はリセットされます。</small>`;
    }else if(phase==='clear'){
      body=`<div class="maro-eyebrow">CHAPTER ${String(m.stage+1).padStart(2,'0')} COMPLETE</div><div class="maro-success">${paw}</div><h2>${m.stage===LEVELS.length-1?'栞音の声がする！':'ひとつ、近づいた。'}</h2><p>${m.stage===LEVELS.length-1?'「マロさん！」 コテージの扉が開いた。':m.level.hazard?.kind==='patrol'?'ナックル「スパイク！ そっちへ行ったぞ！」<br>スパイク「任せとけ！ ……たぶんな！」':m.level.hazard?.kind==='chase'?'スパイク「この穴、小さすぎだろ！」<br>ナックル「おれは、もっと無理だぞ……」':`次は「${LEVELS[m.stage+1].title}」。道しるべをたどって進もう。`}</p><div class="maro-result-stats"><div><small>この道のタイム</small><strong>${clock(m.stageSeconds)}</strong></div><div><small>ミス</small><strong>${m.stageMisses}</strong></div><div><small>おさかな</small><strong>${m.stageMedals} / 3</strong></div></div><div class="maro-modal-actions">${button('next',m.stage===LEVELS.length-1?'栞音のもとへ　→':'つぎの道へ　→')}</div>`;
    }else if(phase==='ending'){
      this.panel.classList.add('maro-ending-panel');
      body=`<img class="maro-reunion" src="${reunion}" alt="栞音に抱っこされるマロ"><div class="maro-eyebrow">WELCOME HOME, MARO.</div><h2>「マロさん、おかえり。」</h2><p>いつもの腕のなかで、マロはそっと目を細めた。<br>小さな大冒険は、ここでおしまい。</p><div class="maro-result-stats"><div><small>冒険のタイム</small><strong>${clock(m.seconds)}</strong></div><div><small>ミス</small><strong>${m.misses}</strong></div><div><small>おさかな</small><strong>${m.medals.size} / ${TOTAL_MEDALS}</strong></div></div><small>${this.storageSaved?'冒険の記録を保存しました。':'記録は今回の起動中のみ保存されています。'}</small><div class="maro-modal-actions">${button('home','もう一度、冒険へ')}</div>`;
    }
    this.panel.innerHTML=body;
    // Refit after both text and image layout; all actions stay in the available viewport.
    this.shell.dispatchEvent(new Event('maro-panel-change'));
    this.shell.querySelector<HTMLElement>('.maro-live')!.textContent=phase==='title'?'マロの大冒険':phase==='intro'?m.level.title:phase==='paused'?'一時停止中':phase==='ending'?'栞音と再会しました。冒険クリア！':'ステージクリア！';
    this.lastPhase=phase;
  }
}
