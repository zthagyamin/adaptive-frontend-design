import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Explicit build-time tool; the generated example has no Sharp runtime dependency.
const sharp=require(process.env.AFD_SHARP_MODULE||'sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../examples/nature-journal/assets');
for(const name of ['tidal-reeds','forest-floor','rain-stone']){
  const original=path.join(root,name+'.png');
  await sharp(original).resize({width:1280,withoutEnlargement:true}).webp({quality:82,effort:6}).toFile(path.join(root,name+'.webp'));
  await sharp(original).webp({quality:94,effort:6}).toFile(path.join(root,name+'-large.webp'));
  console.log(JSON.stringify({name,original:(await fs.stat(original)).size,display:(await fs.stat(path.join(root,name+'.webp'))).size,nearView:(await fs.stat(path.join(root,name+'-large.webp'))).size}));
}
