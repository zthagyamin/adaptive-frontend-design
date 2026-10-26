import {test,expect} from '@playwright/test';
import {expectNoPageOverflow} from './helpers.mjs';
const root='http://127.0.0.1:3002';
test('journal image close preserves the article and visible source',async({page})=>{
  await page.goto(root+'/#/article/tide');await page.reload();await expect(page.locator('#article-title')).toHaveText('等潮水把岸还回来');
  await page.locator('#image-tide').click();
  await expect(page.locator('#image-viewer')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/article\/tide$/);await expect(page.locator('#image-tide')).toBeFocused();await expect(page.locator('#image-tide')).toBeInViewport();
  await expectNoPageOverflow(page);
});
test('related title returns to the real visible entrance rather than the article heading',async({page})=>{
  await page.goto(root+'/#/contents');await page.getByRole('link',{name:'等潮水把岸还回来',exact:true}).click();
  const link=page.getByRole('link',{name:'一截朽木的漫长下午',exact:true});const sourceId=await link.getAttribute('id');
  await link.click();await expect(page.locator('#article-title')).toHaveText('一截朽木的漫长下午');
  await page.locator('[data-return]').first().click();await expect(page.locator('#article-title')).toHaveText('等潮水把岸还回来');
  const source=page.locator(`[id="${sourceId}"]`);await expect(source).toBeFocused();await expect(source).toBeInViewport();
});
