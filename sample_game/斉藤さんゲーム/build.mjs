import { build, context } from 'esbuild';
import { cp,mkdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../scripts/serve.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
export async function buildMaro(destination){
  const out=path.join(destination,'sample_game/maro-adventure');
  await mkdir(out,{recursive:true});
  for(const name of ['index.html','style.css','assets'])await cp(path.join(here,name),path.join(out,name),{recursive:true});
  await build({entryPoints:[path.join(here,'main.ts')],outfile:path.join(out,'app.js'),bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,logLevel:'warning'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const out=path.join(here,'.build');await mkdir(out,{recursive:true});
  const copy=async()=>{for(const name of ['index.html','style.css','assets'])await cp(path.join(here,name),path.join(out,name),{recursive:true});};
  await copy();
  const options={entryPoints:[path.join(here,'main.ts')],outfile:path.join(out,'app.js'),bundle:true,format:'esm',target:'es2022',sourcemap:true};
  if(process.argv.includes('--serve')){
    const bundler=await context(options);await bundler.watch();
    const server=await serve({root:out,port:Number(process.env.MARO_PORT||4175)});
    let timer;const watcher=watch(here,{recursive:true},(_e,file)=>{if(file&&!file.startsWith('.build/')&&!file.endsWith('.ts')){clearTimeout(timer);timer=setTimeout(()=>copy().catch(console.error),150);}});
    const close=async()=>{watcher.close();clearTimeout(timer);server.close();await bundler.dispose();process.exit();};process.on('SIGINT',close);process.on('SIGTERM',close);
  }else await build(options);
}
