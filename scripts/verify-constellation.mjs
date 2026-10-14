import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile,stat} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/constellation-s1'),errors=[],external=[],reports={}
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort()})
 for(const [name,query,count] of [['two-A','members=2',2],['one-A','members=1',1],['zero-A','members=0',0],['two-B','members=2&scheme=B',2],['side-A','view=side',2],['core-only','orbitA=off&orbitB=off&planArc=off&photons=off&relics=off',0],['photons-off','photons=off',2]]){
  await page.goto(`http://127.0.0.1:5173/#/__constellation-demo?${query}`)
  await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport)
  await page.waitForTimeout(120)
  await page.getByRole('button',{name:'复位视角'}).click()
  assert.equal(await page.locator('[data-target^=sample-]').count(),count)
  assert.equal(await page.locator('.study-settings').count(),0)
  assert.equal(await page.locator('header span').innerText(),'NICØ')
  reports[name]=await page.locator('[data-study-report]').evaluate(el=>JSON.parse(el.dataset.studyReport))
  await page.screenshot({path:resolve(out,`${name}.png`)})
 }
 await page.goto('http://127.0.0.1:5173/#/__constellation-demo');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport)
 await page.locator('[data-target=core]').focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();assert.ok((await page.getByRole('dialog').innerText()).includes('仅视觉预览'));await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'})
 const before=await page.locator('[data-target=core]').getAttribute('style');await page.mouse.move(1070,680);await page.mouse.down();await page.mouse.move(1170,650,{steps:8});await page.mouse.up();assert.notEqual(await page.locator('[data-target=core]').getAttribute('style'),before)
 await page.getByRole('button',{name:'复位视角'}).click()
 await page.getByRole('button',{name:'打开样板设置'}).click();await page.getByLabel('光子密度').fill('0');await page.getByLabel('光子密度').fill('0.65');await page.getByRole('button',{name:'关闭设置'}).click()
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await page.screenshot({path:resolve(out,'mobile.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.locator('[data-target=core]').click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'关闭样板详情'}).click()
 // Context loss must leave an accessible, honest visual fallback.
 await page.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})))
 await page.getByRole('navigation',{name:'无三维图形的样板入口'}).waitFor();await page.screenshot({path:resolve(out,'fallback.png')})
 await page.goto('http://127.0.0.1:5173/#/family');await page.waitForURL('**/login?redirect=/family')
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({reports,assetBytes:(await stat('public/models/nico-constellation.glb')).size,errors,external,checks:['0/1/2 mock supporter layouts','physical/hybrid schemes','core only and photons off','3D observation drag','keyboard target and Escape','mobile no horizontal overflow','context loss fallback','production family auth unchanged'],fps:'S1 idle is rendered on demand; renderMs is CPU submission, not measured continuous GPU FPS.'},null,2))
 const names=['two-A','one-A','zero-A','two-B','side-A','core-only','photons-off','mobile','fallback']
 await writeFile(resolve(out,'index.html'),'<meta charset="utf-8"><title>NICØ 共生星图 S1</title><style>body{font:14px sans-serif;background:#f4f1e9;color:#475459;margin:24px}img{display:block;width:100%;margin-bottom:26px}.mobile{max-width:390px}a{color:inherit}</style><h2>共生星图 · S1空间样板</h2><p><a href="http://127.0.0.1:5173/#/__constellation-demo">打开样板</a> · 模拟成员与计划</p>'+names.map(name=>`<h3>${name}</h3><img ${name==='mobile'||name==='fallback'?'class="mobile"':''} src="${name}.png">`).join(''))
 console.log(JSON.stringify({reports,errors,checks:'passed'},null,2))
}finally{await browser.close()}
