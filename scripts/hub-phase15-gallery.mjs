import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function writeHubPhase15Gallery(out) {
  const views = [
    ['before-overview', '修改前 · 主视角'], ['overview', '修改后 · 同一主视角'],
    ['before-front', '修改前 · 正面'], ['front', '修改后 · 同一正面'],
    ['left', '左侧'], ['right', '右侧'], ['back', '背面 · 04 空白预留面'], ['top', '顶部'],
    ['checkin', '打卡面'], ['progress', '数据面'], ['achievements', '成就面'], ['support', '互助面'],
    ['profile', '个人面'], ['mobile', '手机'], ['fallback', 'WebGL 降级'],
  ]
  await writeFile(resolve(out, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QUITSMOKE Phase 1.5 视觉验收</title>
    <style>body{margin:32px;background:#f2f1ed;color:#34393b;font:14px system-ui}h1{font-size:20px;font-weight:500}p{color:#727879}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0;background:#fff8}img{width:100%;display:block}figcaption{padding:12px}a{color:inherit}@media(max-width:700px){body{margin:16px}main{grid-template-columns:1fr}}</style>
    <h1>QUITSMOKE · Phase 1.5</h1><p>前后对照采用相同相机、晶体姿态、1440 × 900 视口及减弱动画设置。晶体轮廓本身已调整。其余为固定角度检查图。</p>
    <main>${views.map(([view,label]) => `<figure><a href="${view}.png"><img src="${view}.png" alt="${label}" loading="lazy"></a><figcaption>${label}</figcaption></figure>`).join('')}</main></html>`)
}

if (process.argv[1]?.endsWith('hub-phase15-gallery.mjs')) await writeHubPhase15Gallery(resolve('artifacts/hub-phase15'))
