import { cookies } from 'next/headers'
import Script from 'next/script'
import type { Tier } from '@/lib/types'
import ConsentBanner from './ConsentBanner'

export async function getAdsLayerState(tier: Tier | null | undefined) {
  const cookieStore = await cookies()
  const consent = cookieStore.get('ads-consent')?.value ?? null
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  // TEMP: tier check disabled for ad-placement preview. Restore `&& tier === 'free'` before shipping.
  const adsConfigured = !!adsenseClient
  void tier
  const adsEnabled = adsConfigured && consent === 'granted'
  const showConsentBanner =
    adsConfigured && consent !== 'granted' && consent !== 'denied'
  return { adsenseClient, adsEnabled, showConsentBanner }
}

export default function AdsLayer({
  adsenseClient,
  adsEnabled,
  showConsentBanner,
}: {
  adsenseClient: string | undefined
  adsEnabled: boolean
  showConsentBanner: boolean
}) {
  return (
    <>
      {showConsentBanner && <ConsentBanner />}
      {adsEnabled && adsenseClient && (
        <Script
          id="adsbygoogle-init"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          crossOrigin="anonymous"
        />
      )}
    </>
  )
}
