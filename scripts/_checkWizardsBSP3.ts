import 'dotenv/config'

async function main() {
  // Check a few basep cards directly on TCGdex
  const ids = ['basep-1', 'basep-2', 'basep-3', 'basep-8', 'basep-10', 'basep-50']
  for (const id of ids) {
    const r = await fetch(`https://api.tcgdex.net/v2/en/cards/${id}`)
    if (!r.ok) { console.log(id, '->', r.status); continue }
    const j = await r.json() as { name: string; pricing?: unknown }
    const hasPricing = j.pricing && Object.keys(j.pricing as object).length > 0
    console.log(`${id.padEnd(12)} | ${j.name.padEnd(20)} | pricing: ${hasPricing ? 'YES' : 'no'}`)
    if (hasPricing) console.log('   ', JSON.stringify(j.pricing).slice(0, 300))
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
