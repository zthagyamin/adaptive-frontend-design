import {test,expect} from '@playwright/test';
import {expectVisibleFocus,expectNoPageOverflow} from './helpers.mjs';
test('direct About refresh and close agree on address, content and visible focus',async({page})=>{
  await page.goto('/#/about');await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('#reader-title')).toHaveText('一本虚构的野外手册');
  await page.getByRole('button',{name:'返回手册',exact:true}).click();
  await expect(page).toHaveURL(/#about$/);await expect(page.getByRole('dialog')).not.toBeVisible();
  await expectVisibleFocus(page,'#about-title');await expectNoPageOverflow(page);
});
test('related details from a direct link close to the manual instead of another detail',async({page})=>{
  await page.goto('/#/note/reed-1018?from=notes');
  await page.getByRole('link',{name:'查看浅水涉禽档案 ↗',exact:true}).click();
  await page.locator('#reader-content').getByRole('link',{name:/10月21日.*退水后的滩面/}).click();
  await expect(page.locator('#reader-title')).toHaveText('退水后的滩面，多了一条可走的边');
  await page.keyboard.press('Escape');await expect(page).toHaveURL(/#notes$/);
  await expectVisibleFocus(page,'#notes-title');
});
test('in-page map reading preserves source through history and Escape',async({page})=>{
  await page.goto('/#routes');
  await page.getByRole('button',{name:'冬 越冬 · 12—2月',exact:true}).click();
  const entry=page.locator('#route-read');await entry.click();
  await expect(page.locator('#reader-title')).toHaveText('背风的水边，留着一段慢时间');
  await page.getByRole('link',{name:'查看浅水涉禽档案 ↗',exact:true}).click();
  await page.goBack();await expect(page.locator('#reader-title')).toHaveText('背风的水边，留着一段慢时间');
  await page.goForward();await expect(page.locator('#reader-title')).toHaveText('浅水涉禽');
  await page.keyboard.press('Escape');await expect(page).toHaveURL(/#routes$/);
  await expectVisibleFocus(page,'#route-read');
  await expect(page.getByRole('button',{name:'冬 越冬 · 12—2月',exact:true})).toHaveAttribute('aria-pressed','true');
});
