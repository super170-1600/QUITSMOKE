import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { chromium }=createRequire(resolve(runtime,'package.json'))('playwright')
const out=resolve('artifacts/seal-study-review'); await mkdir(out,{recursive:true})
const buffer=await readFile('public/models/quitsmoke-seal-study.glb')
assert.equal(buffer.readUInt32LE(0),0x46546c67);assert.equal(buffer.readUInt32LE(4),2)
const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString())
const faceIds=json.nodes.filter(n=>n.extras?.assetRole==='face').map(n=>n.extras.faceId).sort()
assert.deepEqual(faceIds,['achievements','checkin','profile','progress','reserved','support'])
assert.equal(json.nodes.filter(n=>n.extras?.assetRole==='ribbon').length,3)
assert.equal(json.nodes.filter(n=>n.extras?.assetRole==='glyph').length,5)
assert.ok(!json.nodes.some(n=>n.name==='Glyph_reserved'))
const browser=await chromium.launch({channel:'msedge',headless:true})
const errors=[], stats={}
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'})
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGLProgram/.test(m.text()))errors.push(m.text())})
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
  for(const scheme of ['physical','hybrid']) for(const stage of ['A','B','C','D']) {
    await page.goto(`http://127.0.0.1:5173/#/__hub-preview?view=overview&stage=${stage}&scheme=${scheme}`)
    await page.reload();await page.locator('.crystal-hub.is-ready').waitFor({timeout:30000});await page.waitForTimeout(700)
    const key=`${scheme}-${stage}`
    stats[key]=JSON.parse(await page.locator('canvas').getAttribute('data-render-stats'))
    assert.deepEqual([...stats[key].faceIds].sort(),faceIds)
    assert.equal(stats[key].stage,stage);assert.equal(stats[key].scheme,scheme)
    await page.screenshot({path:resolve(out,key+'.png')});console.log('Captured '+key)
  }
  assert.deepEqual(errors,[])
  await writeFile(resolve(out,'verification.json'),JSON.stringify({source:'Blender 4.5.9 GLB',glbBytes:buffer.length,faceIds,schemes:['physical','hybrid'],stages:['A','B','C','D'],viewport:[1440,900],errors,stats},null,2))
  const labels={A:'外层导航晶体',B:'晶体 + 香烟与空间碎片流',C:'完整双层封印与立体丝带',D:'完整结构 + 次要功能标识'}
  await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QUITSMOKE 双层封印美术评估</title><style>body{margin:28px;background:#f4f1ec;color:#343b3e;font:14px system-ui}h1{font-size:20px;font-weight:500}h2{font-size:16px;font-weight:500}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0}img{display:block;width:100%}figcaption{padding:12px;color:#657075}a{color:inherit}@media(max-width:700px){main{grid-template-columns:1fr}}</style><h1>QUITSMOKE · Blender 双层封印样板</h1><p>每行相同机位、相同 1440 × 900 视口。左列为完整物理透射，右列为内部可见性优先；右列外壳不计算折射。</p><main>${['A','B','C','D'].flatMap(stage=>['physical','hybrid'].map(scheme=>`<figure><a href="${scheme}-${stage}.png"><img src="${scheme}-${stage}.png" alt="${stage} ${scheme}"></a><figcaption>${stage} · ${labels[stage]} · ${scheme}</figcaption></figure>`)).join('')}</main><h2>Blender Cycles 参考图（离线，960 × 600）</h2><p>这张不是网页截图，不能作为浏览器已达到相同效果的证据。</p><a href="../blender-study/cycles-reference.png"><img style="max-width:960px" src="../blender-study/cycles-reference.png" alt="离线 Cycles 美术参考"></a></html>`)
} finally {await browser.close()}
