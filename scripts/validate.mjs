import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {anchorsFor,markdownLinks} from './lib/markdown.mjs';

const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inside=(parent,target)=>target===parent||target.startsWith(parent+path.sep);
const localTarget=target=>!(/^[a-z][a-z0-9+.-]*:/i.test(target)||target.startsWith('//'));

export async function validatePackage({root=defaultRoot,io=fs}={}) {
  root=path.resolve(root);
  const skill=path.join(root,'skills/adaptive-frontend-design'),failures=[],contents=new Map(),json=new Map();
  const relative=target=>path.relative(root,target).replaceAll('\\','/');
  const read=async target=>{if(!contents.has(target))contents.set(target,await io.readFile(target,'utf8'));return contents.get(target);};
  async function files(dir){
    const result=[];
    for(const entry of await io.readdir(dir,{withFileTypes:true})){
      if(['.git','node_modules','dist','coverage','.test-artifacts','playwright-report','test-results'].includes(entry.name))continue;
      const full=path.join(dir,entry.name);
      if(entry.isSymbolicLink()){failures.push(relative(full)+': unexpected symlink');continue;}
      if(entry.isDirectory())result.push(...await files(full));else result.push(full);
    }
    return result;
  }
  const all=await files(root),markdown=all.filter(target=>target.endsWith('.md'));
  for(const target of all){
    const ext=path.extname(target),name=relative(target);
    if(ext==='.json')try{json.set(name,JSON.parse((await read(target)).replace(/^\uFEFF/,'')));}catch{failures.push(name+': invalid JSON');}
    if(!['.md','.mjs','.js','.json','.yaml','.yml','.svg','.html','.css'].includes(ext)||name.endsWith('vendor/three.module.js'))continue;
    const text=await read(target);
    const checks=[['machine-home-path',/[A-Z]:[\\/]Users[\\/][^\s\\/]+/i],['private-drive-link',/drive\.google\.com\/(?:file\/d|drive\/folders)\//i],['private-session-reference',/(?:codex-thread:|rollout_summaries\/|archived_sessions\/)/i],['private-identifier',/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i]];
    for(const [category,pattern] of checks){
      if(name==='scripts/validate.mjs'&&category==='private-session-reference')continue; // These literals declare exclusions, not a session record.
      if(pattern.test(text))failures.push(name+': '+category);
    }
  }
  let linkCount=0;
  const anchorCache=new Map();
  for(const document of markdown)for(const {target,image} of markdownLinks(await read(document))){
    if(!target||!localTarget(target))continue;
    const hash=target.indexOf('#'),filePart=(hash<0?target:target.slice(0,hash)).split('?')[0];
    let filename,fragment;
    try{filename=decodeURIComponent(filePart);fragment=hash<0?'':decodeURIComponent(target.slice(hash+1));}
    catch{failures.push(relative(document)+': invalid link encoding '+target);continue;}
    const full=filename?path.resolve(path.dirname(document),filename):document;
    if(!inside(root,full)){failures.push(relative(document)+': link leaves repository');continue;}
    if(inside(skill,document)&&!inside(skill,full)){failures.push(relative(document)+': installable-skill link leaves its folder');continue;}
    try{await io.access(full);}catch{failures.push(relative(document)+': missing relative target '+target);continue;}
    linkCount++;
    if(image&&!/\.(?:png|jpe?g|svg|webp|gif)$/i.test(full))failures.push(relative(document)+': image target is not an image');
    if(fragment&&/\.(?:md|html?|svg)$/i.test(full)){
      if(!anchorCache.has(full))anchorCache.set(full,anchorsFor(await read(full),{markdown:full.endsWith('.md')}));
      if(!anchorCache.get(full).has(fragment))failures.push(relative(document)+': missing anchor '+target);
    }
  }
  let entry='';
  try{entry=await read(path.join(skill,'SKILL.md'));}catch{failures.push('skills/adaptive-frontend-design/SKILL.md: missing required file');}
  const front=entry.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if(!front||!/^name: adaptive-frontend-design\s*$/m.test(front[1])||!/^description: .+/m.test(front[1]))failures.push('Skill name/description missing');
  for(const document of markdown.filter(target=>target.includes(path.sep+'references'+path.sep)))if(!(await read(document)).includes('../SOURCES.md'))failures.push(relative(document)+': source/modification notice missing');
  for(const required of ['LICENSE','NOTICE','README.md','README.zh-CN.md','package.json','plugin.json','skills/adaptive-frontend-design/SOURCES.md','examples/migration-field-guide/assets/THREE-LICENSE.txt'])try{await io.access(path.join(root,required));}catch{failures.push(required+': missing required file');}
  const licenses=all.filter(target=>target.startsWith(path.join(skill,'licenses')+path.sep));
  if(licenses.length!==8)failures.push('Expected eight retained upstream license/NOTICE files');
  const plugin=json.get('plugin.json'),pkg=json.get('package.json');
  if(json.has('plugin.json')&&(!plugin||plugin.name!=='adaptive-frontend-design'||plugin.license!=='Apache-2.0'))failures.push('Unexpected plugin identity');
  if(json.has('package.json')&&(!pkg||pkg.name!=='adaptive-frontend-design'||pkg.license!=='Apache-2.0'))failures.push('Unexpected package identity');
  if(plugin&&pkg&&(!/^\d+\.\d+\.\d+(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?$/i.test(pkg.version)||pkg.version!==plugin.version))failures.push('package.json/plugin.json: version mismatch or invalid version');
  const metadata=path.join(skill,'agents/openai.yaml');
  if(all.includes(metadata))for(const match of (await read(metadata)).matchAll(/^\s+(icon_(?:small|large)):\s*(.*?)\s*$/gm)){
    let icon=match[2].replace(/\s+#.*$/,'');
    try{
      if(icon.startsWith('"'))icon=JSON.parse(icon);
      else if(icon.startsWith("'")){if(!icon.endsWith("'"))throw new Error('Unclosed icon path');icon=icon.slice(1,-1).replaceAll("''","'");}
    }catch{failures.push(relative(metadata)+': invalid '+match[1]+' path');continue;}
    if(!icon||!localTarget(icon)){failures.push(relative(metadata)+': icon must be a local path');continue;}
    const full=path.resolve(skill,icon);
    if(!inside(skill,full)){failures.push(relative(metadata)+': icon leaves installable skill');continue;}
    try{await io.access(full);}catch{failures.push(relative(metadata)+': missing icon '+icon);}
  }
  return {ok:failures.length===0,failures,files:all.length,markdown:markdown.length,relativeLinks:linkCount,upstreamLicenseFiles:licenses.length,note:'Structural/exclusion checks, not a complete privacy or behavioral audit'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const {failures,...summary}=await validatePackage();
    if(failures.length){for(const failure of failures)console.error(failure);process.exitCode=1;}
    else console.log(JSON.stringify(summary,null,2));
  }catch(error){console.error('Package validation failed: '+error.message);process.exitCode=1;}
}
