import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve(process.env.CONSTELLATION_OUTPUT??'artifacts/constellation-s2'),errors=[],reports={}
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
 const stats=()=>page.locator('[data-study-report]').evaluate(el=>JSON.parse(el.dataset.studyReport))
 await page.goto('http://127.0.0.1:5173/#/__constellation-demo');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport)
 const base=(await stats()).geometries
 for(const effect of ['glow','starlight','resonance','bloom','halo']){
  await page.getByRole('button',{name:'预览鼓励光效',exact:true}).click();await page.locator(`[data-effect=${effect}]`).click();await page.getByRole('button',{name:'预览',exact:true}).click();await page.locator('[data-effect-status=playing]').waitFor()
  await page.getByLabel('光效时间轴').fill(effect==='resonance'?'0.45':'0.55');await page.locator('[data-effect-status=paused]').waitFor();reports[effect]=await stats();await page.mouse.move(20,20);await page.screenshot({path:resolve(out,`${effect}.png`)})
  await page.getByRole('button',{name:'取消光效演出'}).click();await page.locator('[data-effect-status=cancelled]').waitFor();assert.equal((await stats()).geometries,base)
 }
 await page.getByRole('button',{name:'预览鼓励光效',exact:true}).click();await page.locator('[data-effect=bloom]').click();await page.getByRole('button',{name:'预览',exact:true}).click();await page.locator('[data-effect-status=playing]').waitFor();const firstFrames=(await stats()).frames,started=Date.now();await page.waitForTimeout(1000);reports.cadence={draws:(await stats()).frames-firstFrames,elapsedMs:Date.now()-started,environment:'Headless Edge desktop, not physical mobile'};await page.locator('[data-effect-status=completed]').waitFor();assert.equal((await stats()).geometries,base);await page.getByRole('button',{name:'关闭演出提示'}).click();await page.waitForTimeout(150);assert.equal(await page.locator('.effect-playback').count(),0)
 // A cancelled pending submission must not become a mock record.
 await page.locator('[data-target=sample-a]').click();await page.getByLabel('鼓励留言，最多200字').fill('保留这条草稿');await page.getByRole('dialog').evaluate(dialog=>{Array.from(dialog.querySelectorAll('button')).find(button=>button.textContent==='模拟发送').click();dialog.querySelector('[aria-label="关闭鼓励浮层"]').click()});await page.getByRole('dialog').waitFor({state:'detached'});await page.waitForTimeout(250);await page.getByRole('button',{name:/查看模拟鼓励记录/}).click();assert.equal(await page.locator('[data-mock-id]').count(),0);await page.getByRole('button',{name:'关闭模拟记录'}).click()
 // Simulated failure preserves draft and selected effect, then retry commits once.
 await page.getByRole('button',{name:'打开样板设置'}).click();await page.getByRole('button',{name:'模拟一次发送失败'}).click();await page.getByRole('button',{name:'关闭设置'}).click()
 await page.locator('[data-target=sample-a]').click();await page.locator('[data-effect=bloom]').click();await page.getByLabel('鼓励留言，最多200字').fill('慢慢来，我在这里。');await page.getByRole('button',{name:'模拟发送',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('鼓励留言，最多200字').inputValue(),'慢慢来，我在这里。');assert.equal(await page.locator('[data-effect=bloom]').getAttribute('aria-pressed'),'true');await page.screenshot({path:resolve(out,'retry.png')})
 await page.getByRole('button',{name:'模拟发送',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});assert.ok((await page.getByRole('status').innerText()).includes('已模拟发送'))
 await page.getByRole('button',{name:/查看模拟鼓励记录/}).click();assert.equal(await page.locator('[data-mock-id]').count(),1);await page.screenshot({path:resolve(out,'inbox.png')});await page.getByRole('button',{name:'重播绽放，未查看'}).click();assert.ok((await page.getByRole('status').innerText()).includes('模拟收件回放'))
 await page.getByRole('button',{name:/查看模拟鼓励记录/}).click();await page.getByRole('button',{name:'重播绽放，已查看'}).click()
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'预览鼓励光效',exact:true}).click();await page.getByRole('button',{name:'预览',exact:true}).click();await page.locator('[data-effect-status=reduced]').waitFor();assert.ok((await page.getByRole('status').innerText()).includes('动态已减弱'));assert.equal((await stats()).geometries,base)
 await page.setViewportSize({width:390,height:844});await page.locator('[data-target=sample-b]').click();await page.screenshot({path:resolve(out,'mobile-picker.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'})
 await page.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await page.getByRole('navigation',{name:'无三维图形的样板入口'}).waitFor();await page.getByRole('button',{name:'支持者 A · 模拟',exact:true}).click();await page.getByRole('button',{name:'模拟发送',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});await page.getByRole('button',{name:/查看模拟鼓励记录/}).click();assert.equal(await page.locator('[data-mock-id]').count(),2)
 await page.goto('http://127.0.0.1:5173/#/__orbital-demo');await page.waitForFunction(()=>document.querySelector('.orbital-console')?.dataset.renderReport);await page.goto('http://127.0.0.1:5173/#/__constellation-demo');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport);await page.getByRole('button',{name:/查看模拟鼓励记录/}).click();assert.equal(await page.locator('[data-mock-id]').count(),0)
 assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({reports,errors,checks:['five distinct samples','seek/cancel/replay','normal completion releases geometry','measured active bloom cadence','cancelled submission does not commit','geometry count restores after each effect','failed mock retains draft/effect','retry commits one event','unread/read mock replay','reduced motion does not allocate effect geometry','mobile picker','keyboard Escape','context loss preserves mock actions','route exit clears page-local records']},null,2))
 await writeFile(resolve(out,'index.html'),'<meta charset="utf-8"><title>共生星图 S2 鼓励光效</title><style>body{background:#19222d;color:#e0e3df;font:14px sans-serif;margin:24px}main{display:grid;grid-template-columns:1fr 1fr;gap:22px}img{width:100%}.mobile{max-width:390px}@media(max-width:700px){main{display:block}}</style><h2>五种鼓励光效 · S2模拟样板</h2><main>'+['glow','starlight','resonance','bloom','halo','retry','inbox','mobile-picker'].map(name=>`<section><h3>${name}</h3><img ${name.startsWith('mobile')?'class="mobile"':''} src="${name}.png"></section>`).join('')+'</main>')
 console.log(JSON.stringify({base,reports,errors,checks:'passed'},null,2))
}finally{await browser.close()}
