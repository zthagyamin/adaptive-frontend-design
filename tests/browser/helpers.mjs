import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
export async function expectVisibleFocus(page,selector){
  const target=page.locator(selector);await expect(target).toBeFocused();
  await expect.poll(()=>target.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
}
export async function expectNoPageOverflow(page){await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);}
export async function expectAccessible(page){
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const serious=result.violations.filter(v=>['critical','serious'].includes(v.impact));
  expect(serious.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
}
