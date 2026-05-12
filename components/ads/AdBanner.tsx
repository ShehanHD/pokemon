import type { Tier } from '@/lib/types'
import AdInit from './AdInit'

export default function AdBanner({
  tier,
  slot,
}: {
  tier: Tier | null | undefined
  slot?: string
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const slotId = slot ?? process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER

  if (!client) return null
  // TEMP: tier gate disabled so pro users can preview ad placement. Re-enable before shipping.
  // if (tier && tier !== 'free') return null
  void tier

  const wrapperClass =
    'flex justify-center bg-base/95 backdrop-blur-sm border-t border-surface0 py-2 px-4'

  if (!slotId) {
    return (
      <div aria-label="Advertisement placeholder" className={wrapperClass}>
        <div
          className="flex items-center justify-center bg-gray-200 text-gray-500 text-xs uppercase tracking-wide rounded"
          style={{ height: 90, width: '100%', maxWidth: 728 }}
        >
          Ad slot (728×90)
        </div>
      </div>
    )
  }

  return (
    <div aria-label="Advertisement" className={wrapperClass}>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', height: 90, width: '100%', maxWidth: 728 }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <AdInit />
    </div>
  )
}
