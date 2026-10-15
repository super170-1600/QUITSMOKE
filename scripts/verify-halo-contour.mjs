import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/halo-contour'),errors=[]
await mkdir(out,{recursive:true})
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'})
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
  await page.goto('http://127.0.0.1:5173/#/__pulse-demo')
  await page.locator('.pulse-form').waitFor();await page.locator('.pulse-art canvas').waitFor();await page.waitForTimeout(250)
  assert.equal(await page.getByLabel('吸烟量，支',{exact:true}).inputValue(),'')
  async function aligned(){const positions=await page.locator('.pulse-edit-tabs button').evaluateAll(buttons=>buttons.map(button=>{const marker=document.createElement('i');marker.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';button.querySelector('b').append(marker);const value=marker.getBoundingClientRect().top,title=button.querySelector(':scope>span').getBoundingClientRect().top;marker.remove();return {title,value}}));for(const key of ['title','value'])assert.ok(Math.max(...positions.map(row=>row[key]))-Math.min(...positions.map(row=>row[key]))<=1,`${width}px ${key} row must align: ${JSON.stringify(positions)}`)}
  await aligned();await page.locator('.pulse-edit-tabs').screenshot({path:resolve(out,`aligned-tabs-${width}.png`)})
  await page.locator('.pulse-art').screenshot({path:resolve(out,`empty-${width}.png`)})
  await page.locator('.pulse-art-group').screenshot({path:resolve(out,`archive-entry-${width}.png`)})
  const archive=page.getByRole('button',{name:'光环档案',exact:true});await archive.click();await page.getByRole('dialog',{name:'同心圆光环档案',exact:true}).waitFor();assert.equal(await page.locator('.archive-node').count(),49);await page.getByLabel('关闭光环档案',{exact:true}).click();await page.getByRole('dialog',{name:'同心圆光环档案',exact:true}).waitFor({state:'hidden'});assert.equal(await archive.evaluate(el=>el===document.activeElement),true)
  await page.getByLabel('吸烟量，支',{exact:true}).fill('0');await page.waitForTimeout(150)
  await aligned();await page.locator('.pulse-edit-tabs button').nth(2).click();await page.getByRole('button',{name:'平静',exact:true}).click();await aligned()
  await page.locator('.pulse-art').screenshot({path:resolve(out,`record-preview-${width}.png`)})
  assert.equal(await page.getByRole('button',{name:'完成今日打卡',exact:false}).count(),1)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.close()
 }
 assert.deepEqual(errors,[]);console.log('未打卡/0 支预览、桌面/手机轮廓与档案独立入口、49 个日期槽、开关与焦点恢复通过；未保存或写入真实账户。')
}finally{await browser.close()}
