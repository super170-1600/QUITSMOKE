import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
const runtime = resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { chromium } = createRequire(resolve(runtime, 'package.json'))('playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage()
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.goto('http://127.0.0.1:5173/')
  const blueprint = await page.evaluate(async () => (await import('/src/visuals/modelBlueprint.ts')).createModelBlueprint())
  await mkdir('artifacts/blender-study', { recursive: true })
  await writeFile('artifacts/blender-study/blueprint.json', JSON.stringify(blueprint))
  console.log(`Blueprint: ${blueprint.faces.length} planes, ${blueprint.core.length} core parts, ${blueprint.glyphs.length} glyphs`)
} finally { await browser.close() }
