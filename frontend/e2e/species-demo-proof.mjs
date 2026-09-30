// Smoke test dos modelos procedurais e cenários de demonstração sem backend/LLM.
// Uso: `npm run dev`; `node e2e/species-demo-proof.mjs [url]`.
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const CASES = [
  ['Manjericão no fundo do rio', 'Manjericão', 'submersa no rio'],
  ['Monstera com 700 L de água', 'Costela-de-adão', 'inundação'],
  ['Girassol bem cuidado', 'Girassol', 'bem cuidada'],
  ['Roseira em solo compactado', 'Roseira', 'solo ruim'],
  ['Samambaia no escuro', 'Samambaia', 'no escuro'],
  ['Manjericão no calor seco', 'Manjericão', 'calor'],
  ['Cacto em geada', 'Cacto', 'congelada'],
  ['Costela-de-adão com pragas', 'Costela-de-adão', 'pragas'],
  ['Girassol em vendaval', 'Girassol', 'vento forte'],
  ['Rosa com excesso de adubo', 'Roseira', 'fertilizante'],
  ['Girassol com luz adequada', 'Girassol', 'luz adequada'],
  ['Samambaia sem água', 'Samambaia', 'sem água'],
  ['Manjericão no micro-ondas', 'Manjericão', 'micro-ondas'],
  ['Orquídea abrindo flores', 'Orquídea', 'florescendo'],
  ['Tomate sendo polinizado', 'Tomateiro', 'polinizada'],
  ['Babosa em solo seco', 'Babosa', 'sem água'],
  ['Lavanda recebendo composto', 'Lavanda', 'composto orgânico'],
  ['Bambu sob chuva leve', 'Bambu', 'chuva leve'],
  ['Limoeiro transplantado', 'Limoeiro', 'transplantada'],
  ['Roseira sendo podada', 'Roseira', 'podada'],
  ['Tomateiro atingido por granizo', 'Tomateiro', 'granizo'],
  ['Costela-de-adão com água sanitária', 'Costela-de-adão', 'produto químico'],
  ['Manjericão com chuva leve', 'Manjericão', 'chuva leve'],
]
const errors = []
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', (error) => errors.push(String(error)))
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.locator('.demo-scenarios summary').click()
for (const [title, species, effect] of CASES) {
  await page.getByRole('button', { name: title, exact: true }).click()
  await page.getByText(species, { exact: true }).first().waitFor()
  await page.waitForSelector('.viewer-wrap canvas')
  await page.waitForTimeout(700)
  const fx = await page.locator('.fx-chip').innerText()
  if (!fx.toLowerCase().includes(effect.toLowerCase())) errors.push(`${title}: efeito incorreto (${fx})`)
  console.log(`${title} → ${species} | ${fx}`)
}
await browser.close()
if (errors.length) {
  console.error('Browser errors:', errors)
  process.exit(1)
}
console.log('SPECIES-DEMO-PROOF OK')
