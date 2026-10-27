import {test,expect} from '@playwright/test';
import {expectNoPageOverflow} from './helpers.mjs';
const root='http://127.0.0.1:3003';
test('studies mount real content and replace the previous canvas',async({page},testInfo)=>{
  await page.goto(root);await expect(page.locator('.scroll-story')).toBeVisible();
  const observations=[];
  for(const name of ['surface','particles']){
    await page.locator(`#tab-${name}`).click();
    // The import placeholder also has .failure styling. It is not a mounted
    // study: require completed factory initialization before either outcome.
    await expect(page.locator('#effect-host')).toHaveAttribute('data-state','ready');
    await expect(page.locator('#effect-host')).toHaveAttribute('data-study',name);
    if(await page.locator('canvas').count()){
      await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.failure')).toHaveCount(0);
      if(name==='surface'){
        await page.getByRole('button',{name:'Hold a lift',exact:true}).click();await expect(page.locator('[data-hold]')).toHaveAttribute('aria-pressed','true');
        await page.getByRole('button',{name:'Release patch',exact:true}).click();await expect(page.locator('[data-hold]')).toHaveAttribute('aria-pressed','false');
      }else{
        await page.getByRole('button',{name:'Push right →',exact:true}).click();await expect(page.locator('.status')).toContainText('Local pulse sent');
        await page.getByRole('button',{name:'Let go',exact:true}).click();await expect(page.locator('.status')).toContainText('Released.');
      }
      observations.push({study:name,outcome:'canvas with direct controls'});
    }else{
      await expect(page.getByRole('heading',{name:'The live study is unavailable.',exact:true})).toBeVisible();
      const controls=page.locator('.controls button,.controls input');expect(await controls.count()).toBeGreaterThan(0);
      for(const control of await controls.all())await expect(control).toBeDisabled();
      observations.push({study:name,outcome:'explicit WebGL-unavailable fallback',reason:await page.locator('.failure').innerText()});
    }
  }
  await page.locator('#tab-scroll').press('Home');await expect(page.locator('.scroll-story')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
  await expectNoPageOverflow(page);
  await testInfo.attach('actual-study-outcomes',{body:JSON.stringify(observations,null,2),contentType:'application/json'});
});
