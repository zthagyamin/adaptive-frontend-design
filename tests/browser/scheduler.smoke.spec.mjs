import {expect} from '@playwright/test';
import {test,fillReservation} from './scheduler-fixture.mjs';
import {expectNoPageOverflow} from './helpers.mjs';
test('create, adjust, cancel and undo remain the same reservation',async({page,schedulerOrigin})=>{
  await page.goto(schedulerOrigin);await fillReservation(page);
  await page.getByRole('button',{name:'保存预约',exact:true}).click();
  await expect(page.locator('#booking-dialog')).not.toBeVisible();await expect(page.locator('#details')).toContainText('工作坊体验');
  await page.getByRole('button',{name:'调整预约',exact:true}).click();
  await page.locator('select[name="start"]').selectOption('900');await page.locator('select[name="end"]').selectOption('930');
  await page.getByRole('button',{name:'保存调整',exact:true}).click();await expect(page.locator('#details')).toContainText('15:00–15:30');
  await page.getByRole('button',{name:'取消预约',exact:true}).click();await expect(page.locator('#keep-booking')).toBeFocused();
  await page.locator('#confirm-cancel').click();await expect(page.locator('#cancel-dialog')).not.toBeVisible();
  await expect(page.locator('#undo')).toBeFocused();await expect(page.locator('#undo')).toBeInViewport();
  await page.locator('#undo').click();await expect(page.locator('#details')).toContainText('工作坊体验');
  const restored=page.locator('[data-booking]').filter({hasText:'工作坊体验'});await expect(restored).toBeFocused();await expect(restored).toBeInViewport();
  await expectNoPageOverflow(page);
});
