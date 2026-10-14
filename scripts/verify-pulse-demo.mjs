import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright'),browser=await chromium.launch({channel:'msedge',headless:true})
const out=resolve('artifacts/nico-pulse-demo');await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),external=[],errors=[]
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(new URL(r.request().url()).hostname==='127.0.0.1')return r.continue();external.push(r.request().url());return r.abort()})
 await page.goto('http://127.0.0.1:5173/#/__pulse-demo');await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'')
 await page.locator('#pulse-cigarettes').fill('0');await page.locator('.pulse-edit-tabs button').nth(1).click();await page.locator('#pulse-score').fill('7');await page.locator('.pulse-edit-tabs button').nth(2).click();await page.locator('.pulse-moods').getByRole('button',{name:'充实',exact:true}).click();await page.locator('.pulse-submit').click();await page.locator('.pulse-success').waitFor()
 await page.reload();await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'0');assert.equal(await page.locator('.pulse-edit-tabs button').nth(1).locator('b').innerText(),'7 /10')
 await page.locator('.pulse-archive-button').click();await page.locator('.halo-archive').waitFor();assert.equal(await page.locator('.archive-node').count(),49);await page.screenshot({path:resolve(out,'archive.png')});await page.keyboard.press('Escape')
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'mobile.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'恢复示例',exact:true}).click();await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'')
 assert.deepEqual(external,[]);assert.deepEqual(errors,[])
 await page.goto('http://127.0.0.1:5173/#/hub');await page.waitForURL(/#\/login\?redirect=\/hub/)
 await writeFile(resolve(out,'verification.json'),JSON.stringify({anonymousDemo:true,localSaveReload:true,fixed49Nodes:true,mobile:true,reset:true,noExternalRequests:true,protectedHub:true,errors},null,2))
 console.log('Anonymous demo, local save/reload, archive, reset, mobile, zero external requests and protected hub passed')
}finally{await browser.close()}
