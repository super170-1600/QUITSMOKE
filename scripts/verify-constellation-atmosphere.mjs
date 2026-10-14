import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/constellation-atmosphere'),errors=[],reports={}
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 page.on('pageerror',error=>errors.push(error.message))
 const stats=()=>page.locator('[data-study-report]').evaluate(el=>JSON.parse(el.dataset.studyReport))
 const captures=[['A-light','light',''],['B-dark','dark',''],['B-dark-no-photons','dark','&photons=off'],['B-dark-single','dark','&members=1'],['B-dark-empty','dark','&members=0']]
 for(const [name,atmosphere,extra] of captures){
  await page.goto(`http://127.0.0.1:5173/#/__constellation-demo?atmosphere=${atmosphere}&motion=off${extra}`);await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport);await page.getByRole('button',{name:'复位视角'}).click();reports[name]=await stats();await page.screenshot({path:resolve(out,`${name}.png`)})
 }
 await page.goto('http://127.0.0.1:5173/#/__constellation-demo?atmosphere=dark');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport)
 const stopped=(await stats()).frames;await page.waitForTimeout(180);assert.equal((await stats()).frames,stopped)
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(220);assert.ok((await stats()).frames>stopped)
 const startFrames=(await stats()).frames,start=Date.now();await page.waitForTimeout(1000);const endFrames=(await stats()).frames;reports.animation={draws:endFrames-startFrames,elapsedMs:Date.now()-start,observedDrawsPerSecond:(endFrames-startFrames)*1000/(Date.now()-start),environment:'Headless Edge desktop; not a physical mobile GPU benchmark'}
 await page.getByRole('button',{name:'打开样板设置'}).click();await page.getByLabel('动态',{exact:true}).uncheck();await page.getByRole('button',{name:'关闭设置'}).click();const frozen=(await stats()).frames;await page.waitForTimeout(180);assert.equal((await stats()).frames,frozen)
 await page.locator('[data-target=core]').focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'})
 await page.emulateMedia({reducedMotion:'reduce'})
 for(const atmosphere of ['light','dark']){await page.goto(`http://127.0.0.1:5173/#/__constellation-demo?atmosphere=${atmosphere}&motion=off`);await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(180);await page.screenshot({path:resolve(out,`mobile-${atmosphere}.png`)});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 for(let i=0;i<3;i++){await page.goto('http://127.0.0.1:5173/#/__constellation-demo');await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport);await page.goto('http://127.0.0.1:5173/#/__orbital-demo');await page.waitForFunction(()=>document.querySelector('.orbital-console')?.dataset.renderReport)}
 assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({reports,errors,checks:['same camera light/dark captures','0/1/2 supporters','photon layer independent','reduced motion stops RAF','motion toggle stops RAF','measured active draw cadence','keyboard modal and Escape','mobile no overflow','repeated route entry/exit']},null,2))
 await writeFile(resolve(out,'index.html'),'<meta charset="utf-8"><title>NICØ 氛围 A/B</title><style>body{font:14px sans-serif;background:#242631;color:#e9e7e0;margin:24px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{display:block;width:100%}a{color:inherit}.mobile{max-width:390px}@media(max-width:700px){main{display:block}}</style><h2>同机位氛围 A/B</h2><p><a href="http://127.0.0.1:5173/#/__constellation-demo?atmosphere=light">A · 浅场增强</a> / <a href="http://127.0.0.1:5173/#/__constellation-demo?atmosphere=dark">B · 暗场空间</a></p><main>'+['A-light','B-dark','mobile-light','mobile-dark'].map(name=>`<figure><h3>${name}</h3><img class="${name.startsWith('mobile')?'mobile':''}" src="${name}.png"></figure>`).join('')+'</main>')
 console.log(JSON.stringify({reports,errors},null,2))
}finally{await browser.close()}
