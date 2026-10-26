import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const skill=path.join(root,'skills/adaptive-frontend-design');
const failures=[];
async function files(dir){let result=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(['.git','node_modules','dist','coverage'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isSymbolicLink()){failures.push(path.relative(root,full)+': unexpected symlink');continue;}if(entry.isDirectory())result.push(...await files(full));else result.push(full);}return result;}
const all=await files(root),markdown=all.filter(p=>p.endsWith('.md'));
for(const p of all){const ext=path.extname(p),relative=path.relative(root,p).replaceAll('\\','/');if(ext==='.json')try{JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));}catch{failures.push(relative+': invalid JSON');}
  if(!['.md','.mjs','.js','.json','.yaml','.yml','.svg','.html','.css'].includes(ext)||relative.endsWith('vendor/three.module.js'))continue;
  const text=await fs.readFile(p,'utf8');
  const checks=[['machine-home-path',/[A-Z]:[\\/]Users[\\/][^\s\\/]+/i],['private-drive-link',/drive\.google\.com\/(?:file\/d|drive\/folders)\//i],['private-session-reference',/(?:codex-thread:|rollout_summaries\/|archived_sessions\/)/i],['private-identifier',/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i]];
  for(const [category,pattern] of checks){if(relative==='scripts/validate.mjs'&&category==='private-session-reference')continue; // This file declares those literal exclusion patterns, not a session record.
    if(pattern.test(text))failures.push(relative+': '+category);}
}
let linkCount=0;
for(const p of markdown){const text=(await fs.readFile(p,'utf8')).replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm,'');for(const match of text.matchAll(/(!?)\[[^\]]*\]\(([^)]+)\)/g)){let target=match[2].replace(/^<|>$/g,'').split('#')[0];if(!target||/^[a-z][a-z0-9+.-]*:/i.test(target))continue;target=target.replace(/\s+["'][^"']*["']$/,'');const full=path.resolve(path.dirname(p),decodeURIComponent(target));if(full!==root&&!full.startsWith(root+path.sep)){failures.push(path.relative(root,p)+': link leaves repository');continue;}if(p.startsWith(skill+path.sep)&&full!==skill&&!full.startsWith(skill+path.sep)){failures.push(path.relative(root,p)+': installable-skill link leaves its folder');continue;}try{await fs.access(full);linkCount++;if(match[1]&&!/\.(?:png|jpe?g|svg|webp|gif)$/i.test(full))failures.push(path.relative(root,p)+': image target is not an image');}catch{failures.push(path.relative(root,p)+': missing relative target '+target);}}}
const entry=await fs.readFile(path.join(skill,'SKILL.md'),'utf8');const front=entry.match(/^---\r?\n([\s\S]*?)\r?\n---/);if(!front||!/^name: adaptive-frontend-design\s*$/m.test(front[1])||!/^description: .+/m.test(front[1]))failures.push('Skill name/description missing');
for(const p of markdown.filter(p=>p.includes(path.sep+'references'+path.sep)))if(!(await fs.readFile(p,'utf8')).includes('../SOURCES.md'))failures.push(path.relative(root,p)+': source/modification notice missing');
for(const required of ['LICENSE','NOTICE','README.md','README.zh-CN.md','plugin.json','skills/adaptive-frontend-design/SOURCES.md','examples/migration-field-guide/assets/THREE-LICENSE.txt'])try{await fs.access(path.join(root,required));}catch{failures.push(required+': missing required file');}
const licenses=all.filter(p=>p.startsWith(path.join(skill,'licenses')+path.sep));if(licenses.length!==8)failures.push('Expected eight retained upstream license/NOTICE files');
const plugin=JSON.parse(await fs.readFile(path.join(root,'plugin.json'),'utf8'));if(plugin.name!=='adaptive-frontend-design'||plugin.version!=='0.1.0'||plugin.license!=='Apache-2.0')failures.push('Unexpected plugin identity');
if(failures.length){for(const failure of failures)console.error(failure);process.exitCode=1;}else console.log(JSON.stringify({ok:true,files:all.length,markdown:markdown.length,relativeLinks:linkCount,upstreamLicenseFiles:licenses.length,note:'Structural/exclusion checks, not a complete privacy or behavioral audit'},null,2));
