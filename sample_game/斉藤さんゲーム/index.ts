import Phaser from 'phaser';
import type { GameContext, GameModule, Score } from '../../src/core/types';
import { MaroScene, ASSET_ROOT } from './scene';
import { WIDTH, HEIGHT } from './model';

export function createGame({managed=false}:{managed?:boolean}={}):GameModule {
  let ctx:GameContext,game:Phaser.Game|undefined,scene:MaroScene|undefined,shell:HTMLElement;
  let observer:ResizeObserver|undefined,unsubscribe:(()=>void)|undefined,abort:AbortController;
  let score:Score|null=null;
  const api:GameModule={
    async init(context){
      ctx=context;abort=new AbortController();
      ctx.container.innerHTML=`<section class="maro-shell"><header class="maro-header"><a class="maro-brand" href="#" aria-label="マロの大冒険"><span class="maro-brand-icon">✦</span><span>マロの大冒険<small>MARO’S LITTLE ADVENTURE</small></span></a><nav aria-label="ゲーム操作"><button type="button" data-maro-action="pause" disabled>Ⅱ 休憩</button><button type="button" data-control="sound" aria-pressed="${ctx.settings.muted}" ${managed?'hidden':''}>音 OFF</button><button type="button" data-control="fullscreen" aria-label="全画面表示">⛶</button></nav></header><div class="maro-hud"><div class="maro-chapter"><span data-stat="stage">01 / 10</span><strong data-stat="title">はぐれた森の小道</strong></div><div class="maro-stats"><div><small>TIME</small><b data-stat="time">0:00</b></div><div><small>ミス</small><b data-stat="misses">0</b></div><div><small>おさかな</small><b data-stat="medals">0 / 30</b></div></div></div><div class="maro-body"><div class="maro-board-wrap"><div class="maro-canvas"></div></div><aside class="maro-journal" aria-label="冒険のヒント"></aside><div class="maro-overlay"><div class="maro-panel"><p>森への道を準備しています…</p></div></div></div><footer class="maro-footer"><p class="maro-hint">ドラッグで移動。指を離すと止まるよ。</p><span>✧ A SMALL JOURNEY HOME</span></footer><p class="maro-live" aria-live="polite"></p></section>`;
      shell=ctx.container.querySelector('.maro-shell')!;
      shell.querySelector('.maro-brand')!.addEventListener('click',e=>e.preventDefault(),{signal:abort.signal});
      const style=document.createElement('link');style.rel='stylesheet';style.href=ctx.assetUrl(ASSET_ROOT+'style.css');
      await new Promise<void>((resolve,reject)=>{style.onload=()=>resolve();style.onerror=()=>reject(new Error('表示スタイルを読み込めませんでした。'));shell.append(style);});
      const board=shell.querySelector<HTMLElement>('.maro-board-wrap')!,mount=shell.querySelector<HTMLElement>('.maro-canvas')!,overlay=shell.querySelector<HTMLElement>('.maro-overlay')!;
      const fitPanel=()=>{
        const panel=overlay.firstElementChild as HTMLElement;
        if(overlay.hidden||!panel||!overlay.clientWidth||!overlay.clientHeight)return;
        panel.style.setProperty('--panel-scale','1');
        const factor=Math.min(1,(overlay.clientHeight-20)/panel.offsetHeight,(overlay.clientWidth-20)/panel.offsetWidth);
        panel.style.setProperty('--panel-scale',String(Math.max(.01,factor)));
      };
      const fit=()=>{
        if(!board.clientWidth||!board.clientHeight)return;
        const scale=Math.min(board.clientWidth/WIDTH,board.clientHeight/HEIGHT);
        mount.style.width=`${WIDTH*scale}px`;mount.style.height=`${HEIGHT*scale}px`;
        if(game?.isBooted&&game.scale.canvas){game.scale.getParentBounds();game.scale.refresh();}scene?.clearInput();fitPanel();
      };
      fit();
      shell.addEventListener('maro-panel-change',()=>requestAnimationFrame(fitPanel),{signal:abort.signal});
      shell.addEventListener('load',fitPanel,{capture:true,signal:abort.signal});
      observer=new ResizeObserver(fit);observer.observe(board);observer.observe(overlay);
      shell.querySelector<HTMLButtonElement>('[data-control="sound"]')!.onclick=()=>api.setSettings({muted:!ctx.settings.muted});
      shell.querySelector<HTMLButtonElement>('[data-control="fullscreen"]')!.onclick=async()=>{
        try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();requestAnimationFrame(fit);}
        catch{shell.querySelector<HTMLElement>('.maro-live')!.textContent='このブラウザーでは全画面表示を利用できません。';}
      };
      await new Promise<void>((resolve,reject)=>{
        const timeout=window.setTimeout(()=>reject(new Error('ゲーム素材の読み込みがタイムアウトしました。')),60000);
        scene=new MaroScene(ctx,shell,()=>{clearTimeout(timeout);resolve();},value=>{score=value;ctx.reportScore(value);},managed);
        game=new Phaser.Game({type:Phaser.AUTO,parent:mount,width:WIDTH,height:HEIGHT,backgroundColor:'#708e63',
          scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,roundPixels:false},
          input:{activePointers:2},scene:[scene],callbacks:{postBoot:g=>{g.sound.mute=ctx.settings.muted;}}});
      });
      fit();api.setSettings(ctx.settings);
      if(!managed)unsubscribe=ctx.platform.onSuspend(()=>{if(scene&&!scene.paused&&['playing','miss'].includes(scene.model.phase))scene.togglePause();});
    },
    start(){game?.canvas.focus();},
    pause(){scene?.setHostPaused(true);if(game){game.input.enabled=false;game.sound.pauseAll();game.pause();}},
    resume(){scene?.setHostPaused(false);if(game){game.resume();game.input.enabled=true;game.sound.resumeAll();game.canvas.focus();}},
    reset(){api.resume();scene?.resetAdventure();},
    async destroy(){
      unsubscribe?.();observer?.disconnect();abort?.abort();
      if(game){const current=game;game=undefined;await new Promise<void>(resolve=>{current.events.once(Phaser.Core.Events.DESTROY,resolve);current.resume();current.loop.wake();current.destroy(true);});}
      ctx.container.replaceChildren();scene=undefined;
    },
    getScore:()=>score,
    setSettings(settings){
      ctx.settings=settings;if(game)game.sound.mute=settings.muted;
      const button=shell.querySelector<HTMLButtonElement>('[data-control="sound"]')!;button.textContent=settings.muted?'音 OFF':'音 ON';button.setAttribute('aria-pressed',String(settings.muted));
    },
  };return api;
}
