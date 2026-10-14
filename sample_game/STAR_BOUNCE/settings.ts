import type { GameContext } from '../../src/core/types';
import type { StoryScene } from './scene';
import presets from './swing-presets.json';

export const settingsMarkup=`<dialog class="sb-settings" aria-labelledby="sb-settings-title">
  <h2 id="sb-settings-title">表示とサウンド</h2>
  <div class="sb-settings-tabs" role="tablist" aria-label="設定の種類"><button role="tab" data-settings-tab="visual" aria-controls="sb-visual" aria-selected="true">背景</button><button role="tab" data-settings-tab="audio" aria-controls="sb-audio" aria-selected="false">返球音を選ぶ</button></div>
  <section id="sb-visual" role="tabpanel" aria-label="背景の設定"><p>重く感じるときは「一枚絵」に。</p><div class="sb-background-options"><button data-background="layered">立体・動く<span>3層の動き・流れる光・DARKの歪み</span></button><button data-background="still">軽量・一枚絵<span>背景の動きと歪みを止めます</span></button></div><p class="sb-settings-note">切り替えても得点や球の位置はそのまま。設定は保存されます。</p></section>
  <section id="sb-audio" role="tabpanel" aria-label="返球音の設定" hidden><p>候補を押すと試聴・採用。あとで何度でも変更できます。</p><div class="sb-swing-options">${presets.map(p=>`<button data-swing="${p.id}">${p.label}<span>${p.description}</span></button>`).join('')}</div><div class="sb-preview-buttons"><button data-preview="good">▶ GOODで試聴</button><button data-preview="dark">▶ DARKで試聴</button></div><p class="sb-preview-status" role="status">試聴は音OFF中も鳴ります。DARKは少し低い音です。</p></section>
  <button data-action="close-settings">閉じる</button></dialog>`;

/** Preview has its own audio element: pausing/muting gameplay never blocks an explicit audition. */
export function setupSettings(ctx:GameContext,scene:StoryScene,wrapper:HTMLElement,paused:()=>boolean,pause:()=>void,resume:()=>void){
  const dialog=wrapper.querySelector<HTMLDialogElement>('.sb-settings')!,preview=new Audio();preview.volume=.35;
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  const status=dialog.querySelector<HTMLElement>('.sb-preview-status')!;
  let resumeAfter=false,side='good',version=0,disposed=false;
  const stop=()=>{version++;preview.pause();preview.removeAttribute('src');preview.load();};
  const sync=()=>{
    wrapper.querySelectorAll<HTMLButtonElement>('[data-background]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.background===scene.backgroundMode)));
    wrapper.querySelectorAll<HTMLButtonElement>('[data-swing]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.swing===scene.swingPreset)));
  };
  const play=()=>{
    stop();const current=version;
    preview.src=ctx.assetUrl(`sample_game/STAR_BOUNCE/assets/swing-${scene.swingPreset}-${side}.wav`);
    status.textContent=`${presets.find(p=>p.id===scene.swingPreset)!.label} · ${side.toUpperCase()} を試聴`;
    preview.play().catch(()=>{if(!disposed&&version===current)status.textContent='再生できませんでした。試聴ボタンをもう一度押してください。';});
  };
  wrapper.querySelector<HTMLButtonElement>('[data-action=settings]')!.onclick=()=>{resumeAfter=scene.match?.phase==='playing'&&!paused();if(resumeAfter)pause();sync();dialog.showModal();};
  dialog.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(b=>b.onclick=()=>{
    stop();const tab=b.dataset.settingsTab;
    dialog.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));
    dialog.querySelector<HTMLElement>('#sb-visual')!.hidden=tab!=='visual';dialog.querySelector<HTMLElement>('#sb-audio')!.hidden=tab!=='audio';
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-background]').forEach(b=>b.onclick=()=>{scene.setBackgroundMode(b.dataset.background==='still'?'still':'layered');sync();});
  dialog.querySelectorAll<HTMLButtonElement>('[data-swing]').forEach(b=>b.onclick=()=>{scene.setSwingPreset(b.dataset.swing!);sync();play();});
  dialog.querySelectorAll<HTMLButtonElement>('[data-preview]').forEach(b=>b.onclick=()=>{side=b.dataset.preview!;play();});
  dialog.querySelector<HTMLButtonElement>('[data-action=close-settings]')!.onclick=()=>dialog.close();
  dialog.onclose=()=>{stop();if(resumeAfter)resume();resumeAfter=false;};
  const unsubscribe=ctx.platform.onSuspend(stop);
  return ()=>{disposed=true;dialog.onclose=null;unsubscribe();stop();};
}
