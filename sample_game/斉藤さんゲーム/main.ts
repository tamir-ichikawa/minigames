import { createGame } from './index';
import { ASSET_ROOT } from './scene';
import { createWebPlatform } from '../../src/platform/web';
const container=document.getElementById('app')!;
const game=createGame();
Promise.resolve(game.init({container,platform:createWebPlatform(),settings:{muted:false},assetUrl:p=>new URL(p.replace(ASSET_ROOT,''),location.href).href,reportScore:()=>{},requestExit:()=>{}})).then(()=>game.start()).catch(error=>{
  container.replaceChildren();const p=document.createElement('p');p.textContent=`ゲームを読み込めませんでした。${error.message}`;container.append(p);
});
