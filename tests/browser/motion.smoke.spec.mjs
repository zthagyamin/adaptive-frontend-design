import {test,expect} from '@playwright/test';
import {expectNoPageOverflow} from './helpers.mjs';
const root='http://127.0.0.1:3003';
test('studies mount real content and replace the previous canvas',async({page})=>{
  await page.goto(root);await expect(page.locator('.scroll-story')).toBeVisible();
  await page.locator('#tab-surface').click();await expect(page.locator('canvas').or(page.locator('.failure'))).toHaveCount(1);
  await page.locator('#tab-particles').click();await expect(page.locator('canvas').or(page.locator('.failure'))).toHaveCount(1);
  await page.locator('#tab-scroll').press('Home');await expect(page.locator('.scroll-story')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
  await expectNoPageOverflow(page);
});
