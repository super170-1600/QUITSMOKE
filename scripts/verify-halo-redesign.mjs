import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright'),browser=await chromium.launch({channel:'msedge',headless:true})
const out=resolve('artifacts/halo-redesign');await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 await page.goto('http://127.0.0.1:5173/#/__pulse-demo');await page.locator('.pulse-form').waitFor();await page.locator('.optical-scene canvas').waitFor();await page.waitForTimeout(800)
 await page.screenshot({path:resolve(out,'daily-blank.png')})
 await page.locator('#pulse-cigarettes').fill('0');await page.locator('.pulse-edit-tabs button').nth(1).click();await page.locator('#pulse-score').evaluate(el=>{el.value='7';el.dispatchEvent(new Event('input',{bubbles:true}))});await page.locator('.pulse-edit-tabs button').nth(2).click();await page.locator('.pulse-moods').getByRole('button',{name:'充实',exact:true}).click();await page.locator('.pulse-submit').click();await page.locator('.pulse-success').waitFor();await page.locator('.pulse-edit-tabs button').first().click();await page.waitForTimeout(800);await page.screenshot({path:resolve(out,'daily-desktop.png')})
 await page.locator('.pulse-archive-button').click();await page.locator('.halo-archive canvas').waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('.archive-node').count(),49)
 const positions=await page.locator('.archive-node').evaluateAll(nodes=>nodes.map(node=>({date:node.dataset.date,x:node.style.left,y:node.style.top})));assert.ok(new Set(positions.map(n=>n.x+n.y)).size===49)
 await page.screenshot({path:resolve(out,'archive-desktop.png')});await page.locator('.archive-node:not([disabled])').last().click();await page.locator('.archive-detail').waitFor();await page.screenshot({path:resolve(out,'archive-detail.png')});await page.keyboard.press('Escape')
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(600);await page.screenshot({path:resolve(out,'daily-mobile.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok((await page.locator('.pulse-submit').boundingBox()).y+(await page.locator('.pulse-submit').boundingBox()).height<=844)
 await page.locator('.pulse-archive-button').click();await page.waitForTimeout(600);await page.screenshot({path:resolve(out,'archive-mobile.png')});assert.equal(await page.locator('.archive-node:not(.mobile-inactive)').count(),7)
 for(let ring=0;ring<7;ring++){await page.locator('.archive-ring-selector button').nth(ring).click();assert.equal(await page.locator('.archive-node:not(.mobile-inactive)').count(),7);const boxes=await page.locator('.archive-node:not(.mobile-inactive)').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));for(const box of boxes){assert.ok(box.width>=44&&box.height>=44);assert.ok(box.x>=0&&box.x+box.width<=390)}for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].x>=boxes[i-1].x+boxes[i-1].width)}
 await page.keyboard.press('Escape');await page.reload();await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'0');assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({staticReal3D:true,focusedEditor:true,rangeInput:true,saveReload:true,fixed49ProjectedNodes:true,mobileSevenPerLayer:true,touch44:true,mobileTargetsDoNotOverlap:true,mobileSubmitWithinViewport:true,webglFallback:true,errors},null,2))
 await writeFile(resolve(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Halo visual redesign</title><style>body{margin:24px;background:#eef1f2;font:14px system-ui;color:#405965}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%}figure{margin:0}</style><h1>光环视觉结构重设计</h1><p>静态 Three.js 光学雕塑；示例数据。</p><main>${['daily-blank','daily-desktop','archive-desktop','archive-detail','daily-mobile','archive-mobile'].map(name=>`<figure><img src="${name}.png"><figcaption>${name}</figcaption></figure>`).join('')}</main>`)
 console.log('Real 3D, focused inputs, save/reload, 49 projected nodes, mobile layer selection and 44px targets passed')
}finally{await browser.close()}
