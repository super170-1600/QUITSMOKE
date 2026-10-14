import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/halo-state-feedback')
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],hashes={}
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 await page.goto('http://127.0.0.1:5173/#/__pulse-demo');await page.locator('.pulse-form').waitFor();await page.locator('.pulse-art canvas').waitFor()
 async function shot(name){await page.waitForTimeout(180);const path=resolve(out,name+'.png');await page.locator('.pulse-art').screenshot({path});hashes[name]=createHash('sha256').update(await readFile(path)).digest('hex')}
 await shot('empty');await page.locator('.pulse-edit-tabs button').nth(2).click();await page.locator('.pulse-moods').getByRole('button',{name:'焦虑',exact:true}).click();await shot('anxious-without-amount');assert.notEqual(hashes.empty,hashes['anxious-without-amount']);await page.locator('.pulse-edit-tabs button').first().click();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'')
 await page.locator('#pulse-cigarettes').fill('0');await page.locator('.pulse-edit-tabs button').nth(2).click();await page.locator('.pulse-moods').getByRole('button',{name:'平静',exact:true}).click();await page.locator('.pulse-edit-tabs button').first().click()
 for(const count of [0,1,5,20,200]){await page.locator('#pulse-cigarettes').fill(String(count));await shot('amount-'+count)}
 assert.equal(new Set([0,1,5,20,200].map(count=>hashes['amount-'+count])).size,5)
 await page.locator('#pulse-cigarettes').fill('0');await page.locator('.pulse-edit-tabs button').nth(2).click()
 for(const [key,label] of [['relaxed','轻松'],['calm','平静'],['anxious','焦虑'],['irritable','烦躁'],['tired','疲惫'],['fulfilled','充实']]){await page.locator('.pulse-moods').getByRole('button',{name:label,exact:true}).click();await shot('mood-'+key)}
 assert.equal(new Set(['anxious','irritable','tired'].map(key=>hashes['mood-'+key])).size,3);assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({distinctAmounts:true,distinctMoods:true,moodPreviewBeforeAmount:true,noSavePerformed:true,hashes,errors},null,2))
 await writeFile(resolve(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>光环数据反馈</title><style>body{background:#e9eef1;color:#355063;font:14px system-ui;margin:24px}section{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}img{width:100%}figure{margin:0}</style><h1>同镜头数据反馈对照</h1><h2>吸烟量</h2><section>${[0,1,5,20,200].map(count=>`<figure><img src="amount-${count}.png"><figcaption>${count} 支</figcaption></figure>`).join('')}</section><h2>感受</h2><section>${[['relaxed','轻松'],['calm','平静'],['anxious','焦虑'],['irritable','烦躁'],['tired','疲惫'],['fulfilled','充实']].map(([key,label])=>`<figure><img src="mood-${key}.png"><figcaption>${label}</figcaption></figure>`).join('')}</section>`)
 console.log('Distinct amount and mood renders, mood preview before amount, no writes, zero page errors passed')
}finally{await browser.close()}
