import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth'
import {
  getCollectionStats,
  getRawVsGradedSplit,
  getRarityBreakdown,
  getBySeriesBreakdown,
  getBySetBreakdown,
  getCollectionTimeseries,
} from '@/lib/userCards'
import KpiCards from './charts/KpiCards'
import RawVsGradedDonut from './charts/RawVsGradedDonut'
import RarityChart from './charts/RarityChart'
import BySeriesChart from './charts/BySeriesChart'
import BySetChart from './charts/BySetChart'
import AcquisitionTimeline from './charts/AcquisitionTimeline'
import SpendTimeline from './charts/SpendTimeline'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/analytics')
  if (session.user.tier !== 'pro') redirect('/dashboard')
  const userId = session.user.id

  const cachedStats = unstable_cache(
    async (uid: string) => getCollectionStats(uid),
    ['collection-stats'],
    { revalidate: 60, tags: [`user:${userId}:stats`] },
  )
  const stats = await cachedStats(userId)

  if (stats.totalCopies === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl text-text mb-2">Analytics</h1>
        <p className="text-overlay1 mb-4">Add your first card to unlock collection analytics.</p>
        <Link href="/browse" className="inline-block px-4 py-2 rounded bg-blue text-base font-bold">Browse cards →</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl text-text">Analytics</h1>
      <KpiCards stats={stats} />
      <ProCharts userId={userId} />
    </div>
  )
}

async function ProCharts({ userId }: { userId: string }) {
  const [rg, rarity, series, sets, ts] = await Promise.all([
    getRawVsGradedSplit(userId),
    getRarityBreakdown(userId),
    getBySeriesBreakdown(userId),
    getBySetBreakdown(userId, 10),
    getCollectionTimeseries(userId),
  ])
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <RawVsGradedDonut data={rg} />
      <RarityChart data={rarity} />
      <BySeriesChart data={series} />
      <BySetChart data={sets} />
      <div className="md:col-span-2"><AcquisitionTimeline data={ts} /></div>
      <div className="md:col-span-2"><SpendTimeline data={ts} /></div>
    </div>
  )
}
