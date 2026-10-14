import { createGame } from './index';
import { createWebPlatform } from '../../src/platform/web';
const platform=createWebPlatform(),game=createGame(),container=document.getElementById('app')!;
const stored=platform.storage.read<{muted:boolean}>('star-bounce-story:settings',{muted:false});
game.init({container,platform,settings:{muted:stored?.muted===true},assetUrl:path=>new URL(path.replace(/^sample_game\/STAR_BOUNCE\//,''),location.href).href,reportScore:()=>{},requestExit:()=>{void game.reset();}})?.then(()=>game.start()).catch(async error=>{await game.destroy();container.textContent=`起動できませんでした。${error.message}`;});
