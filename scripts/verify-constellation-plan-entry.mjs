import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/constellation-plan-entry'),errors=[]
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/#/__constellation-demo?motion=off');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport)
 if(process.argv.includes('--before')){await page.screenshot({path:resolve(out,'before.png')});console.log('Before captured')}
 else{
  await page.screenshot({path:resolve(out,'after-dark.png')})
  const target=page.locator('[data-target=plan]');await expectVisible(target);const box=await target.boundingBox();assert.ok(box.width>=100&&box.height>=60)
  await target.focus();await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'共同计划',exact:true}).waitFor();await page.getByRole('button',{name:'创建一个计划',exact:true}).click();await page.getByLabel('计划类型').selectOption('records');await page.getByRole('button',{name:'保存提案 · 模拟',exact:true}).click();await page.getByRole('button',{name:'接受',exact:true}).click();await page.getByRole('button',{name:'激活',exact:true}).click();await page.getByRole('button',{name:'关闭联动浮层'}).click();await page.screenshot({path:resolve(out,'active.png')})
  await page.goto('http://127.0.0.1:5173/#/__constellation-demo?motion=off&atmosphere=light');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport);await page.screenshot({path:resolve(out,'after-light.png')})
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5173/#/__constellation-demo?motion=off');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport);await page.screenshot({path:resolve(out,'mobile.png')});await page.locator('[data-target=plan]').click();await page.getByRole('dialog',{name:'共同计划',exact:true}).waitFor();await page.keyboard.press('Escape');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.goto('http://127.0.0.1:5173/#/__constellation-demo?planArc=off&motion=off');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport);assert.equal(await page.locator('[data-target=plan]').count(),0)
  assert.deepEqual(errors,[]);await writeFile(resolve(out,'verification.json'),JSON.stringify({errors,checks:['PC入口可见及扩大点击区','键盘进入共同计划','创建接受激活原有流程','同机位暗场浅场截图','手机入口与无横向溢出','关闭计划图层移除入口']},null,2));console.log('Plan entry verification passed')
 }
}finally{await browser.close()}
async function expectVisible(locator){await locator.waitFor({state:'visible'})}
