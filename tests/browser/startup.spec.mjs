import {expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {test} from './scheduler-fixture.mjs';

// Fixed pre-lazy-loading app from local 6f65f8f / public d1c1ede (same tree).
// The fixture is served only by this test; the current effects and engine are
// identical in both conditions. Compare bytes and observed readiness, not FPS.
const eagerApp=await readFile(new URL('../fixtures/motion-eager-baseline.mjs',import.meta.url),'utf8');
async function observe(browser,viewport,{url,ready,eager=false}){
  const context=await browser.newContext({viewport});
  try{
    const page=await context.newPage();
    await page.addInitScript(()=>{
      window.__startupProbe={cls:0,shifts:[]};
      if(PerformanceObserver.supportedEntryTypes.includes('layout-shift'))new PerformanceObserver(list=>{
        for(const entry of list.getEntries())if(!entry.hadRecentInput){window.__startupProbe.cls+=entry.value;window.__startupProbe.shifts.push({time:entry.startTime,value:entry.value});}
      }).observe({type:'layout-shift',buffered:true});
    });
    if(eager)await page.route('**/app.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:eagerApp}));
    await page.goto(url);await ready(page);
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    return await page.evaluate(()=>{
      const navigation=performance.getEntriesByType('navigation')[0];
      const assets=performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize}));
      return {viewport:{width:innerWidth,height:innerHeight},readyObservationMs:performance.now(),domContentLoadedMs:navigation.domContentLoadedEventEnd,loadMs:navigation.loadEventEnd,initialBytes:navigation.encodedBodySize+assets.reduce((n,r)=>n+r.bytes,0),assets,layoutShift:window.__startupProbe,fontFamily:getComputedStyle(document.body).fontFamily};
    });
  }finally{await context.close();}
}
test('three matched startup samples per example and eager/lazy motion comparison',async({browser,schedulerOrigin},testInfo)=>{
  test.setTimeout(60000);
  const viewport=testInfo.project.use.viewport;
  const cases=[
    {name:'scheduler',url:schedulerOrigin,budget:1.5*1024*1024,ready:async page=>{await expect(page.locator('#new-booking')).toBeEnabled();await expect(page.locator('.date-tab')).toHaveCount(7);}},
    {name:'journal',url:'http://127.0.0.1:3002',budget:1.5*1024*1024,ready:async page=>{await expect.poll(()=>page.locator('.cover-media img').evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);}},
    {name:'motion',url:'http://127.0.0.1:3003',budget:2*1024*1024,ready:async page=>{await expect(page.locator('.scroll-story')).toBeVisible();}}
  ];
  const report={environment:{project:testInfo.project.name,viewport},boundary:'Fresh browser contexts on one CI runner; readiness is observed after the named DOM checks, font readiness and two frames. Layout shifts cover startup only. These values do not prove human-perceived latency, GPU speed or cross-device performance.',examples:{},eagerMotion:[]};
  for(const item of cases){
    const samples=[];
    for(let i=0;i<3;i++){
      const sample=await observe(browser,viewport,item);samples.push(sample);
      expect(sample.initialBytes).toBeGreaterThan(0);expect(sample.initialBytes).toBeLessThanOrEqual(item.budget);
      if(item.name==='motion')expect(sample.assets.some(r=>r.path==='/vendor/three.module.js')).toBe(false);
    }
    report.examples[item.name]=samples;
  }
  for(let i=0;i<3;i++){
    const sample=await observe(browser,viewport,{...cases[2],eager:true});
    expect(sample.assets.some(r=>r.path==='/vendor/three.module.js'&&r.bytes>0)).toBe(true);report.eagerMotion.push(sample);
  }
  await testInfo.attach('matched-startup-observations',{body:JSON.stringify(report,null,2),contentType:'application/json'});
});
