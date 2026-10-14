import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { serve } from '../../scripts/serve.mjs';
import { writeChimes, writeSwings } from './audio.mjs';
const here=fileURLToPath(new URL('.',import.meta.url)),out=path.join(here,'.build');
await mkdir(out,{recursive:true});
async function staticFiles(){for(const name of ['index.html','style.css','assets'])await cp(path.join(here,name),path.join(out,name),{recursive:true,filter:f=>!f.endsWith('.DS_Store')});}
await rm(path.join(out,'assets'),{recursive:true,force:true});
await writeChimes(new URL('./.build/assets/',import.meta.url));
await writeSwings(new URL('./.build/assets/',import.meta.url));
await staticFiles();
const options={entryPoints:[path.join(here,'main.ts')],outfile:path.join(out,'app.js'),bundle:true,format:'esm',target:'es2022',sourcemap:true,logLevel:'info'};
if(process.argv.includes('--serve')){
  const bundler=await context(options);await bundler.watch();
  const server=await serve({root:out,port:Number(process.env.STAR_BOUNCE_PORT||4174)});
  let timer;const watcher=watch(here,{recursive:true},(_event,file)=>{if(!file||file.startsWith('.build/'))return;if(!file.endsWith('.ts')){clearTimeout(timer);timer=setTimeout(()=>staticFiles().catch(console.error),150);}});
  const close=async()=>{watcher.close();clearTimeout(timer);server.close();await bundler.dispose();process.exit();};process.on('SIGINT',close);process.on('SIGTERM',close);
}else{await build(options);console.log('Standalone build ready in sample_game/STAR_BOUNCE/.build.');}
