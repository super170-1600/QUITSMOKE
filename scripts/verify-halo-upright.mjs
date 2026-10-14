import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/halo-upright')
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[]
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 await page.goto('http://127.0.0.1:5173/#/__pulse-demo');await page.locator('.pulse-form').waitFor();await page.locator('.pulse-archive-button').click();await page.locator('.halo-archive canvas').waitFor();await page.waitForTimeout(200)
 const space=page.locator('.halo-space'),positions=()=>page.locator('.archive-node').evaluateAll(nodes=>nodes.map(n=>({date:n.dataset.date,left:n.style.left,top:n.style.top})))
 assert.equal(await page.locator('.archive-node').count(),49);assert.equal(await page.locator('.archive-ring-selector button').count(),7);const initial=await positions();const stage=await space.boundingBox();for(const position of initial){assert.ok(parseFloat(position.top)*stage.height/100>=26);assert.ok(parseFloat(position.top)*stage.height/100<=stage.height-26)}await page.screenshot({path:resolve(out,'front.png')})
 const box=await space.boundingBox();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.65+125,box.y+box.height*.5+35,{steps:8});await page.mouse.up();await page.waitForTimeout(100);assert.notDeepEqual(await positions(),initial);assert.equal(await page.locator('.archive-detail').count(),0);await page.screenshot({path:resolve(out,'rotated.png')})
 await page.locator('.archive-node:not([disabled])').last().click();await page.locator('.archive-detail').waitFor();assert.ok((await page.locator('.archive-detail').innerText()).includes(initial.filter(node=>node.date<=new Date().toLocaleDateString('sv-SE')).at(-1).date));await space.focus();await page.keyboard.press('Home');await page.waitForTimeout(100);assert.deepEqual(await positions(),initial)
 await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);assert.notDeepEqual(await positions(),initial);await page.keyboard.press('Home')
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.screenshot({path:resolve(out,'mobile.png')});const mobileBefore=await positions()
 await space.dispatchEvent('pointerdown',{pointerId:9,pointerType:'touch',button:0,clientX:180,clientY:400});await space.dispatchEvent('pointermove',{pointerId:9,pointerType:'touch',button:0,clientX:230,clientY:420});await space.dispatchEvent('pointerup',{pointerId:9,pointerType:'touch',button:0,clientX:230,clientY:420});await page.waitForTimeout(100);assert.notDeepEqual(await positions(),mobileBefore)
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await space.focus();await page.keyboard.press('Home');await page.waitForTimeout(100)
 const inertiaBox=await space.boundingBox();await page.mouse.move(inertiaBox.x+inertiaBox.width*.65,inertiaBox.y+inertiaBox.height*.55);await page.mouse.down();await page.mouse.move(inertiaBox.x+inertiaBox.width*.65+145,inertiaBox.y+inertiaBox.height*.55,{steps:6});await page.mouse.up();const released=await positions();await page.waitForTimeout(160);assert.notDeepEqual(await positions(),released)
 await page.mouse.move(inertiaBox.x+inertiaBox.width*.25,inertiaBox.y+inertiaBox.height*.6);await page.mouse.down();await page.waitForTimeout(60);const stopped=await positions();await page.waitForTimeout(180);assert.deepEqual(await positions(),stopped);await page.mouse.up()
 await space.focus();await page.keyboard.press('Home');await page.waitForTimeout(100);await page.screenshot({path:resolve(out,'front.png')});assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({mouseRotation:true,dragDoesNotSelect:true,datesRemainAttached:true,keyboardRotation:true,homeResets:true,touchRotation:true,inertia:true,pressStopsInertia:true,sevenWeeks:true,errors},null,2))
 console.log('Horizontal archive with upright daily halos, drag rotation, attached dates, click selection, keyboard/reset and touch passed')
}finally{await browser.close()}
