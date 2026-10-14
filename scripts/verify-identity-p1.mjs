import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/identity-p1'),errors=[]
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});let external=0
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(new URL(r.request().url()).hostname==='127.0.0.1')return r.continue();external++;return r.abort()})
 await page.goto('http://127.0.0.1:5173/#/__identity-demo');await page.getByLabel('查看身份晶片',{exact:true}).waitFor();await page.screenshot({path:resolve(out,'desktop.png')})
 assert.equal(await page.locator('[data-section]').count(),6);assert.equal(await page.locator('input,select,textarea').count(),0)
 assert.equal(await page.locator('.identity-chip').evaluate(el=>getComputedStyle(el).animationName),'none')
 await page.locator('[data-section=personal]').focus();await page.keyboard.press('Enter');await page.getByLabel('个人资料',{exact:true}).waitFor();await page.screenshot({path:resolve(out,'personal-panel.png')});await page.keyboard.press('Escape');await page.locator('[data-section=personal]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-section=personal]')===document.activeElement)
 await page.getByLabel('查看身份晶片',{exact:true}).click();await page.locator('.identity-detail').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.identity-detail').count(),0)
 await page.emulateMedia({reducedMotion:'no-preference'});const chip=page.locator('.identity-chip'),box=await chip.boundingBox();await page.mouse.move(box.x+box.width*.85,box.y+box.height*.25)
 const tilt=await page.locator('.chip-space').evaluate(el=>({x:parseFloat(el.style.getPropertyValue('--rx')),y:parseFloat(el.style.getPropertyValue('--ry'))}));assert.ok(Math.abs(tilt.x)<=5&&Math.abs(tilt.y)<=5&&Math.abs(tilt.y)>0)
 await page.getByLabel('切换静态晶片预览').click();assert.equal(await chip.evaluate(el=>getComputedStyle(el).animationName),'none');await page.screenshot({path:resolve(out,'static.png')})
 await page.goto('http://127.0.0.1:5173/#/__identity-demo?role=supporter&static=1');await chip.waitFor();assert.equal(await page.locator('[data-section=smoking]').count(),0);assert.equal(await page.locator('[data-section]').count(),5);await page.screenshot({path:resolve(out,'supporter.png')})
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5173/#/__identity-demo?static=1');await chip.waitFor();await page.screenshot({path:resolve(out,'mobile.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('[data-section=family]').click();await page.getByLabel('家庭关系',{exact:true}).waitFor();await page.screenshot({path:resolve(out,'mobile-family.png')})
 assert.equal(await page.getByLabel('返回晶体主页面').getAttribute('href'),'#/__hub-preview');await page.reload();await chip.waitFor();assert.equal(await page.locator('[data-section]').count(),6)
 assert.equal(external,0);assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({externalRequests:external,errors,tilt,checks:['桌面手机截图','支持者隐藏戒烟设置','样板无业务写入控件及外部网络请求','键盘展开返回与焦点恢复','晶片点击必要身份信息','鼠标倾斜不超过五度','系统减弱动画及手动静态','刷新及返回入口','手机无横向溢出']},null,2))
 await writeFile(resolve(out,'index.html'),'<meta charset="utf-8"><title>NICØ Identity P1</title><style>body{background:#eee;font:14px sans-serif;margin:24px;color:#456}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%;display:block}figure{margin:0}.mobile{max-width:390px}</style><p><a href="http://127.0.0.1:5173/#/__identity-demo">身份空间预览</a> · P1 只读样本</p><main>'+['desktop','mobile','personal-panel','supporter','static','mobile-family'].map(name=>`<figure><p>${name}</p><img class="${name.startsWith('mobile')?'mobile':''}" src="${name}.png"></figure>`).join('')+'</main>')
 console.log('Identity P1 browser verification passed')
}finally{await browser.close()}
