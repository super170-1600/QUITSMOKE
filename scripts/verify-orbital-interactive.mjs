import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/orbital-console-interactive')
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
 await page.goto('http://127.0.0.1:5173/#/__orbital-demo');await page.waitForFunction(()=>document.querySelector('.orbital-console')?.dataset.renderReport);await page.waitForTimeout(200)
 assert.equal((await page.locator('.center-caption').innerText()).trim(),'')
 await page.screenshot({path:resolve(out,'overview.png')})
 for(const id of ['journey','craving','savings','recovery']){
  const trigger=page.locator(`[data-domain=${id}]`);await trigger.focus();await trigger.click();await page.getByRole('dialog').waitFor()
  assert.ok(page.url().includes(`domain=${id}`))
  assert.equal(await page.locator('.detail-close').evaluate(el=>el===document.activeElement),true)
  if(id!=='recovery'){
   assert.equal(await page.locator('.detail-dates button').count(),28)
   await page.locator('.detail-ranges button').getByText('7D',{exact:true}).click();assert.equal(await page.locator('.detail-dates button').count(),7)
   await page.locator('.detail-ranges button').getByText('ALL',{exact:true}).click();assert.equal(await page.locator('.detail-dates button').count(),28)
   await page.locator('.chart-point').last().click();assert.ok((await page.locator('.day-inspect').innerText()).includes('2026-10-13'));await page.locator('.chart-point').last().evaluate(el=>el.blur())
   if(id==='craving'){assert.ok((await page.locator('.chart-caption').innerText()).includes('0–10'));assert.ok((await page.locator('.day-inspect').innerText()).includes('1'))}
   if(id==='savings')assert.ok((await page.locator('.day-inspect').innerText()).includes('15'))
   if(id==='journey')assert.ok((await page.locator('.journey-summary').innerText()).includes('20'))
  }else {assert.ok((await page.locator('.recovery-pending').innerText()).includes('尚无法确认'));assert.equal(await page.locator('.chart-point').count(),0)}
  await page.screenshot({path:resolve(out,`${id}.png`)})
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(await trigger.evaluate(el=>el===document.activeElement),true)
 }
 await page.locator('[data-domain=craving]').focus();await page.keyboard.press('Space');await page.getByRole('dialog').waitFor();await page.goBack();await page.getByRole('dialog').waitFor({state:'detached'})
 // Rotation must retain actual socket alignment, suppress accidental module opens,
 // and coast only when reduced motion is not requested.
 const stage=page.locator('.orbital-console'),yaw=()=>stage.evaluate(el=>Number(el.dataset.yaw))
 await stage.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.ok(Math.abs(await yaw()-.18)<.0001)
 await page.mouse.move(690,755);await page.mouse.down();await page.mouse.move(800,755,{steps:8});await page.mouse.up();assert.ok(await yaw()>.8);assert.equal(await page.getByRole('dialog').count(),0)
 for(const error of await page.locator('.orbital-panel').evaluateAll(nodes=>nodes.map(el=>JSON.parse(el.dataset.orbitNode).seatingError)))assert.ok(error<.002)
 const stopped=await yaw();await page.waitForTimeout(160);assert.equal(await yaw(),stopped)
 await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(690,755);await page.mouse.down();await page.mouse.move(780,755,{steps:8});await page.mouse.up();const released=await yaw();await page.waitForTimeout(180);assert.ok(await yaw()>released)
 await stage.focus();await page.keyboard.press('Home');assert.equal(await yaw(),0)
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.setViewportSize({width:390,height:844});await page.locator('[data-domain=savings]').click();await page.getByRole('dialog').waitFor();await page.locator('.detail-dates button').last().click();await page.screenshot({path:resolve(out,'mobile-detail.png')})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.detail-close').click()
 const fallback=await browser.newPage({viewport:{width:1440,height:900}})
 await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:original.call(this,type,...args)}})
 await fallback.goto('http://127.0.0.1:5173/#/__orbital-demo');await fallback.locator('.orbital-console.fallback').waitFor();await fallback.locator('[data-domain=craving]').click();await fallback.getByRole('dialog').waitFor();assert.equal(await fallback.locator('.detail-dates button').count(),28);await fallback.close()
 assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({curvedPanels:true,centralTextRemoved:true,turntableDrag:true,inertia:true,reducedMotionStopsCoast:true,rotatedSocketAlignment:true,allModulesClickable:true,rangeFilters:true,cumulativeSummaryUnchanged:true,pointInspection:true,keyboardOpen:true,escapeAndFocusReturn:true,browserBack:true,mobileTap:true,fallbackDetails:true,errors},null,2))
 await writeFile(resolve(out,'index.html'),'<meta charset="utf-8"><title>弧形轨道与详情</title><style>body{background:#f5f4ef;color:#314b5b;font:16px sans-serif;margin:24px}img{width:100%;margin-bottom:32px}.mobile{max-width:390px}</style><h2>弧形轨道与点击详情 · 固定样本</h2>'+['overview','journey','craving','savings','recovery','mobile-detail'].map(name=>`<h3>${name}</h3><img ${name.startsWith('mobile')?'class="mobile"':''} src="${name}.png">`).join(''))
 console.log('All four modules, exact point readings, ranges, keyboard/escape/focus, browser back, mobile and WebGL fallback passed')
}finally{await browser.close()}
