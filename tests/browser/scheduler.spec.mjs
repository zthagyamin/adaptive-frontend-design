import {expect} from '@playwright/test';
import {test,fillReservation} from './scheduler-fixture.mjs';
import {expectAccessible,expectNoPageOverflow} from './helpers.mjs';
test('a failed save preserves input, and retry publishes exactly one reservation',async({page,request,schedulerOrigin})=>{
  await page.goto(schedulerOrigin);await fillReservation(page,'失败后重试');
  await request.post(schedulerOrigin+'/api/__demo/control',{data:{mode:'fail'}});
  await page.locator('#save-booking').click();await expect(page.locator('#form-error')).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveValue('失败后重试');
  expect((await (await request.get(schedulerOrigin+'/api/reservations')).json()).reservations).toHaveLength(0);
  await page.locator('#save-booking').click();await expect(page.locator('#booking-dialog')).not.toBeVisible();
  expect((await (await request.get(schedulerOrigin+'/api/reservations')).json()).reservations).toHaveLength(1);
});
test('delayed save is truthful and guards repeated submission',async({page,request,schedulerOrigin})=>{
  await page.goto(schedulerOrigin);await fillReservation(page,'延迟确认');
  await request.post(schedulerOrigin+'/api/__demo/control',{data:{mode:'delay',delayMs:1200}});
  await page.locator('#save-booking').click();await expect(page.locator('#save-booking')).toBeDisabled();
  expect((await (await request.get(schedulerOrigin+'/api/reservations')).json()).reservations).toHaveLength(0);
  await expect(page.locator('#booking-dialog')).not.toBeVisible();
  expect((await (await request.get(schedulerOrigin+'/api/reservations')).json()).reservations).toHaveLength(1);
});
test('a conflict retains editable input and a new valid interval can succeed',async({page,request,schedulerOrigin})=>{
  await page.goto(schedulerOrigin);await fillReservation(page,'冲突后改选');
  await request.post(schedulerOrigin+'/api/__demo/control',{data:{mode:'conflict'}});
  await page.locator('#save-booking').click();await expect(page.locator('#form-error')).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveValue('冲突后改选');
  await page.locator('select[name="start"]').selectOption('600');await page.locator('select[name="end"]').selectOption('630');
  await page.locator('#save-booking').click();await expect(page.locator('#booking-dialog')).not.toBeVisible();
  await expect(page.locator('#details')).toContainText('10:00–10:30');
});
test('filtering and keyboard form entry remain accessible',async({page,schedulerOrigin})=>{
  await page.goto(schedulerOrigin);await page.locator('#device-filter').selectOption('laser');
  await expect(page.locator('.device-column')).toHaveCount(1);
  await page.locator('#new-booking').press('Enter');await expect(page.locator('input[name="title"]')).toBeFocused();
  await expectAccessible(page);await page.keyboard.press('Escape');await expect(page.locator('#new-booking')).toBeFocused();
  await expectAccessible(page);await expectNoPageOverflow(page);
});
