import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/constellation-core-state'),errors=[]
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5173/#/__constellation-demo?motion=off')
 await page.waitForFunction(()=>document.querySelector('[data-study-report]')?.dataset.studyReport)
 await page.locator('[data-target=core]').click()
 const images=[]
 for(const [name,count,score,mood] of [['calm',0,0,'平静'],['anxious',10,8,'焦虑'],['irritable',20,10,'烦躁'],['tired',3,4,'疲惫']]){
  await page.getByLabel('吸烟量',{exact:true}).fill(String(count));await page.getByLabel('烟瘾',{exact:true}).fill(String(score));await page.getByRole('button',{name:mood,exact:true}).click();await page.waitForTimeout(120)
  const image=await page.locator('.constellation-stage').screenshot({path:resolve(out,`${name}.png`)});images.push(await page.screenshot({clip:{x:570,y:310,width:290,height:310}}))
 }
 for(let i=1;i<images.length;i++)assert.ok(!images[0].equals(images[i]))
 await page.getByRole('button',{name:'模拟下次保存失败'}).click();await page.getByRole('button',{name:'保存打卡',exact:true}).click();await page.getByRole('alert').waitFor()
 assert.equal(await page.getByLabel('吸烟量',{exact:true}).inputValue(),'3')
 await page.getByRole('button',{name:'保存打卡',exact:true}).click();await page.locator('.workbench .success').waitFor()
 await page.getByRole('button',{name:'关闭联动浮层'}).click();await page.screenshot({path:resolve(out,'saved.png')})
 await page.locator('[data-target=core]').click();await page.getByLabel('模拟身份').selectOption('supporter');assert.equal(await page.getByLabel('吸烟量',{exact:true}).count(),0)
 await page.getByRole('button',{name:'关闭联动浮层'}).click();await page.screenshot({path:resolve(out,'supporter.png')})
 assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({errors,checks:['静态及减弱动画模式实时更新','四种状态同机位截图不同','保存失败保留输入','保存成功关闭编辑','支持者无私人输入']},null,2))
 console.log('Core state browser verification passed')
}finally{await browser.close()}
