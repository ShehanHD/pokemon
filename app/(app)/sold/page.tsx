import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getSoldCardsForUser } from '@/lib/userCards'
import { formatCurrency } from '@/lib/currency'
import { DEFAULT_CURRENCY, type Currency } from '@/lib/types'
import EditSoldDialog from '@/components/sold/EditSoldDialog'

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function SoldPage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect('/login?next=/sold')
  if (session?.user?.tier !== 'pro') redirect('/dashboard?upgrade=1')

  const currency: Currency = session?.user?.currency ?? DEFAULT_CURRENCY
  const rows = await getSoldCardsForUser(userId)

  const totalSold = rows.reduce((s, r) => s + r.soldPrice, 0)
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0)
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0)

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-4 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-russo">Sold</h1>
        <span className="text-overlay0 text-xs tabular-nums">{rows.length} copies</span>
      </header>

      {rows.length === 0 ? (
        <div className="bg-base border border-surface0 rounded-xl p-6 text-center">
          <p className="text-overlay0 text-sm">
            No sold copies yet. Mark a copy as sold from any card page to start tracking realized gains.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-base border border-surface0 rounded-xl p-4">
              <p className="text-[11px] uppercase tracking-wider text-overlay0">Total revenue</p>
              <p className="text-xl font-russo tabular-nums">{formatCurrency(totalSold, currency)}</p>
            </div>
            <div className="bg-base border border-surface0 rounded-xl p-4">
              <p className="text-[11px] uppercase tracking-wider text-overlay0">Total cost</p>
              <p className="text-xl font-russo tabular-nums">{formatCurrency(totalCost, currency)}</p>
            </div>
            <div className="bg-base border border-surface0 rounded-xl p-4">
              <p className="text-[11px] uppercase tracking-wider text-overlay0">Realized P&amp;L</p>
              <p
                className={[
                  'text-xl font-russo tabular-nums',
                  totalPnl > 0 ? 'text-green' : totalPnl < 0 ? 'text-red' : 'text-text',
                ].join(' ')}
              >
                {totalPnl >= 0 ? '+' : '−'}{formatCurrency(Math.abs(totalPnl), currency)}
              </p>
            </div>
          </div>

          <div className="bg-base border border-surface0 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-overlay0 text-[11px] uppercase tracking-wider bg-mantle">
                <tr>
                  <th className="px-3 py-2 font-normal">Card</th>
                  <th className="px-3 py-2 font-normal">Variant</th>
                  <th className="px-3 py-2 font-normal text-right">Cost</th>
                  <th className="px-3 py-2 font-normal text-right">Sold</th>
                  <th className="px-3 py-2 font-normal text-right">P&amp;L</th>
                  <th className="px-3 py-2 font-normal">Sold on</th>
                  <th className="px-3 py-2 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface0">
                {rows.map((r) => (
                  <tr key={r._id} className="hover:bg-mantle/50">
                    <td className="px-3 py-2">
                      <Link href={`/cards/${r.cardId}`} className="flex items-center gap-2 hover:text-blue">
                        <span className="relative w-8 h-11 rounded overflow-hidden bg-surface0 shrink-0">
                          <Image
                            src={r.card.imageUrl}
                            alt={r.card.name}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="truncate text-text">{r.card.name}</span>
                          <span className="truncate text-[11px] text-overlay0">
                            {r.card.setName} · {r.card.number}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-overlay1">
                      <span className="capitalize">{r.variant.replace('-', ' ')}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-overlay0">{r.type}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-overlay1">
                      {r.totalCost > 0 ? formatCurrency(r.totalCost, currency) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">
                      {formatCurrency(r.soldPrice, currency)}
                    </td>
                    <td
                      className={[
                        'px-3 py-2 text-right tabular-nums',
                        r.pnl > 0 ? 'text-green' : r.pnl < 0 ? 'text-red' : 'text-overlay1',
                      ].join(' ')}
                    >
                      {r.pnl >= 0 ? '+' : '−'}{formatCurrency(Math.abs(r.pnl), currency)}
                    </td>
                    <td className="px-3 py-2 text-overlay1">{formatDate(r.soldAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <EditSoldDialog
                        userCardId={r._id}
                        cardName={`${r.card.name} · ${r.card.setName} · ${r.card.number}`}
                        initialSoldPrice={r.soldPrice}
                        initialSoldAt={r.soldAt}
                        initialCost={r.cost}
                        initialExtraCost={r.extraCost}
                        currency={currency}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
