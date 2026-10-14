import Phaser from 'phaser';
import type { GameContext, Score } from '../../src/core/types';
import { ATLASES, BONUSES, CHARACTERS, DIFFICULTIES, HP_COLORS, STORIES, byId, type Character, type Difficulty, type Side } from './content';
import { StoryMatch, type Event } from './model';
import { flightAngle } from './flights';
import { StageBackdrop, preloadStages, prepareStages } from './backdrop';
import { stageFor, type BackgroundMode } from './stages';
import { drawEnergyBar } from './bars';
import swingPresets from './swing-presets.json';
const ROOT='sample_game/STAR_BOUNCE/';
const FONT='"Trebuchet MS", "Hiragino Kaku Gothic ProN", sans-serif';
export class StoryScene extends Phaser.Scene {
  match?:StoryMatch;
  swingPreset='deep';
  backgroundMode:BackgroundMode='layered';private backdrop?:StageBackdrop;private playerImpact=-1000;private enemyImpact=-1000;
  private selected=CHARACTERS[0];private side:Side='GOOD';private difficulty:Difficulty='normal';private overlay:HTMLElement;private footer:HTMLElement;private live:HTMLElement;
  private world!:Phaser.GameObjects.Container;private ink!:Phaser.GameObjects.Graphics;private bonusLayer!:Phaser.GameObjects.Container;
  private portraits=new Map<string,string>();private sprites=new Map<number,Phaser.GameObjects.Sprite>();private ratio=1;private worldHeight=760;private drag?:{id:number;x:number;bar:number};
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;private hud!:Phaser.GameObjects.Text;private goalHud!:Phaser.GameObjects.Text;
  private notice!:Phaser.GameObjects.Text;private enemySpeech!:Phaser.GameObjects.Text;private playerSpeech!:Phaser.GameObjects.Text;
  private playerArt?:Phaser.GameObjects.Sprite;private enemyArt?:Phaser.GameObjects.Sprite;private stars:Phaser.GameObjects.Star[]=[];
  private playerY=658;private enemyY=93;
  private playerReactionUntil=0;private enemyReactionUntil=0;private trail:{x:number;y:number}[]=[];private paceHud!:Phaser.GameObjects.Text;
  private noticeUntil=0;private speechUntil=0;private clock=0;private best=0;private saved=true;
  constructor(private ctx:GameContext,private wrapper:HTMLElement,private ready:()=>void,private publish:(score:Score|null)=>void){
    super('star-bounce-story');this.overlay=wrapper.querySelector('.sb-overlay')!;this.footer=wrapper.querySelector('.sb-controls')!;this.live=wrapper.querySelector('.sb-live')!;
    const stored=this.ctx.platform.storage.read<string>('star-bounce-story:background','layered');this.backgroundMode=stored==='still'?'still':'layered';
    const swing=ctx.platform.storage.read<string>('star-bounce-story:swing','deep');this.swingPreset=swingPresets.some(p=>p.id===swing)?swing:'deep';
  }
  preload(){
    preloadStages(this,file=>this.url(file));
    for(const [key,atlas] of Object.entries(ATLASES))this.load.image(`atlas-${key}`,this.url(atlas.file));
    for(const tone of ['goal','miss','bonus'])this.load.audio(tone,this.url(`assets/chime-${tone}.wav`));
    for(const preset of swingPresets)for(const side of ['good','dark'])this.load.audio(`swing-${preset.id}-${side}`,this.url(`assets/swing-${preset.id}-${side}.wav`));
  }
  create(){
    prepareStages(this);
    for(const [key,atlas] of Object.entries(ATLASES)){
      const texture=this.textures.get(`atlas-${key}`),source=texture.getSourceImage();
      const w=source.width/atlas.cols,h=source.height/atlas.rows;
      for(let row=0;row<atlas.rows;row++)for(let col=0;col<atlas.cols;col++){
        const y=key==='good'&&row===3?source.height*746/1024:row*h;
        const height=key==='good'&&row>=2?source.height*(row===2?230:278)/1024:h;
        const frame=texture.add(row*atlas.cols+col,0,col*w,y,w,height);
        // Align the supplied ship's hull center between generated animation cells.
        if(key==='falcon'&&frame){frame.customPivot=true;frame.pivotX=col===0?.525:.505;frame.pivotY=row===0?.522:.462;}
      }
    }
    for(const c of CHARACTERS){
      const key=`atlas-${c.atlas}`,base=c.row*6;
      this.portraits.set(c.id,this.textures.getBase64(key,base));
      this.anims.create({key:`${c.id}-idle`,frames:[0,0,0,1].map(i=>({key,frame:base+i})),frameRate:3,repeat:-1});
      for(const [state,col] of [['return',2],['happy',3],['sad',4],['skill',5]] as const)this.anims.create({key:`${c.id}-${state}`,frames:[{key,frame:base+col},{key,frame:base+col},{key,frame:base}],frameRate:4,repeat:0});
    }
    for(const [kind,art] of Object.entries(BONUSES))this.anims.create({key:`flight-${kind}`,frames:[0,1,2,3].map(col=>({key:`atlas-${art.atlas}`,frame:art.row*4+col})),frameRate:8,repeat:-1});
    this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','STAR_BOUNCE。ドラッグか左右キーでバーを動かし、Spaceで必殺技。');
    this.keys=this.input.keyboard?.addKeys('LEFT,RIGHT,A,D,SPACE') as typeof this.keys;
    this.input.keyboard?.on('keydown-SPACE',(event:KeyboardEvent)=>{if(!event.repeat&&this.overlay.hidden&&!(event.target instanceof HTMLButtonElement)){event.preventDefault();this.activate();}});
    const move=(p:Phaser.Input.Pointer)=>{if(this.match?.phase==='playing'&&!this.game.isPaused&&(p.isDown||!p.wasTouch))this.match.move(p.x/this.ratio);};
    this.input.on('pointerdown',move);this.input.on('pointermove',move);
    const pad=this.wrapper.querySelector<HTMLElement>('.sb-drag-pad')!;
    pad.onpointerdown=e=>{if(this.match?.phase!=='playing'||this.game.isPaused||this.drag||e.button!==0)return;e.preventDefault();this.drag={id:e.pointerId,x:e.clientX,bar:this.match.playerX};pad.setPointerCapture(e.pointerId);};
    pad.onpointermove=e=>{if(!this.drag||e.pointerId!==this.drag.id||!this.match||this.game.isPaused)return;e.preventDefault();const width=pad.getBoundingClientRect().width;this.match.move(this.drag.bar+(e.clientX-this.drag.x)*480/width);};
    const releaseDrag=(e:PointerEvent)=>{if(this.drag?.id===e.pointerId)this.drag=undefined;};
    pad.onpointerup=releaseDrag;pad.onpointercancel=releaseDrag;pad.onlostpointercapture=releaseDrag;
    const skill=this.button('skill');
    skill.onclick=()=>this.activate();
    // Some touch browsers omit the compatibility click after a drag gesture.
    // Accept a release inside the button directly; canceled/outside releases do nothing.
    skill.onpointerup=event=>{
      if(event.pointerType!=='touch'||skill.disabled)return;
      const bounds=skill.getBoundingClientRect();
      if(event.clientX>=bounds.left&&event.clientX<=bounds.right&&event.clientY>=bounds.top&&event.clientY<=bounds.bottom)this.activate();
    };
    this.scale.on(Phaser.Scale.Events.RESIZE,this.layout,this);
    this.game.events.on(Phaser.Core.Events.BLUR,this.clearInput,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.scale.off(Phaser.Scale.Events.RESIZE,this.layout,this);this.game.events.off(Phaser.Core.Events.BLUR,this.clearInput,this);});
    this.menu();this.ready();
  }
  private url(file:string){return this.ctx.assetUrl(ROOT+file);}
  private button(action:string){return this.wrapper.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;}
  clearInput(){this.drag=undefined;this.input.keyboard?.resetKeys();}
  private phase(value:string){this.wrapper.dataset.phase=value;this.button('pause').disabled=value!=='playing';(this.wrapper.querySelector('.sb-skill-dock') as HTMLElement).hidden=value!=='playing';}
  private img(c:Character){return `<img class="sb-character-image" src="${this.portraits.get(c.id)}" alt="${c.name}" draggable="false">`;}


  private action(label:string,fn:()=>void,primary=true){const b=document.createElement('button');b.textContent=label;if(primary)b.className='sb-primary';b.onclick=fn;return b;}
  menu(){
    for(const key of ['hp','score','side','chapter','skill','difficulty'])delete this.wrapper.dataset[key];
    this.clearInput();this.match=undefined;this.publish(null);this.footer.hidden=true;this.phase('select');this.layout();this.renderSelection();
  }
  private renderSelection(){
    const story=STORIES[this.side],c=this.selected;
    this.overlay.hidden=false;this.overlay.innerHTML=`<section class="sb-menu"><span class="sb-kicker">A LITTLE COSMIC ADVENTURE</span><h1>STAR_BOUNCE</h1><p class="sb-description">正義も、いたずらも、今日はラリーで話そう。<br>あなたの相棒と、ちいさな銀河の旅へ。</p><div class="sb-sides" role="group" aria-label="サイド選択"><button data-side="GOOD" aria-pressed="${this.side==='GOOD'}">GOOD · 星の配達団</button><button data-side="DARK" aria-pressed="${this.side==='DARK'}">DARK · おやつ独占団</button></div><div class="sb-roster" style="--count:${CHARACTERS.filter(c=>c.side===this.side).length}" role="group" aria-label="キャラクター選択">${CHARACTERS.filter(c=>c.side===this.side).map(c=>`<button class="sb-card" data-character="${c.id}" aria-pressed="${c.id===this.selected.id}">${this.img(c)}<b>${c.name}</b><span>${c.role}</span></button>`).join('')}</div><div class="sb-summary"><div><b>${c.skillName}</b><p>${c.skillText}<br>${c.trait}</p></div><div><b>${story.name}</b><p>${story.description}<br>全3ステージ · 3ゴールでクリア · 星HP 5</p></div></div><div class="sb-difficulties" role="group" aria-label="難易度">${Object.entries(DIFFICULTIES).map(([id,d])=>`<button data-difficulty="${id}" aria-pressed="${this.difficulty===id}">${d.label}</button>`).join('')}</div><p class="sb-difficulty-hint">${DIFFICULTIES[this.difficulty].description}</p><div class="sb-launch"></div><p class="sb-note">返球で必殺ゲージがたまるよ。<br>クリアすると次のステージで星を1つ回復。</p></section>`;
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-side]').forEach(b=>b.onclick=()=>{this.side=b.dataset.side as Side;this.selected=CHARACTERS.find(c=>c.side===this.side)!;this.renderSelection();});
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>b.onclick=()=>{this.selected=byId(b.dataset.character!);this.renderSelection();});
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(b=>b.onclick=()=>{this.difficulty=b.dataset.difficulty as Difficulty;this.renderSelection();});
    const start=this.action(`${c.name}と出発する`,()=>this.startJourney());start.classList.add('sb-start');this.overlay.querySelector('.sb-launch')!.append(start);
    this.live.textContent=`${this.side}。${c.name}を選択中。${c.skillName}：${c.skillText}`;
  }
  private startJourney(){
    this.match=new StoryMatch(this.selected,Math.random,this.difficulty);const legacy=this.difficulty==='easy'?this.ctx.platform.storage.read<number>(`star-bounce-story:best:${this.side}`,0):0;const stored=this.ctx.platform.storage.read<number>(`star-bounce-story:best:${this.side}:${this.difficulty}`,legacy);this.best=Number.isFinite(stored)&&stored>=0?stored:0;this.saved=true;
    this.match.resize(this.worldHeight);this.publish({value:0,unit:'点',direction:'higher'});this.layout();this.story();
  }
  private versus(){return `<div class="sb-versus"><figure>${this.img(this.selected)}<figcaption>${this.selected.name}</figcaption></figure><span>✦</span><figure>${this.img(byId(this.match!.chapter.rival))}<figcaption>${byId(this.match!.chapter.rival).name}</figcaption></figure></div>`;}
  private story(){
    const m=this.match!,c=m.chapter;this.phase('intro');this.footer.hidden=true;this.overlay.hidden=false;
    this.overlay.innerHTML=`<section class="sb-modal"><div class="sb-route">${[0,1,2].map(i=>`<i class="${i<=m.chapterIndex?'on':''}"></i>`).join('')}</div><span class="sb-kicker">${this.side} ROUTE · ${m.chapterIndex+1} / 3 · ${DIFFICULTIES[this.difficulty].label}</span><h2>${c.title}</h2><p class="sb-stage-name">${stageFor(c.rival).name}</p>${this.versus()}<p>${c.intro}</p><div class="sb-talk">${byId(c.rival).name}「${c.reply}」</div><p>3ゴールで次へ。残りの星：${m.hp} / 5</p><div class="sb-actions"></div></section>`;
    const hint=document.createElement('p');hint.className='sb-note';hint.textContent='操作パッドを左右にドラッグ。縦ゲージがたまったら丸い✦ボタン！';this.overlay.querySelector('.sb-actions')!.before(hint);
    this.overlay.querySelector('.sb-actions')!.append(this.action('ラリーをはじめる',()=>{m.start();this.playUI();}));this.live.textContent=`${c.title}。${c.intro} ${c.reply}`;
  }
  private playUI(){this.overlay.hidden=true;this.footer.hidden=false;this.phase('playing');this.clearInput();this.game.canvas.focus();this.updateHUD();}
  private result(){
    const m=this.match!;this.clearInput();this.footer.hidden=true;this.phase(m.phase);this.overlay.hidden=false;
    const cleared=m.phase==='clear',ending=m.phase==='ending';
    if(ending)this.saved=this.ctx.platform.storage.write(`star-bounce-story:cleared:${this.side}:${this.difficulty}`,true)&&this.saved;
    const title=cleared?'こころが、少し近づいた。':ending?'それぞれの、すてきな夜。':'ひと休みして、もう一度。';
    const copy=cleared?m.chapter.after:ending?STORIES[this.side].ending:'星がなくなりました。でも旅の仲間は、また会えるのを待っています。';
    this.overlay.innerHTML=`<section class="sb-modal"><span class="sb-kicker">${cleared?'STAGE CLEAR':ending?'STORY COMPLETE':'GAME OVER'}</span><h2>${title}</h2><div class="sb-result-score">${m.score.toLocaleString()}<small style="font-size:14px"> 点</small></div><p>BEST ${this.best.toLocaleString()} · ゴール ${m.totalGoals}回</p><div class="sb-talk">${copy}</div>${this.saved?'':'<p>記録はこの起動中のみ保存されます。</p>'}<div class="sb-actions"></div></section>`;
    const actions=this.overlay.querySelector('.sb-actions')!;
    if(cleared)actions.append(this.action(m.chapterIndex===2?'エンディングへ':'次のステージへ',()=>{m.next();this.layout();m.phase==='ending'?this.result():this.story();}));
    else if(ending)actions.append(this.action('この相棒で無限ラリー',()=>{m.startEndless();this.layout();this.playUI();}));
    else actions.append(this.action('同じキャラで再挑戦',()=>this.startJourney()));
    actions.append(this.action('キャラ選択へ',()=>this.menu(),false));this.live.textContent=`${title} ${copy} ${m.score}点。`;
  }
  pausePanel(){if(!this.match||this.match.phase!=='playing')return;this.button('pause').textContent='再開';this.phase('paused');this.button('pause').disabled=false;this.overlay.hidden=false;this.overlay.innerHTML='<section class="sb-modal"><span class="sb-kicker">TAKE A LITTLE BREAK</span><h2>ひと休み。</h2><p>星もボールも、そのまま待っています。</p><div class="sb-actions"></div></section>';this.overlay.querySelector('.sb-actions')!.append(this.action('ラリーに戻る',()=>this.button('pause').click()));}
  hidePause(){this.button('pause').textContent='一時停止';if(this.match?.phase==='playing'){this.overlay.hidden=true;this.phase('playing');}}
  confirmHome(yes:()=>void,no:()=>void){this.overlay.hidden=false;this.overlay.innerHTML='<section class="sb-modal"><h2>相棒を選び直す？</h2><p>今回の旅は最初からになります。最高得点は残ります。</p><div class="sb-actions"></div></section>';this.overlay.querySelector('.sb-actions')!.append(this.action('選び直す',yes),this.action('旅を続ける',no,false));}
  private text(x:number,y:number,value:string,size=14,color='#dce4f4',center=false){const t=this.add.text(x,y,value,{fontFamily:FONT,fontSize:`${size}px`,color,align:center?'center':'left'}).setOrigin(center?.5:0,.5).setResolution(Math.max(2,this.ratio));this.world.add(t);return t;}
  private portrait(c:Character,x:number,y:number,factor=1){
    const image=this.add.sprite(x,y,`atlas-${c.atlas}`,c.row*6).play(`${c.id}-idle`);image.setScale(88*factor/image.frame.width);this.world.add(image);this.text(x,y+48*factor,c.name,factor<1?9:12,'#e6d8c0',true);return image;
  }
  setSwingPreset(id:string){if(swingPresets.some(p=>p.id===id)){this.swingPreset=id;this.ctx.platform.storage.write('star-bounce-story:swing',id);}}
  setBackgroundMode(mode:BackgroundMode){
    this.backgroundMode=mode;this.ctx.platform.storage.write('star-bounce-story:background',mode);this.rebuildBackdrop();
  }
  private rebuildBackdrop(){
    this.backdrop?.destroy();
    const rival=this.match?.chapter.rival??this.selected.id;
    this.backdrop=new StageBackdrop(this,rival,this.worldHeight,this.backgroundMode);this.world.addAt(this.backdrop.root,0);
    this.wrapper.dataset.background=this.backgroundMode;this.wrapper.dataset.arena=rival;
  }
  private layout(){
    this.clearInput();this.trail=[];this.playerReactionUntil=0;this.enemyReactionUntil=0;
    this.ratio=this.scale.width/480;this.worldHeight=this.scale.height/this.ratio;
    this.match?.resize(this.worldHeight);this.tweens.killAll();this.backdrop?.destroy();this.backdrop=undefined;this.world?.destroy(true);this.sprites.clear();
    this.world=this.add.container().setScale(this.ratio);
    this.rebuildBackdrop();
    this.world.add(this.add.rectangle(240,this.worldHeight/2,480,this.worldHeight,0x101427,.35));
    const g=this.add.graphics().lineStyle(1,this.match?.chapter.color??0x9fa7c4,.35).strokeRoundedRect(9,8,462,this.worldHeight-16,18);this.world.add(g);
    this.bonusLayer=this.add.container();this.world.add(this.bonusLayer);this.ink=this.add.graphics();this.world.add(this.ink);
    if(!this.match)return;
    const h=this.worldHeight,compact=h<360;
    this.enemyY=compact?61:93;this.playerY=h-(compact?61:102);
    this.enemyArt=this.portrait(byId(this.match.chapter.rival),431,this.enemyY,compact?.5:1);this.playerArt=this.portrait(this.selected,49,this.playerY,compact?.5:1);
    this.hud=this.text(22,compact?40:80,'0',compact?18:27,'#ffedc7');this.goalHud=this.text(22,compact?60:109,'',compact?10:13,'#bad6da');
    this.text(240,h-10,stageFor(this.match.chapter.rival).name,9,'#a6b8c6',true);
    this.paceHud=this.text(240,compact?45:49,'',10,'#b1c7d4',true);
    this.text(22,compact?18:57,this.match.endless?'ENDLESS ORBIT':`${this.side} · STAGE ${this.match.chapterIndex+1}/3`,compact?8:10,'#adbad0');
    this.text(457,h-(compact?72:125),'YOUR STARS',compact?8:10,'#b9c8da').setOrigin(1,.5);
    this.stars=HP_COLORS.map((color,i)=>{const star=this.add.star((compact?377:345)+i*(compact?18:25),h-(compact?55:100),5,compact?3:5,compact?7:11,color);this.world.add(star);return star;});
    this.notice=this.text(240,h/2,'',compact?15:24,'#fff1b9',true);this.enemySpeech=this.text(382,compact?72:159,'',compact?10:14,'#efdbff').setOrigin(1,.5);this.playerSpeech=this.text(92,h-(compact?67:113),'',compact?10:14,'#d2fbd4');
    this.updateHUD();this.draw();
  }
  private activate(){if(this.game.isPaused||!this.match?.activate())return;this.notice.setText(this.selected.skillName);this.noticeUntil=this.clock+1100;this.sound.play('bonus',{volume:.25});this.react('player','skill');this.burst(this.match.playerX,this.match.bottom,this.selected.color,14);this.live.textContent=`${this.selected.skillName}！ ${this.selected.skillText}`;this.updateHUD();}
  private feedback(e:Event){
    const m=this.match!;
    if(e.type==='return'||e.type==='enemy-return'){
      this.react(e.type==='return'?'player':'enemy','return');this.burst(e.x,e.y,e.type==='return'?this.selected.color:m.chapter.color,5);
      const art=e.type==='return'?this.playerArt:this.enemyArt;const y=e.type==='return'?this.playerY:this.enemyY;if(art){this.tweens.killTweensOf(art);art.y=y;this.tweens.add({targets:art,y:y-6,duration:100,yoyo:true});}
      (e.type==='return'?this.playerSpeech:this.enemySpeech).setText(e.type==='return'?'いい感じ！':'えいっ！');this.speechUntil=this.clock+650;
      const actor=e.type==='return'?this.selected:byId(m.chapter.rival);
      this.sound.play(`swing-${this.swingPreset}-${actor.side.toLowerCase()}`,{volume:e.type==='return'?.35:.2});
      if(e.type==='return')this.playerImpact=this.clock;else this.enemyImpact=this.clock;
    }
    if(e.type==='goal'){this.react('player','happy');this.react('enemy','sad');this.burst(240,55,0xffdf84,24);this.enemySpeech.setText('まいった〜');this.playerSpeech.setText('やった！');this.speechUntil=this.clock+1100;this.sound.play('goal',{volume:.28});this.live.textContent=`ゴール。${m.goals} / 3。`;}
    if(e.type==='miss'){this.react('player','sad');this.react('enemy','happy');this.burst(m.playerX,m.bottom,0xc4a2ff,12);this.enemySpeech.setText('やった！');this.playerSpeech.setText('もう一度！');this.speechUntil=this.clock+1100;this.sound.play('miss',{volume:.2});this.live.textContent=`ミス。星はあと${m.hp}つ。`;}
    if(e.type==='guard'){this.notice.setText('このはガード！');this.noticeUntil=this.clock+900;this.burst(m.playerX,m.bottom,0xb0d98e,14);}
    if(e.type==='bonus'){this.sound.play('bonus',{volume:.25});this.burst(e.x,e.y,0xffdf7b,16);}
    if(e.points){const t=this.text(Phaser.Math.Clamp(e.x,65,415),Phaser.Math.Clamp(e.y,60,this.worldHeight-60),`+${e.points}`,23,'#ffe19c',true);this.tweens.add({targets:t,y:t.y-25,alpha:0,duration:700,onComplete:()=>t.destroy()});
      this.publish({value:m.score,unit:'点',direction:'higher'});if(m.score>this.best){this.best=m.score;this.saved=this.ctx.platform.storage.write(`star-bounce-story:best:${this.side}:${this.difficulty}`,this.best);}
    }
    this.updateHUD();
  }
  private react(who:'player'|'enemy',state:'return'|'happy'|'sad'|'skill'){
    const art=who==='player'?this.playerArt:this.enemyArt,id=who==='player'?this.selected.id:this.match!.chapter.rival;
    art?.play(`${id}-${state}`);if(who==='player')this.playerReactionUntil=this.clock+750;else this.enemyReactionUntil=this.clock+750;
  }
  private burst(x:number,y:number,color:number,count:number){
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count,particle=this.add.star(x,y,4,1.5,3.5,color,.9);this.world.add(particle);this.tweens.add({targets:particle,x:x+Math.cos(a)*(20+i%4*8),y:y+Math.sin(a)*(20+i%4*8),alpha:0,scale:.1,duration:450+i%3*100,onComplete:()=>particle.destroy()});}
  }
  private updateHUD(){const m=this.match;if(!m)return;this.wrapper.dataset.difficulty=this.difficulty;this.wrapper.dataset.hp=String(m.hp);this.wrapper.dataset.score=String(m.score);this.wrapper.dataset.side=this.side;this.wrapper.dataset.chapter=String(m.chapterIndex+1);this.wrapper.dataset.skill=m.skill??'';
    this.hud?.setText(m.score.toLocaleString());this.goalHud?.setText(m.endless?`GOAL ${m.goals}`:`GOAL ${m.goals} / 3`);this.stars.forEach((s,i)=>s.setVisible(i<m.hp));
    this.paceHud?.setText(`${DIFFICULTIES[this.difficulty].label} · RALLY ${m.rallyHits} · ×${(m.ballSpeed/Math.hypot(80,m.pace.serve+m.chapterIndex*24)).toFixed(1)}`);
    const b=this.button('skill');b.disabled=m.phase!=='playing'||m.charge<100||m.skill!==null;b.title=this.selected.skillName;b.setAttribute('aria-label',`${this.selected.skillName}を発動`);const symbol=m.skill?'✧':'✦';if(b.textContent!==symbol)b.textContent=symbol;
    const dock=this.wrapper.querySelector<HTMLElement>('.sb-skill-dock')!,meter=dock.querySelector<HTMLElement>('.sb-skill-meter')!;
    dock.style.setProperty('--charge',`${m.charge}%`);dock.dataset.ready=String(!b.disabled);meter.setAttribute('aria-valuenow',String(m.charge));dock.querySelector('.sb-charge-label')!.textContent=m.skill?`${Math.ceil(m.skillTime)}s`:`${m.charge}%`;

  }
  update(_time:number,delta:number){this.clock+=delta;const m=this.match;if(!m)return;if(this.enemySpeech&&this.clock>this.speechUntil){this.enemySpeech.setText('');this.playerSpeech.setText('');}if(m.phase!=='playing')return;
    if(this.clock>this.playerReactionUntil&&!this.playerArt?.anims.currentAnim?.key.endsWith('-idle'))this.playerArt?.play(`${this.selected.id}-idle`);
    if(this.clock>this.enemyReactionUntil&&!this.enemyArt?.anims.currentAnim?.key.endsWith('-idle'))this.enemyArt?.play(`${m.chapter.rival}-idle`);
    this.backdrop?.update(delta,m.playerX);
    const direction=(Number(!!(this.keys?.RIGHT.isDown||this.keys?.D.isDown))-Number(!!(this.keys?.LEFT.isDown||this.keys?.A.isDown)));if(direction)m.move(m.playerX+direction*this.selected.speed*Math.min(delta,100)/1000);
    for(const e of m.advance(delta/1000))this.feedback(e);this.updateHUD();this.draw();
    if(this.clock>this.noticeUntil)this.notice.setText(m.serve>0?'READY?':'');if(m.phase!=='playing')this.result();
  }
  private draw(){const m=this.match!;this.ink.clear();drawEnergyBar(this.ink,m.enemyX,m.top,m.enemyWidth,byId(m.chapter.rival),this.clock/1000,Math.max(0,1-(this.clock-this.enemyImpact)/380));drawEnergyBar(this.ink,m.playerX,m.bottom,m.width,this.selected,this.clock/1000,Math.max(0,1-(this.clock-this.playerImpact)/380));
    const ids=new Set(m.targets.map(t=>t.id));for(const[id,s]of this.sprites)if(!ids.has(id)){s.destroy();this.sprites.delete(id);}
    for(const t of m.targets){const art=BONUSES[t.kind];let s=this.sprites.get(t.id);if(!s){s=this.add.sprite(t.x,t.y,`atlas-${art.atlas}`,art.row*4).setOrigin(art.originX,.5).setDisplaySize(art.width,art.height).play(`flight-${t.kind}`);this.bonusLayer.add(s);this.sprites.set(t.id,s);}s.setRotation(flightAngle(t)).setPosition(t.x,t.y);}
    if(m.skill==='guard')this.ink.lineStyle(3,0xb0d98e,.55).lineBetween(20,m.height-8,460,m.height-8);
    if(m.phase==='over'||m.phase==='clear'){this.backdrop?.setDarkTrail([],this.clock/1000,false);return;}const b=m.ball;
    if(m.serve>0)this.trail=[];else {this.trail.push({x:b.x,y:b.y});if(this.trail.length>20)this.trail.shift();}
    const dark=this.selected.side==='DARK';
    this.backdrop?.setDarkTrail(this.trail,this.clock/1000,dark&&m.serve<=0);
    if(dark){
      this.trail.forEach((p,i)=>{if(i%3===0)this.ink.lineStyle(1,0xdcd6ff,i/this.trail.length*.16).strokeEllipse(p.x,p.y,14+i*.65,10+i*.5);});
    }else this.trail.forEach((p,i)=>this.ink.fillStyle(this.selected.color,i/this.trail.length*.22).fillCircle(p.x,p.y,2+i*.28));
    this.ink.fillStyle(0xffe2a3,.1).fillCircle(b.x,b.y,21).fillStyle(0xffe2a3,.3).fillCircle(b.x,b.y,12).fillStyle(0xfff8dd,1).fillCircle(b.x,b.y,8).fillStyle(0xffffff,1).fillCircle(b.x-2,b.y-2,3);
  }
}
