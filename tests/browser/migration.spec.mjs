import {test,expect} from '@playwright/test';
import {expectAccessible,expectNoPageOverflow} from './helpers.mjs';
test('combined filters, empty results and reset keep a usable input',async({page})=>{
  await page.goto('/#notes');
  await page.getByRole('combobox',{name:'季节',exact:true}).selectOption('winter');
  await page.getByRole('combobox',{name:'示意类群',exact:true}).selectOption('wader');
  await expect(page.locator('#archive-count')).toContainText('显示 1 / 8');
  await page.getByRole('searchbox',{name:'找一页手记'}).fill('完全不存在的示例词');
  await expect(page.locator('#archive-count')).toContainText('显示 0 / 8');
  await page.getByRole('button',{name:'清除筛选，查看全部',exact:true}).click();
  await expect(page.locator('#archive-count')).toContainText('显示 8 / 8');
  await expect(page.getByRole('searchbox',{name:'找一页手记'})).toBeFocused();
  await expectNoPageOverflow(page);
});
test('reduced motion retains routes, reading and normal document layout',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#routes');
  await expect(page.locator('#motion-toggle')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('html')).toHaveClass(/low-motion/);
  await page.getByRole('button',{name:'春 北归 · 3—5月',exact:true}).click();
  await page.locator('#route-read').click();await expect(page.locator('#reader-title')).toHaveText('春天从河口的一次聚拢开始');
  await page.keyboard.press('Escape');await expectNoPageOverflow(page);
});
test('main and reader have no unhandled serious accessibility violations',async({page})=>{
  await page.goto('/');await expect(page.locator('#note-search')).toBeVisible();await expectAccessible(page);
  await page.goto('/#/about');await expect(page.getByRole('dialog')).toBeVisible();await expectAccessible(page);
});
