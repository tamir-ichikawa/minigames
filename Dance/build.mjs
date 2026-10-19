import {build} from 'esbuild';
import {mkdir,copyFile,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {serve} from '../scripts/serve.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildDance(out=path.join(root,'Dance/.build')){
 const target=path.join(out,'Dance');await mkdir(target,{recursive:true});
 await copyFile(path.join(root,'Dance/index.html'),path.join(target,'index.html'));
 await cp(path.join(root,'Dance/assets'),path.join(target,'assets'),{recursive:true});
 await build({absWorkingDir:root,entryPoints:['Dance/standalone.ts'],outfile:path.join(target,'dance.js'),bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await buildDance();if(process.argv.includes('--serve'))await serve({root:path.join(root,'Dance/.build'),port:Number(process.env.PORT||4176)});
}
