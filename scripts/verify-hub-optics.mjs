import { createRequire } from 'node:module'
import { mkdir,readFile,writeFile,copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const out=resolve(process.env.HUB_OPTICS_CAPTURE_DIR || 'artifacts/hub-optics-v2');await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true})
const errors=[],stats={},performanceResults={}
try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'})
  page.on('pageerror',e=>{errors.push(e.stack||e.message);console.log(e.stack||e.message)});page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGLProgram/.test(m.text()))errors.push(m.text())})
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
  async function capture(name,query,width=1440,height=900){
    await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:5173/#/__hub-preview?view=overview&${query}`);await page.reload()
    await page.locator('.crystal-hub.is-ready').waitFor({timeout:30000});await page.waitForTimeout(800)
    stats[name]=JSON.parse(await page.locator('canvas').getAttribute('data-render-stats'))
    assert.equal(stats[name].faceIds.length,6);assert.ok(stats[name].visibleFaceIds.length>=3)
    await page.screenshot({path:resolve(out,name+'.png')});console.log('Captured '+name)
  }
  await capture('A-shell','stage=A&photons=0')
  await capture('B-seal','stage=C&photons=0')
  await capture('C-full','stage=D&photons=1')
  await capture('D-photons-off','stage=D&photons=0')
  await capture('E-low-density','stage=D&photons=1&density=.35')
  await capture('F-desktop-wide','stage=D&photons=1',1920,1080)
  await capture('G-mobile','stage=D&photons=1',390,844)
  await capture('H-physical','stage=D&scheme=physical&photons=1')
  assert.equal(stats['C-full'].photons,true);assert.equal(stats['D-photons-off'].photons,false)
  assert.equal(stats['E-low-density'].density,.35)
  assert.ok(stats['C-full'].triangles>stats['E-low-density'].triangles)
  assert.ok(stats['E-low-density'].triangles>stats['D-photons-off'].triangles)
  await page.emulateMedia({reducedMotion:'no-preference'})
  for(const on of [0,1]){
    await page.goto(`http://127.0.0.1:5173/#/__hub-preview?view=overview&stage=D&photons=${on}&motion=1`);await page.reload()
    await page.locator('.crystal-hub.is-ready').waitFor();await page.waitForTimeout(1500)
    performanceResults[on?'on':'off']=await page.evaluate(async()=>{
      const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info')
      const before=JSON.parse(canvas.dataset.renderStats),start=performance.now();const intervals=[];let prev=start,active=true
      function sample(t){intervals.push(t-prev);prev=t;if(active)requestAnimationFrame(sample)}requestAnimationFrame(sample)
      await new Promise(resolve=>setTimeout(resolve,5000));active=false
      const end=performance.now(),after=JSON.parse(canvas.dataset.renderStats),sorted=intervals.slice(1).sort((a,b)=>a-b)
      return {viewport:[innerWidth,innerHeight],pixelRatio:after.pixelRatio,seconds:(end-start)/1000,renderedFrames:after.renderedFrames-before.renderedFrames,fps:(after.renderedFrames-before.renderedFrames)*1000/(end-start),rafMedianMs:sorted[Math.floor(sorted.length*.5)],rafP95Ms:sorted[Math.floor(sorted.length*.95)],gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),userAgent:navigator.userAgent,calls:after.calls,triangles:after.triangles}
    });console.log('Measured '+(on?'on':'off')+' '+performanceResults[on?'on':'off'].fps.toFixed(1)+' FPS')
  }
  assert.deepEqual(errors,[])
  const model=await readFile('public/models/quitsmoke-seal-study.glb'),gltf=JSON.parse(model.subarray(20,20+model.readUInt32LE(12)))
  const report={glbBytes:model.length,hdrBytes:(await readFile('public/environments/studio_small_09_1k.hdr')).length,faces:gltf.nodes.filter(n=>n.extras?.assetRole==='face').map(n=>({id:n.extras.faceId,area:n.extras.navigationArea,normal:n.extras.navigationNormal})),cutCount:gltf.nodes.filter(n=>n.extras?.assetRole==='cut').length,stats,performanceResults,errors}
  await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2));await copyFile('artifacts/blender-study/cycles-reference.png',resolve(out,'I-blender-cycles.png'))
  const labels={'A-shell':'1 · 仅外壳','B-seal':'2 · 外壳与内部封印','C-full':'3 · 完整画面 / 光子开启','D-photons-off':'4 · 光子关闭','E-low-density':'粒子密度 35%','F-desktop-wide':'5 · 桌面 1920×1080','G-mobile':'5 · 手机 390×844','H-physical':'物理透射对照','I-blender-cycles':'6 · Blender Cycles 离线参考（同机位、1440×900）'}
  await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QUITSMOKE 光学晶体 v2</title><style>body{margin:32px;background:#f5f2ec;color:#42484c;font:14px system-ui}h1{font-size:22px;font-weight:500}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0}img{display:block;width:100%;object-fit:contain;max-height:700px}figcaption{padding:12px}pre{white-space:pre-wrap}@media(max-width:700px){main{grid-template-columns:1fr}}</style><h1>QUITSMOKE · 切面与空间光子系统</h1><p>A/B/C/D 同机位、1440×900，静止在相同时间；C 与 D 为完整系统开关对照。离线图的光源与物理透射算法不同，不代表网页已达到离线品质。</p><main>${Object.entries(labels).map(([name,label])=>`<figure><a href="${name}.png"><img src="${name}.png" alt="${label}"></a><figcaption>${label}</figcaption></figure>`).join('')}</main><h2>实测性能</h2><p>Headless Edge，DPR 1，预热 1.5 秒、每项采样 5 秒。此结果只代表报告列出的 GPU 和测试条件。</p><pre>${JSON.stringify(performanceResults,null,2)}</pre><a href="verification.json">完整数据</a></html>`)
}finally{await browser.close()}
