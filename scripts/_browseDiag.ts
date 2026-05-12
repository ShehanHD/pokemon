import 'dotenv/config'
import { getDb } from '../lib/db'

async function main() {
  const d = await getDb()
  const total = await d.collection('sets').countDocuments({})
  const withTcgdexId = await d.collection('sets').countDocuments({ tcgdex_id: { $exists: true, $ne: null } })
  const withPokemontcgId = await d.collection('sets').countDocuments({ pokemontcg_id: { $exists: true, $ne: null } })
  const onlyTcgdex = await d.collection('sets').countDocuments({ tcgdex_id: { $exists: true, $ne: null }, pokemontcg_id: { $exists: false } })
  const onlyLegacy = await d.collection('sets').countDocuments({ pokemontcg_id: { $exists: true, $ne: null }, tcgdex_id: { $exists: false } })
  const both = await d.collection('sets').countDocuments({ tcgdex_id: { $exists: true, $ne: null }, pokemontcg_id: { $exists: true, $ne: null } })
  const distinctSeries = await d.collection('sets').distinct('series')
  const distinctSeriesSlug = await d.collection('sets').distinct('seriesSlug')

  // group sets per series so we can see counts
  const bySeries = await d.collection('sets').aggregate([
    { $group: { _id: { series: '$series', seriesSlug: '$seriesSlug' }, count: { $sum: 1 } } },
    { $sort: { '_id.series': 1 } },
  ]).toArray()

  // missing seriesSlug
  const missingSlug = await d.collection('sets').countDocuments({ $or: [{ seriesSlug: { $exists: false } }, { seriesSlug: null }, { seriesSlug: '' }] })
  const missingSeries = await d.collection('sets').countDocuments({ $or: [{ series: { $exists: false } }, { series: null }, { series: '' }] })

  console.log(JSON.stringify({
    total,
    withTcgdexId,
    withPokemontcgId,
    onlyTcgdex,
    onlyLegacy,
    both,
    distinctSeriesCount: distinctSeries.length,
    distinctSeriesSlugCount: distinctSeriesSlug.length,
    missingSeries,
    missingSlug,
    distinctSeries,
    distinctSeriesSlug,
    bySeries,
  }, null, 2))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
