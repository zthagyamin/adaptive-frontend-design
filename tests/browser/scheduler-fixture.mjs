import {test as base} from '@playwright/test';
import {createDemoServer} from '../../examples/workshop-scheduler/serve.mjs';
import {createService} from '../../examples/workshop-scheduler/service.mjs';
export const test=base.extend({schedulerOrigin:async({},use)=>{
  const server=createDemoServer({service:createService({reservations:[],latency:40})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{await use(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(resolve=>server.close(resolve));}
}});
export async function fillReservation(page,title='工作坊体验'){
  await page.getByRole('button',{name:'新建预约',exact:true}).click();
  await page.locator('input[name="title"]').fill(title);await page.locator('input[name="booker"]').fill('示例使用人');
  await page.locator('select[name="start"]').selectOption('540');await page.locator('select[name="end"]').selectOption('570');
}
