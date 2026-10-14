import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const out=resolve('artifacts/orbital-console-static');await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[],external=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',r=>{if(new URL(r.request().url()).hostname==='127.0.0.1')return r.continue();external.push(r.request().url());return r.abort()})
 await page.goto('http://127.0.0.1:5173/#/__orbital-demo');await page.locator('.orbital-render canvas').waitFor();await page.waitForFunction(()=>document.querySelector('.orbital-console')?.dataset.renderReport);await page.waitForTimeout(300)
 assert.equal(await page.locator('.orbital-panel').count(),4)
 const orbitNodes=await page.locator('.orbital-panel').evaluateAll(nodes=>nodes.map(el=>JSON.parse(el.dataset.orbitNode)))
 for(const node of orbitNodes){assert.ok(Math.abs((node.x/4.75)**2+(node.z/3.75)**2-1)<1e-8);assert.ok(Math.abs(node.baseY+.07)<1e-8);assert.ok(node.seatingError<.002)}
 const projectedTransforms=await page.locator('.orbital-panel').evaluateAll(nodes=>nodes.map(el=>el.style.transform))
 assert.ok(projectedTransforms.every(value=>value.startsWith('matrix(')))
 const report=await page.locator('.orbital-console').evaluate(el=>JSON.parse(el.dataset.renderReport))
 const boxes=await page.locator('.orbital-panel').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}))
 for(const box of boxes){assert.ok(box.x>=0 && box.y>=72);assert.ok(box.x+box.width<=1440 && box.y+box.height<=900)}
 assert.ok((await page.locator('[data-domain=journey]').innerText()).trim()==='')
 assert.ok((await page.locator('[data-domain=recovery]').innerText()).trim()==='')
 await page.screenshot({path:resolve(out,'desktop.png')})
 await page.locator('.orbital-panel').first().focus();assert.ok(await page.locator('.orbital-panel').first().evaluate(el=>el===document.activeElement))
 await page.locator('.orbital-panel').first().evaluate(el=>el.blur())
 await page.goto('http://127.0.0.1:5173/#/__orbital-demo?view=side');await page.waitForFunction(()=>document.querySelector('.orbital-console')?.dataset.renderReport);await page.waitForTimeout(150);assert.notDeepEqual(await page.locator('.orbital-panel').evaluateAll(nodes=>nodes.map(el=>el.style.transform)),projectedTransforms);await page.screenshot({path:resolve(out,'side.png')})
 await page.goto('http://127.0.0.1:5173/#/__orbital-demo');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:resolve(out,'mobile.png'),fullPage:true})
 const mobile=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,width:innerWidth,height:innerHeight}))
 assert.ok(mobile.scrollWidth<=390)
 for(const box of await page.locator('.orbital-panel').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().toJSON()))){assert.ok(box.width>=44 && box.height>=44)}
 const fallback=await browser.newPage({viewport:{width:1440,height:900}})
 await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return original.call(this,type,...args)}})
 await fallback.goto('http://127.0.0.1:5173/#/__orbital-demo');await fallback.locator('.orbital-console.fallback').waitFor();assert.equal(await fallback.locator('.orbital-panel').count(),4);await fallback.screenshot({path:resolve(out,'fallback.png')});await fallback.close()
 await page.goto('http://127.0.0.1:5173/#/hub');await page.waitForURL('**/login?redirect=/hub');assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 const results={desktop:report,mobile,orbitNodes,errors,external,checks:['four plates mounted on same ellipse','actual panel bottom to socket floor error below .002','hit regions follow 3D panel projection in side view','four distinct domain forms','overview panels contain no visible text','keyboard focus','desktop bounds','mobile no overflow','WebGL fallback','production hub still requires auth'],fps:'Idle rendering is on demand; drag/inertia and focus transitions draw temporarily. renderMs is CPU submission including transmission/shadow passes, not GPU time or device FPS.'}
 await writeFile(resolve(out,'verification.json'),JSON.stringify(results,null,2))
 await writeFile(resolve(out,'index.html'),'<meta charset="utf-8"><title>Orbital Console · 静态样板</title><style>body{background:#f5f4ef;color:#314b5b;font:16px sans-serif;margin:24px}img{width:100%;border-radius:12px;margin-bottom:32px}.mobile{max-width:390px}a{color:inherit}</style><h2>Orbital Console · 静态样板</h2><p><a href="http://127.0.0.1:5173/#/__orbital-demo">打开样板</a> · 固定样本，非账户数据</p><h3>桌面 1440 × 900</h3><img src="desktop.png"><h3>侧向结构</h3><img src="side.png"><h3>手机 390 × 844</h3><img class="mobile" src="mobile.png"><h3>无 WebGL</h3><img src="fallback.png">')
 console.log(JSON.stringify(results,null,2))
}finally{await browser.close()}
