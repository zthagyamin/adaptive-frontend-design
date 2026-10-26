import {test,expect} from '@playwright/test';
import {expectAccessible,expectNoPageOverflow} from './helpers.mjs';
const root='http://127.0.0.1:3003';
const layoutFrames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const activeMetrics=page=>page.locator('#measurement-active').evaluate(el=>Object.fromEntries([...el.querySelectorAll('dt')].map(dt=>[dt.textContent,dt.nextElementSibling.textContent])));
test('surface keeps a DOM hold through its feedback layout, and release settles',async({page})=>{
  await page.goto(root);await page.locator('#tab-surface').click();await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('.failure')).toHaveCount(0);
  await page.getByRole('button',{name:'Hold a lift',exact:true}).click();await layoutFrames(page);
  await expect(page.locator('[data-hold]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.status')).toContainText('Holding');
  await page.getByRole('button',{name:'Release patch',exact:true}).click();await expect(page.locator('[data-hold]')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.status')).toContainText('At rest',{timeout:10000});
});
test('particle strength and low quality change the actual controls and drawn field',async({page})=>{
  await page.goto(root);await page.locator('#tab-particles').click();await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('slider',{name:'Field input strength',exact:true}).press('End');
  await expect(page.locator('[data-strength-value]')).toHaveText('2.0');
  await page.getByRole('button',{name:'Push right →',exact:true}).click();await layoutFrames(page);
  await page.getByRole('combobox',{name:'Particle quality',exact:true}).selectOption('low');await expect(page.locator('[data-count]')).toHaveText('1,200 POINTS');
  await page.getByRole('button',{name:'Stir left ↶',exact:true}).click();await layoutFrames(page);
  await expect(page.locator('.failure')).toHaveCount(0);await expectNoPageOverflow(page);
  if(page.viewportSize().width<=650){
    const explanation=await page.locator('.controls>div').first().boundingBox();
    const firstInput=await page.locator('.controls>label').first().boundingBox();
    expect(firstInput.y).toBeGreaterThanOrEqual(explanation.y+explanation.height-.5);
  }
});
test('ten renderer replacements return disposed resources to zero',async({page},testInfo)=>{
  await page.goto(root);
  for(let i=0;i<12;i++){await page.locator(i%2?'#tab-particles':'#tab-surface').click();await expect(page.locator('canvas')).toHaveCount(1);await layoutFrames(page);}
  await page.locator('#developer-measurements summary').click();await page.locator('#snapshot-measurements').click();
  const rows=page.locator('#measurement-disposed tbody tr[data-instance]');expect(await rows.count()).toBeGreaterThanOrEqual(10);
  for(const row of await rows.all()){await expect(row.locator('td').nth(1)).toHaveText('0');await expect(row.locator('td').nth(2)).toHaveText('0');}
  const metrics=await activeMetrics(page);expect(Number(metrics.Geometries)).toBeGreaterThan(0);expect(Number(metrics.Geometries)).toBeLessThanOrEqual(2);
  await testInfo.attach('renderer-resource-observation',{body:JSON.stringify({active:metrics,disposed:await rows.allTextContents()},null,2),contentType:'application/json'});
});
test('reduced motion keeps every chapter and direct shape actions accessible',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(root);
  await expect(page.locator('#reduce-motion')).toBeChecked();await expect(page.locator('.static-story-list')).toBeVisible();await expect(page.locator('.static-story-list article')).toHaveCount(3);
  await page.locator('#tab-surface').click();await page.getByRole('button',{name:'Hold a lift',exact:true}).click();await layoutFrames(page);
  await expect(page.locator('[data-hold]')).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Release patch',exact:true}).click();
  await expect(page.locator('.status')).toContainText('immediately');
});
test('motion states have no serious accessibility violations',async({page})=>{
  await page.goto(root);await expect(page.locator('.scroll-story')).toBeVisible();await expectAccessible(page);
  await page.locator('#tab-surface').click();await expectAccessible(page);
  await page.locator('#tab-particles').click();await expectAccessible(page);
});
test('motion initial resources stay within its separate example byte budget',async({page},testInfo)=>{
  await page.goto(root);await expect(page.locator('.scroll-story')).toBeVisible();
  const resources=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(r=>r.encodedBodySize),assets:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize}))}));
  await testInfo.attach('motion-initial-resource-bytes',{body:JSON.stringify(resources,null,2),contentType:'application/json'});
  const bytes=resources.navigation.reduce((a,b)=>a+b,0)+resources.assets.reduce((a,b)=>a+b.bytes,0);expect(bytes).toBeGreaterThan(0);expect(bytes).toBeLessThanOrEqual(2*1024*1024);
});
