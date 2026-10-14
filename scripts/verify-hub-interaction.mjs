import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const out=resolve('artifacts/hub-phase2');await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],checks={}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 page.on('pageerror',e=>{errors.push(e.stack||e.message);console.log(e.stack||e.message)});page.on('console',m=>{if(m.type()==='error'){console.log(m.text());if(/Shader|WebGLProgram|initialization failed/.test(m.text()))errors.push(m.text())}})
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 await page.goto('http://127.0.0.1:5173/#/__hub-preview');await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000});await page.waitForTimeout(500)
 const surface=page.locator('.hub-interaction'),state=()=>surface.evaluate(el=>JSON.parse(el.dataset.interaction))
 await page.screenshot({path:resolve(out,'overview.png')})
 const labels=['每日打卡','戒烟数据','成就','互助支持','个人中心'],ids=['checkin','progress','achievements','support','profile']
 for(let i=0;i<5;i++){
   await page.getByRole('button',{name:labels[i],exact:true}).focus();await page.waitForTimeout(120)
   assert.equal((await state()).face,ids[i]);assert.equal((await state()).mode,'focused')
   await surface.focus();await page.keyboard.press('Enter');await page.locator('.module-preview').waitFor();assert.ok(page.url().endsWith('/__hub-module/'+ids[i]));await page.getByRole('button',{name:'返回晶体导航'}).click();await page.locator('.crystal-hub.is-ready:not(.is-closing)').waitFor()
   await page.getByRole('button',{name:labels[i],exact:true}).focus();await page.waitForTimeout(120)
   const pickBox=await surface.boundingBox();await page.mouse.click(pickBox.x+pickBox.width/2,pickBox.y+pickBox.height/2);await page.waitForTimeout(150)
   await page.locator('.module-preview').waitFor();assert.ok(page.url().endsWith('/__hub-module/'+ids[i]));await page.getByRole('button',{name:'返回晶体导航'}).click();await page.locator('.crystal-hub.is-ready:not(.is-closing)').waitFor();assert.equal((await state()).face,ids[i])
   await page.screenshot({path:resolve(out,ids[i]+'.png')})
 }
 checks.keyboardFiveFaces=true;checks.pointerFiveFaces=true;assert.equal(await page.getByRole('button').count(),5)
 await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal((await state()).mode,'idle')
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);assert.equal((await state()).face,'checkin')
 await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);assert.equal((await state()).face,'profile');checks.arrowKeys=true
 await page.getByRole('button',{name:'每日打卡',exact:true}).focus();await page.waitForTimeout(100)
 let box=await surface.boundingBox();let x=box.x+box.width/2,y=box.y+box.height/2
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+90,y+60,{steps:10});await page.mouse.up();await page.waitForTimeout(600)
 assert.equal((await state()).mode,'focused');assert.equal((await state()).activated,false);assert.notEqual((await state()).face,'reserved');checks.dragNoActivation=true
 await page.emulateMedia({reducedMotion:'no-preference'});box=await surface.boundingBox();x=box.x+box.width/2;y=box.y+box.height/2
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-110,y-65,{steps:8});await page.mouse.up();await page.waitForTimeout(1100)
 assert.equal((await state()).mode,'focused');const q=(await state()).quaternion;await page.waitForTimeout(300);assert.deepEqual((await state()).quaternion,q);checks.inertiaStops=true
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200)
 const cdp=await page.context().newCDPSession(page);box=await surface.boundingBox();x=box.x+box.width/2;y=box.y+box.height/2
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-60*i/8,y:y+45*i/8}]})
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1100)
 assert.equal((await state()).mode,'focused');assert.equal((await state()).activated,false);checks.mobileTouch=true
 await page.screenshot({path:resolve(out,'mobile.png')});assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({checks,errors,finalState:await state()},null,2))
 await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>QUITSMOKE Phase 2</title><style>body{margin:28px;background:#f5f4ef;font:14px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%}</style><h1>Phase 2 · 拖动与磁吸导航</h1><p>五面键盘选择、拖拽不激活、惯性停止、手机触控与减弱动效验证。</p><main>${['overview',...ids,'mobile'].map(id=>`<figure><img src="${id}.png"><figcaption>${id}</figcaption></figure>`).join('')}</main><pre>${JSON.stringify(checks,null,2)}</pre></html>`)
 console.log(JSON.stringify(checks))
}finally{await browser.close()}
