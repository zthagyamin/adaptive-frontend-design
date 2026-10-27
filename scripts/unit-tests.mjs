import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function collect(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);if(entry.isDirectory())return ['assets','vendor','node_modules'].includes(entry.name)?[]:collect(full);return /(?:\.test|^test)\.mjs$/.test(entry.name)?[full]:[];});}
const files=[...collect(path.join(root,'tests')),...collect(path.join(root,'examples'))].sort();
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
