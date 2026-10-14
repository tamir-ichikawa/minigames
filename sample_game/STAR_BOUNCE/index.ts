import Phaser from 'phaser';
import type { GameContext, GameModule, Score } from '../../src/core/types';
import { StoryScene } from './scene';
import { settingsMarkup, setupSettings } from './settings';
export const ASSET_ROOT='sample_game/STAR_BOUNCE/';

/** The collection and standalone preview share the same game lifecycle. */
export function createGame({managed=false}:{managed?:boolean}={}):GameModule {
  let ctx:GameContext,game:Phaser.Game|undefined,scene:StoryScene|undefined,wrapper:HTMLElement,observer:ResizeObserver|undefined,overlayObserver:MutationObserver|undefined;
  let hostPaused=false,resumeAfterHost=false;
  const pauseGame=()=>{if(!game||game.isPaused)return;scene?.clearInput();game.input.enabled=false;game.sound.pauseAll();game.pause();scene?.pausePanel();};
  const resumeGame=()=>{if(!game||!game.isPaused)return;scene?.hidePause();game.resume();game.input.enabled=true;game.sound.resumeAll();game.canvas.focus();};
  let unsubscribe:(()=>void)|undefined,disposeSettings:(()=>void)|undefined,score:Score|null=null;
  const api:GameModule={
    async init(context){
      ctx=context;ctx.container.innerHTML=`<section class="sb-shell"><header class="sb-header"><div><strong>STAR BOUNCE</strong><span class="sb-build">銀河のおやつ争奪戦</span></div><nav aria-label="ゲーム操作"><button data-action="sound" aria-pressed="${ctx.settings.muted}" title="音声切替">${ctx.settings.muted?'音 OFF':'音 ON'}</button><button data-action="settings" aria-label="表示設定">設定</button><button data-action="pause" disabled>一時停止</button><button data-action="fullscreen" aria-label="全画面表示">⛶</button><button data-action="home" title="キャラ選択に戻る">選び直す</button></nav></header><div class="sb-stage"><div class="sb-canvas"><div class="sb-skill-dock" hidden><div class="sb-skill-meter" role="progressbar" aria-label="必殺技ゲージ" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><span class="sb-charge-label">0%</span><button data-action="skill" class="sb-skill" aria-label="必殺技を発動" disabled>✦</button></div></div><div class="sb-overlay"><p>星の旅を準備しています…</p></div></div><footer class="sb-controls" hidden><div class="sb-drag-pad" aria-label="左右にドラッグしてバーを移動"><span>← ここで左右にドラッグ →</span><i></i></div></footer><p class="sb-live" aria-live="polite"></p>${settingsMarkup}</section>`;
      wrapper=ctx.container.querySelector('.sb-shell')!;
      const link=document.createElement('link');link.rel='stylesheet';link.href=ctx.assetUrl(ASSET_ROOT+'style.css');await new Promise<void>((resolve,reject)=>{link.onload=()=>resolve();link.onerror=()=>reject(new Error('表示スタイルを読み込めませんでした。'));wrapper.append(link);});
      const mount=wrapper.querySelector<HTMLElement>('.sb-canvas')!;
      const button=(action:string)=>wrapper.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
      button('sound').hidden=managed;
      button('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await wrapper.requestFullscreen();}catch{wrapper.querySelector<HTMLElement>('.sb-live')!.textContent='このブラウザでは全画面表示に対応していません。';}};
      button('sound').onclick=()=>api.setSettings({muted:!ctx.settings.muted});
      button('pause').onclick=()=>{if(hostPaused){api.resume();return;}if(game?.isPaused)resumeGame();else pauseGame();};
      button('home').onclick=()=>{if(scene?.match?.phase==='playing'){pauseGame();scene.confirmHome(()=>{resumeGame();scene?.menu();},()=>resumeGame());}else{resumeGame();scene?.menu();}};
      await new Promise<void>((resolve,reject)=>{
        const timeout=window.setTimeout(()=>reject(new Error('画像の読み込みが完了しませんでした。再読み込みしてください。')),60000);
        scene=new StoryScene(ctx,wrapper,()=>{clearTimeout(timeout);resolve();},value=>{score=value;ctx.reportScore(value);});
        game=new Phaser.Game({type:Phaser.AUTO,parent:mount,backgroundColor:'#101321',width:mount.clientWidth||480,height:mount.clientHeight||760,scale:{mode:Phaser.Scale.NONE},scene:[scene],input:{activePointers:2},callbacks:{postBoot:g=>{g.sound.mute=ctx.settings.muted;}}});
      });
      disposeSettings=setupSettings(ctx,scene!,wrapper,()=>!!game?.isPaused,pauseGame,()=>{if(!hostPaused)resumeGame();});
      // Scale selection/dialogue as a whole when height is scarce; never hide their action buttons.
      const overlay=wrapper.querySelector<HTMLElement>('.sb-overlay')!;
      const fitOverlay=()=>{
        const panel=overlay.firstElementChild as HTMLElement|null;
        if(!panel||overlay.hidden||!overlay.clientHeight)return;
        const scale=Math.min(1,(overlay.clientHeight-16)/panel.offsetHeight,(overlay.clientWidth-16)/panel.offsetWidth);
        panel.style.transform=`translate(-50%,-50%) scale(${Math.max(.01,scale)})`;
      };
      // Container changes also happen when the menu reveals the touch pad.
      // This observer owns canvas sizing; Phaser must not reuse its cached parent size.
      observer=new ResizeObserver(()=>{if(game&&mount.clientWidth&&mount.clientHeight)game.scale.resize(mount.clientWidth,mount.clientHeight);fitOverlay();});
      observer.observe(mount);observer.observe(overlay);
      overlayObserver=new MutationObserver(fitOverlay);overlayObserver.observe(overlay,{childList:true,subtree:true});fitOverlay();
      if(!managed)unsubscribe=ctx.platform.onSuspend(()=>{if(scene?.match?.phase==='playing'&&!game?.isPaused)api.pause();});
    },
    start(){game?.canvas.focus();},
    pause(){if(hostPaused)return;hostPaused=true;resumeAfterHost=!game?.isPaused;pauseGame();},
    resume(){hostPaused=false;if(resumeAfterHost)resumeGame();resumeAfterHost=false;},
    reset(){hostPaused=false;wrapper.querySelector<HTMLDialogElement>('.sb-settings')?.close();resumeGame();scene?.menu();},
    async destroy(){disposeSettings?.();unsubscribe?.();observer?.disconnect();overlayObserver?.disconnect();if(game){const current=game;game=undefined;await new Promise<void>(resolve=>{current.events.once(Phaser.Core.Events.DESTROY,resolve);current.resume();current.loop.wake();current.destroy(true);});}ctx.container.replaceChildren();scene=undefined;},
    getScore:()=>score,
    setSettings(settings){ctx.settings=settings;if(game)game.sound.mute=settings.muted;const button=wrapper.querySelector<HTMLButtonElement>('[data-action="sound"]')!;button.textContent=settings.muted?'音 OFF':'音 ON';button.setAttribute('aria-pressed',String(settings.muted));ctx.platform.storage.write('star-bounce-story:settings',settings);}
  };return api;
}
