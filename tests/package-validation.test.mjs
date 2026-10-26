import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {validatePackage} from '../scripts/validate.mjs';

const root=path.resolve('package-fixture');
function fixture(changes={}) {
  const entries={
    'package.json':JSON.stringify({name:'adaptive-frontend-design',version:'0.1.0',license:'Apache-2.0'}),
    'plugin.json':JSON.stringify({name:'adaptive-frontend-design',version:'0.1.0',license:'Apache-2.0'}),
    'LICENSE':'Apache-2.0',NOTICE:'Attribution',
    'README.md':'# Package\n[Chinese](README.zh-CN.md#中文标题)\n[Local](#package)\n[HTML](page.html#detail)\n',
    'README.zh-CN.md':'# 中文标题\n',
    'page.html':'<section id="detail"></section>',
    'skills/adaptive-frontend-design/SKILL.md':'---\nname: adaptive-frontend-design\ndescription: Test fixture\n---\n# Entry\n[Source](SOURCES.md)\n',
    'skills/adaptive-frontend-design/SOURCES.md':'# Sources\n',
    'skills/adaptive-frontend-design/references/guide.md':'# Guide\n[Source](../SOURCES.md)\n',
    'skills/adaptive-frontend-design/agents/openai.yaml':'interface:\n  icon_small: ./assets/icon.svg\n  icon_large: "./assets/icon.svg" # Local icon\n',
    'skills/adaptive-frontend-design/assets/icon.svg':'<svg></svg>',
    'examples/migration-field-guide/assets/THREE-LICENSE.txt':'MIT',
    ...Object.fromEntries(Array.from({length:8},(_,i)=>[`skills/adaptive-frontend-design/licenses/license-${i}.txt`,'Retained license'])),
    ...changes,
  };
  const files=new Map(Object.entries(entries).filter(([,value])=>value!==null).map(([name,value])=>[path.join(root,name),value]));
  const missing=name=>Object.assign(new Error('Missing fixture file: '+name),{code:'ENOENT'});
  const io={
    async readFile(name){if(!files.has(name))throw missing(name);return files.get(name)},
    async access(name){if(!files.has(name))throw missing(name)},
    async readdir(dir){
      const children=new Map();
      for(const name of files.keys())if(name.startsWith(dir+path.sep)){
        const rest=name.slice(dir.length+1),child=rest.split(path.sep)[0],directory=rest.includes(path.sep);
        children.set(child,{name:child,isDirectory:()=>directory,isSymbolicLink:()=>false});
      }
      return [...children.values()];
    },
  };
  return {root,io};
}

test('complete package accepts Chinese headings, local fragments, HTML ids, and quoted icon paths',async()=>{
  const result=await validatePackage(fixture());
  assert.deepEqual(result.failures,[]);
  assert.equal(result.ok,true);
});

test('missing Markdown fragments fail for local and cross-file links',async()=>{
  const result=await validatePackage(fixture({'README.md':'# Package\n[Missing](#gone)\n[Chinese](README.zh-CN.md#不存在)'}));
  assert.equal(result.ok,false);
  assert.equal(result.failures.filter(value=>value.includes('missing anchor')).length,2);
});

test('anchors follow duplicate headings, heading formatting, setext headings, and explicit HTML ids',async()=>{
  const result=await validatePackage(fixture({'README.md':'# Heading  \n# Heading\n## **中文** `标题`\nSetext heading\n---\n<a id="custom-id"></a>\n[Duplicate](#heading-1)\n[Formatted](#中文-标题)\n[Setext](#setext-heading)\n[Explicit](#custom-id)'}));
  assert.deepEqual(result.failures,[]);
});

test('code samples are ignored as links and do not create real anchors',async()=>{
  const result=await validatePackage(fixture({'README.md':'# Package\n```md\n[Example](absent.md)\n# Fake\n```\n~~~md\n[Example](also-absent.md)\n~~~\n`[Inline](missing.md)`\n`<a id="inline-example"></a>`\n[Real](#fake)\n[Real inline](#inline-example)'}));
  assert.equal(result.failures.length,2);
  assert.match(result.failures[0],/missing anchor.*fake/);
  assert.match(result.failures[1],/missing anchor.*inline-example/);
});

test('invalid percent encoding is reported instead of aborting validation',async()=>{
  const result=await validatePackage(fixture({'README.md':'[Bad](README.zh-CN.md#%XX)'}));
  assert.equal(result.ok,false);
  assert.ok(result.failures.some(value=>value.includes('invalid link encoding')));
});

test('package and plugin must keep matching versions without a hardcoded release number',async()=>{
  const mismatched=await validatePackage(fixture({'package.json':JSON.stringify({name:'adaptive-frontend-design',version:'0.2.0',license:'Apache-2.0'})}));
  assert.ok(mismatched.failures.some(value=>value.includes('version mismatch')));
  const next=JSON.stringify({name:'adaptive-frontend-design',version:'0.2.0',license:'Apache-2.0'});
  assert.deepEqual((await validatePackage(fixture({'package.json':next,'plugin.json':next}))).failures,[]);
});

test('missing and escaping icon paths fail while retained skill links stay self-contained',async()=>{
  const missing=await validatePackage(fixture({'skills/adaptive-frontend-design/assets/icon.svg':null}));
  assert.equal(missing.failures.filter(value=>value.includes('missing icon')).length,2);
  const outside=await validatePackage(fixture({'skills/adaptive-frontend-design/agents/openai.yaml':'interface:\n  icon_small: ../../README.md'}));
  assert.ok(outside.failures.some(value=>value.includes('icon leaves installable skill')));
  const link=await validatePackage(fixture({'skills/adaptive-frontend-design/SKILL.md':'---\nname: adaptive-frontend-design\ndescription: Fixture\n---\n[Outside](../../README.md)'}));
  assert.ok(link.failures.some(value=>value.includes('installable-skill link leaves its folder')));
});

test('invalid JSON and required attribution failures are collected without crashing',async()=>{
  const result=await validatePackage(fixture({'plugin.json':'{','NOTICE':null,'skills/adaptive-frontend-design/references/guide.md':'# Guide'}));
  assert.ok(result.failures.some(value=>value.includes('invalid JSON')));
  assert.ok(result.failures.some(value=>value.includes('NOTICE: missing required file')));
  assert.ok(result.failures.some(value=>value.includes('source/modification notice missing')));
});

test('JSON null does not bypass package or plugin identity checks',async()=>{
  const result=await validatePackage(fixture({'plugin.json':'null','package.json':'null'}));
  assert.ok(result.failures.some(value=>value.includes('Unexpected plugin identity')));
  assert.ok(result.failures.some(value=>value.includes('Unexpected package identity')));
});
