import {test,expect} from '@playwright/test';
import {expectAccessible,expectNoPageOverflow} from './helpers.mjs';
const root='http://127.0.0.1:3002';
test('cover and directory keep distinct matching return paths',async({page})=>{
  await page.goto(root);await page.locator('.cover-media>a').click();await expect(page.locator('[data-return]').first()).toContainText('封面');
  await page.locator('[data-return]').first().click();await expect(page).toHaveURL(/#\/$/);
  await page.getByRole('link',{name:'本期目录',exact:true}).click();await page.getByRole('link',{name:'等潮水把岸还回来',exact:true}).click();
  await expect(page.locator('[data-return]').first()).toContainText('目录');await page.goBack();await expect(page).toHaveURL(/#\/contents$/);
  await page.goForward();await expect(page.locator('#article-title')).toHaveText('等潮水把岸还回来');
});
test('direct image and unknown article always have a usable exit',async({page})=>{
  await page.goto(root+'/#/article/forest/image');await expect(page.locator('#image-viewer')).toBeVisible();
  await page.locator('#close-image').click();await expect(page).toHaveURL(/#\/article\/forest$/);await expect(page.locator('#image-viewer')).not.toBeVisible();
  await page.goto(root+'/#/article/unknown');await expect(page.getByRole('heading',{name:'不妨从岸边重新开始。'})).toBeVisible();
  await page.getByRole('link',{name:'查看本期目录'}).click();await expect(page.locator('#contents')).toBeInViewport();
});
test('journal has no serious accessibility issues and respects quiet reading',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(root);await expectAccessible(page);await expectNoPageOverflow(page);
  await page.goto(root+'/#/article/rain');await expectAccessible(page);await expectNoPageOverflow(page);
  const animations=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);expect(animations).toBe(0);
});
test('journal initial resources fit the example byte budget',async({page},testInfo)=>{
  await page.goto(root);await expect.poll(()=>page.locator('.cover-media img').evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);
  const resources=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(r=>r.encodedBodySize),assets:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.encodedBodySize}))}));
  await testInfo.attach('initial-resource-bytes',{body:JSON.stringify(resources,null,2),contentType:'application/json'});
  const bytes=resources.navigation.reduce((a,b)=>a+b,0)+resources.assets.reduce((a,b)=>a+b.bytes,0);expect(bytes).toBeGreaterThan(0);expect(bytes).toBeLessThanOrEqual(1.5*1024*1024);
  expect(resources.assets.some(r=>r.path.endsWith('.png')||r.path.endsWith('-large.webp'))).toBe(false);
});
