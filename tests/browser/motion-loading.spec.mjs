import {test,expect} from '@playwright/test';
const root='http://127.0.0.1:3003';
test('a missing 3D module preserves the independent scroll study and a reload exit',async({page})=>{
  await page.route('**/vendor/three.module.js',route=>route.abort());
  await page.goto(root);await expect(page.locator('.scroll-story')).toBeVisible();await expect(page.locator('#effect-host')).toHaveAttribute('data-state','ready');
  await page.locator('#tab-surface').click();await expect(page.locator('#effect-host')).toHaveAttribute('data-state','error');
  await expect(page.getByRole('heading',{name:'The live module could not be loaded.',exact:true})).toBeVisible();
  await expect(page.locator('[data-reload-study]')).toBeEnabled();
  await page.getByText('Error details',{exact:true}).click();await expect(page.locator('[data-study-error]')).toBeVisible();
  await page.locator('#tab-scroll').click();await expect(page.locator('.scroll-story')).toBeVisible();
});
test('late module resolution cannot replace a newer scroll intention',async({page})=>{
  let release;const gate=new Promise(resolve=>release=resolve);let intercepted=false;
  await page.route('**/vendor/three.module.js',async route=>{intercepted=true;await gate;await route.continue();});
  await page.goto(root);await page.locator('#tab-surface').click();await expect.poll(()=>intercepted).toBe(true);
  await page.locator('#tab-scroll').click();release();
  await expect(page.locator('.scroll-story')).toBeVisible();await expect(page.locator('#effect-host')).toHaveAttribute('data-study','scroll');
  await expect(page.locator('canvas')).toHaveCount(0);
});
