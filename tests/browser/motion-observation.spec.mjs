import {test,expect} from '@playwright/test';
test.use({video:{mode:'on',size:{width:1280,height:800}}});
test('record a timed full-interface response and release sequence',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','One desktop recording; functional narrow coverage is separate.');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:3003');
  await page.locator('#tab-surface').click();await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button',{name:'Hold a lift',exact:true}).click();
  // Deliberate observation windows, not readiness waits or performance thresholds.
  await page.waitForTimeout(1000);await page.getByRole('button',{name:'Release patch',exact:true}).click();await page.waitForTimeout(1200);
  await page.locator('#tab-particles').click();await page.getByRole('button',{name:'Push right →',exact:true}).click();await page.waitForTimeout(1000);
  await page.getByRole('button',{name:'Let go',exact:true}).click();await page.waitForTimeout(700);
  await page.locator('#tab-scroll').click();await expect(page.locator('.scroll-story')).toBeVisible();
  await page.locator('.scroll-story').scrollIntoViewIfNeeded();await page.mouse.wheel(0,400);await page.waitForTimeout(500);
  await page.mouse.wheel(0,-250);await page.waitForTimeout(500);
});
