import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const out=resolve('artifacts/hub-phase3');await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true})
const errors=[],checks={}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 await page.goto('http://127.0.0.1:5173/#/__hub-preview')
 await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000})
 const surface=page.locator('.hub-interaction'),state=()=>surface.evaluate(el=>JSON.parse(el.dataset.interaction))
 await page.getByRole('button',{name:'每日打卡',exact:true}).focus();await page.waitForTimeout(600)
 const before=(await state()).quaternion
 await page.locator('.hub-scene canvas').evaluate(el=>el.dataset.sharedIdentity='same-scene')
 await page.screenshot({path:resolve(out,'opening.png')})
 await page.route('**/src/views/HubModulePreview.vue*',async r=>{await new Promise(resolve=>setTimeout(resolve,900));await r.continue()})
 await surface.focus();await page.keyboard.press('Enter')
 await page.locator('.panel-preparing').waitFor()
 await page.locator('.floating-module').evaluate(el=>el.dataset.preparationIdentity='same-panel')
 assert.equal(await page.locator('.floating-module').evaluate(el=>getComputedStyle(el).animationName),'none')
 await page.waitForTimeout(350)
 const lift=await surface.evaluate(el=>JSON.parse(el.dataset.morph))
 assert.ok(lift.progress>0&&lift.progress<1&&lift.glyphScale>1.05)
 checks.realGlyphLiftsBeforePanel=true
 await page.screenshot({path:resolve(out,'icon-lift.png')})
 await page.screenshot({path:resolve(out,'preparing.png')})
 await page.locator('.module-preview').waitFor();await page.getByRole('button',{name:'返回晶体导航'}).waitFor()
 assert.ok(page.url().endsWith('/__hub-module/checkin'))
 assert.equal(await page.locator('.floating-module').getAttribute('data-preparation-identity'),'same-panel')
 assert.equal(await page.locator('.panel-preparing').count(),0)
 checks.preparationReusesPanel=true
 assert.equal(await page.locator('.hub-scene canvas').getAttribute('data-shared-identity'),'same-scene')
 assert.equal(await page.locator('.hub-morph-panel').count(),0)
 assert.equal(await page.locator('.floating-module').count(),1)
 await page.locator('.floating-module:not([inert])').waitFor()
 assert.equal(await page.locator('.floating-module').evaluate(el=>getComputedStyle(el).animationName),'none')
 assert.equal(await page.locator('.panel-entry-light').count(),1)
 checks.singleOpticalEntrance=true
 assert.deepEqual((await state()).quaternion,before)
 checks.sharedBackgroundSinglePanel=true
 await page.screenshot({path:resolve(out,'module.png')})
 await page.getByRole('button',{name:'返回晶体导航'}).click();await page.locator('.crystal-hub.is-ready:not(.is-closing)').waitFor();await page.waitForTimeout(200)
 assert.deepEqual((await state()).quaternion,before)
 const returnBox=await surface.boundingBox()
 await page.mouse.move(returnBox.x+returnBox.width/2,returnBox.y+returnBox.height/2)
 await page.waitForTimeout(1000)
 assert.ok(page.url().endsWith('/__hub-preview'),'Hover after returning must not reopen the module')
 assert.equal(await page.locator('.is-opening').count(),0)
 checks.returnHoverDoesNotReactivate=true
 await page.screenshot({path:resolve(out,'returned.png')});checks.openClosePreservesOrientation=true
 await surface.focus();await page.keyboard.press('Enter');await page.locator('.module-preview').waitFor();await page.keyboard.press('Escape');await page.waitForURL(/#\/__hub-preview$/);checks.escapeReturn=true
 await page.locator('.crystal-background:not([inert])').waitFor();await page.waitForTimeout(60)
 await surface.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');await page.keyboard.press('Enter')
 await page.waitForTimeout(1800)
 await page.locator('.module-preview').waitFor();await page.goBack();await page.waitForURL(/#\/__hub-preview$/);checks.rapidInputAndBack=true
 await page.emulateMedia({reducedMotion:'reduce'})
 for(const [label,id] of [['每日打卡','checkin'],['戒烟数据','progress'],['成就','achievements'],['互助支持','support'],['个人中心','profile']]){
  await page.getByRole('button',{name:label,exact:true}).focus();await page.waitForTimeout(100)
  await surface.focus();await page.keyboard.press('Enter');await page.locator('.module-preview').waitFor()
  assert.ok(page.url().endsWith('/__hub-module/'+id))
  assert.equal(await page.locator('.floating-module').evaluate(el=>getComputedStyle(el).animationName),'none')
  await page.getByRole('button',{name:'返回晶体导航'}).click();await page.locator('.crystal-hub.is-ready:not(.is-closing)').waitFor()
 }
 checks.fiveFacesReducedMotion=true
 await surface.focus();await page.keyboard.press('Enter');await page.locator('.module-preview').waitFor()
 await page.reload();await page.locator('.module-preview').waitFor();assert.equal(await page.locator('.spatial-return').count(),0);checks.refreshSkipsAnimation=true
 await page.goto('http://127.0.0.1:5173/#/__hub-preview');await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000})
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'每日打卡',exact:true}).focus();await page.waitForTimeout(100);await surface.focus();await page.keyboard.press('Enter')
 await page.locator('.module-preview').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'mobile.png')});checks.mobileShell=true
 await page.goto('http://127.0.0.1:5173/#/')
 await page.getByRole('button',{name:'点击光环，进入戒烟旅程'}).click()
 await page.waitForURL(/#\/login\?redirect=\/hub/,{timeout:20000});checks.landingProtectedHub=true
 for(const path of ['/hub','/home','/checkin','/trend','/family','/profile','/dashboard','/setup','/family/setup']){
  await page.goto('http://127.0.0.1:5173/#'+path);await page.waitForURL(/#\/login\?redirect=/);assert.equal(new URLSearchParams(page.url().split('?')[1]).get('redirect'),path)
 }
 checks.protectedRoutes=true
 await page.goto('http://127.0.0.1:5173/#/__hub-preview');await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000});await page.emulateMedia({reducedMotion:'no-preference'})
 await page.getByRole('button',{name:'每日打卡',exact:true}).focus();await page.waitForTimeout(600)
 await page.evaluate(()=>document.querySelector('.hub-scene canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})))
 await page.locator('.hub-unavailable').waitFor();await page.waitForTimeout(1000);assert.ok(page.url().endsWith('/__hub-preview'));assert.equal(await page.locator('.is-opening').count(),0);checks.contextLossCancelsOpening=true
 assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({checks,errors},null,2))
 await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Phase 3</title><style>body{background:#f4f3ee;margin:24px;font:14px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}img{width:100%}</style><h1>Phase 3 · 切面展开与返回</h1><p>开发样板没有业务数据，正式入口沿用认证。</p><main>${['opening','module','returned','mobile'].map(id=>`<figure><img src="${id}.png"><figcaption>${id}</figcaption></figure>`).join('')}</main><pre>${JSON.stringify(checks,null,2)}</pre></html>`)
 console.log(JSON.stringify(checks))
}finally{await browser.close()}
