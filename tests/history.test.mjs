import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {stations,seasons,notes,species} from '../examples/migration-field-guide/data.js';
import {createReaderHistory} from '../examples/migration-field-guide/history.mjs';

// Run the production event handlers; only browser surfaces are stand-ins.
const source=await readFile(new URL('../examples/migration-field-guide/app.js',import.meta.url),'utf8');
function page({hash='#notes',state=null}={}){
  const elements=new Map(),listeners=new Map(),focused=[];
  function element(key){if(!elements.has(key))elements.set(key,{open:false,disabled:false,isConnected:true,dataset:{},style:{},classList:{add(){},toggle(){}},addEventListener(type,fn){this[type]=fn},setAttribute(){},querySelectorAll(){return[]},querySelector(){return element(key+' h2')},getBoundingClientRect(){return{top:80,bottom:120,left:0,right:400}},matches(){return false},focus(){focused.push(key)},scrollIntoView(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(key)}
  const document={querySelector:element,querySelectorAll:()=>[],addEventListener(type,fn){listeners.set('document:'+type,fn)},body:{style:{}},documentElement:{classList:{toggle(){}}}};
  const entries=[{hash:'#outside',state:null},{hash,state}],location={pathname:'/guide/',search:'',hash};let cursor=1;
  function move(url,nextState,replace){const entry={hash:new URL(url,'https://example.test/guide/').hash,state:structuredClone(nextState)};if(replace)entries[cursor]=entry;else{entries.splice(cursor+1);entries.push(entry);cursor++}location.hash=entry.hash}
  const goCalls=[],history={get state(){return structuredClone(entries[cursor].state)},replaceState(s,_,url){move(url,s,true)},pushState(s,_,url){move(url,s,false)},go(delta){goCalls.push(delta);const next=cursor+delta;if(next<0||next>=entries.length)return;cursor=next;location.hash=entries[cursor].hash;listeners.get('popstate')?.()}};
  const window={addEventListener(type,fn){listeners.set(type,fn)}};
  const sandbox={stations,seasons,notes,species,createReaderHistory,document,location,history,window,URLSearchParams,matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame:fn=>fn(),innerHeight:800,IntersectionObserver:class{observe(){}unobserve(){}},console:{error(){}},crypto:globalThis.crypto};
  vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,''),sandbox,{filename:'app.js',importModuleDynamically:async()=>{throw new Error('Map rendering is outside these history tests')}});
  return{history,location,goCalls,focused,reader:element('#reader'),click(hash,from='notes'){const a={hash,dataset:{},target:'',isConnected:true,closest:()=>({id:from}),hasAttribute:()=>false,getBoundingClientRect:()=>({top:80,bottom:120}),matches:()=>true,focus:()=>focused.push('#source-'+from)};listeners.get('document:click')({target:{closest:()=>a},button:0,preventDefault(){}})},close(){element('#reader-close').click()},back(){history.go(-1)},forward(){history.go(1)}};
}

test('a direct detail and related details close to the manual, never another detail',()=>{
  const p=page({hash:'#/note/reed-1018?from=notes'});
  p.click('#/species/wader?from=notes');p.click('#/note/sand-1021?from=notes');p.close();
  assert.equal(p.location.hash,'#notes');assert.equal(p.reader.open,false);assert.deepEqual(p.goCalls,[]);
});

test('in-site entry retains its real origin through related details and back/forward',()=>{
  const p=page({hash:'#routes'});
  p.click('#/note/reed-1018?from=routes&season=autumn&station=reed','routes');
  p.click('#/species/wader?from=routes&season=autumn&station=reed');
  p.click('#/note/sand-1021?from=routes&season=autumn&station=reed');
  p.back();assert.match(p.location.hash,/^#\/species\/wader/);assert.equal(p.reader.open,true);
  p.forward();assert.match(p.location.hash,/^#\/note\/sand-1021/);
  p.close();assert.equal(p.location.hash,'#routes');assert.equal(p.reader.open,false);assert.equal(p.goCalls.at(-1),-3);
  assert.ok(p.focused.includes('#reader-title'));assert.ok(p.focused.includes('#source-routes'));
});

test('a refreshed or unknown depth is not authority to leave this document',()=>{
  for(const state of [{fieldReaderDepth:8},{fieldReaderDepth:1},{fieldReaderDepth:-1},null]){
    const p=page({hash:'#/species/wader?from=species',state});p.close();
    assert.equal(p.location.hash,'#species');assert.equal(p.reader.open,false);assert.deepEqual(p.goCalls,[]);
    const related=page({hash:'#/species/wader?from=species',state});related.click('#/note/reed-1018?from=species');related.close();
    assert.equal(related.location.hash,'#species');assert.equal(related.reader.open,false);assert.deepEqual(related.goCalls,[]);
  }
});

test('browser back and forward still traverse details, then restore the source focus',()=>{
  const p=page();p.click('#/note/reed-1018?from=notes');p.click('#/species/wader?from=notes');
  p.back();assert.match(p.location.hash,/^#\/note\/reed-1018/);assert.equal(p.reader.open,true);
  p.back();assert.equal(p.location.hash,'#notes');assert.equal(p.reader.open,false);
  p.forward();assert.match(p.location.hash,/^#\/note\/reed-1018/);assert.equal(p.reader.open,true);
  p.close();assert.equal(p.location.hash,'#notes');assert.equal(p.reader.open,false);
});

test('serialized entries from a previous document or a different address cannot authorize go',()=>{
  const first=createReaderHistory('first'),origin=first.origin('#routes');
  const detail=first.detail(origin,'#routes','#/note/reed-1018');
  const refreshed=createReaderHistory('refreshed');
  assert.deepEqual(refreshed.close(structuredClone(detail),'#/note/reed-1018','#routes'),{hash:'#routes'});
  assert.deepEqual(first.close(detail,'#/species/wader','#notes'),{hash:'#notes'});
  assert.deepEqual(first.close(detail,'#/note/reed-1018','#routes','#species'),{hash:'#species'});
});
