import { createGame } from './index';
import { createWebPlatform } from '../src/platform/web';
const game=createGame();
const container=document.getElementById('app')!;
void Promise.resolve(game.init({container,platform:createWebPlatform(),settings:{muted:false},
  assetUrl:p=>new URL(p.replace(/^Dance\//,''),location.href).href,reportScore:()=>{},requestExit:()=>{}})).then(()=>game.start()).catch(error=>{
  container.textContent=`ゲームを起動できませんでした。${error.message}`;
});
window.addEventListener('pagehide',event=>{
  if(event.persisted){game.localPaused=true;void game.syncPause();}
  else void game.destroy();
});
