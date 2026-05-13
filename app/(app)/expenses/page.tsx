import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getUnifiedExpenses } from '@/lib/expenses'
import { DEFAULT_CURRENCY, type Currency } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import ExpensesPanel from '@/components/expenses/ExpensesPanel'

export default async function ExpensesPage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect('/browse?login=1')
  if (session?.user?.tier !== 'pro') redirect('/dashboard?upgrade=1')

  const currency: Currency = session?.user?.currency ?? DEFAULT_CURRENCY
  const { rows, totals } = await getUnifiedExpenses(userId)

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-russo">Expenses</h1>
          <span className="text-overlay0 text-xs tabular-nums">
            {totals.count} {totals.count === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <SummaryCard
          label="Total Spend"
          value={formatCurrency(totals.total, currency)}
          accent
        />
        <SummaryCard
          label="Card Costs"
          value={formatCurrency(totals.cardCostTotal, currency)}
          sub="From owned copies"
        />
        <SummaryCard
          label="Other Expenses"
          value={formatCurrency(totals.expenseTotal, currency)}
          sub="Grading, shipping, etc."
        />
      </div>

      <ExpensesPanel rows={rows} currency={currency} />
    </main>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="bg-base border border-surface0 rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-widest text-overlay0 mb-2">
        {label}
      </div>
      <div className={`text-2xl font-black ${accent ? 'text-blue' : 'text-text'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-overlay0 mt-1">{sub}</div>}
    </div>
  )
}
