// Smoke test 3D (Passo 8+): valida o PlantViewer contra o `npm run dev`.
// Uso: 1) `npm run dev` em um terminal; 2) `node e2e/smoke-3d.mjs [url]`.
// Checa: canvas renderiza com tamanho real, zero erros de console,
// drag do mouse muda os pixels (OrbitControls vivo) e mobile não quebra.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const errors = []
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300))
})
page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e).slice(0, 300)))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('.viewer-wrap canvas', { timeout: 20000 })
await page.locator('.viewer-wrap').scrollIntoViewIfNeeded()
await page.waitForTimeout(3500)

const box = await page.locator('.viewer-wrap canvas').boundingBox()
console.log('CANVAS:', box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'AUSENTE')
const before = await page.locator('.viewer-wrap').screenshot()

await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2 - 40, { steps: 12 })
await page.mouse.up()
await page.waitForTimeout(1200)
const after = await page.locator('.viewer-wrap').screenshot()
console.log('DRAG-MUDA-PIXELS:', !before.equals(after))
writeFileSync('e2e/shot-desktop.png', after)

await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(1500)
const mbox = await page.locator('.viewer-wrap canvas').boundingBox()
console.log('MOBILE-CANVAS:', mbox ? `${Math.round(mbox.width)}x${Math.round(mbox.height)}` : 'AUSENTE')
writeFileSync('e2e/shot-mobile.png', await page.locator('.viewer-wrap').screenshot())

console.log('CONSOLE-ERRORS:', errors.length ? errors : 'zero')
await browser.close()

if (!box || box.width < 50) process.exit(1)
if (before.equals(after)) process.exit(2)
if (errors.length) process.exit(3)
console.log('SMOKE-3D OK')
