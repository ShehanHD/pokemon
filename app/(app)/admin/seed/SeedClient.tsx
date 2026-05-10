'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { seedSetsAction } from './actions'
import type { SeedReport, SeedSetResult } from '@/lib/seedSeries'

export type SetRow = {
  setId: string
  setName: string
  releaseDate: string
  apiTotal: number
  printedTotal: number
  logoUrl: string
  inDb: boolean
  dbCardCount: number
  dbTotalValue: number | null
}

export type SeriesGroup = {
  name: string
  slug: string
  sets: SetRow[]
}

type RowState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; result: SeedSetResult }
  | { kind: 'error'; message: string }

export default function SeedClient({ groups }: { groups: SeriesGroup[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [states, setStates] = useState<Record<string, RowState>>({})
  const [busy, setBusy] = useState<Set<string>>(new Set())

  function setRowState(setId: string, state: RowState) {
    setStates((prev) => ({ ...prev, [setId]: state }))
  }

  async function runSeed(setIds: string[]) {
    if (setIds.length === 0) return
    setBusy((prev) => {
      const next = new Set(prev)
      for (const id of setIds) next.add(id)
      return next
    })
    for (const id of setIds) setRowState(id, { kind: 'running' })

    try {
      const report: SeedReport = await seedSetsAction({ setIds })
      const resultMap = new Map(report.results.map((r) => [r.setId, r]))
      const errorMap = new Map(report.errors.map((e) => [e.setId, e.message]))
      for (const id of setIds) {
        const r = resultMap.get(id)
        if (r) {
          setRowState(id, { kind: 'done', result: r })
        } else {
          setRowState(id, { kind: 'error', message: errorMap.get(id) ?? 'Unknown error' })
        }
      }
      startTransition(() => router.refresh())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      for (const id of setIds) setRowState(id, { kind: 'error', message })
    } finally {
      setBusy((prev) => {
        const next = new Set(prev)
        for (const id of setIds) next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const seriesIds = group.sets.map((s) => s.setId)
        const busyCount = seriesIds.filter((id) => busy.has(id)).length
        const allBusy = busyCount === seriesIds.length
        const pending = seriesIds.filter((id) => !busy.has(id))
        const aggregate = aggregateResults(group.sets, states)
        return (
          <section key={group.slug} className="bg-base border border-surface0 rounded-xl overflow-hidden">
            <header className="flex items-center justify-between gap-3 p-4 border-b border-surface0">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-text truncate">{group.name}</h2>
                <p className="text-xs text-overlay0 tabular-nums">
                  {group.sets.length} sets · {group.sets.filter((s) => s.inDb).length} in DB
                </p>
                {aggregate && (
                  <p className="text-[11px] text-green mt-1 tabular-nums">
                    ✓ {aggregate.sets} sets · {aggregate.cards} cards · {aggregate.priced} priced
                    {aggregate.totalValue != null && <> · €{aggregate.totalValue.toFixed(2)}</>}
                    {aggregate.errors > 0 && <span className="text-red"> · {aggregate.errors} failed</span>}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => runSeed(pending.length > 0 ? pending : seriesIds)}
                disabled={allBusy}
                className="text-xs font-bold px-3 py-2 rounded border border-blue/50 bg-blue/10 text-blue hover:bg-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allBusy
                  ? `Seeding… (${busyCount}/${seriesIds.length})`
                  : busyCount > 0
                    ? `Re-seed remaining (${pending.length})`
                    : `Re-seed series (${seriesIds.length})`}
              </button>
            </header>
            <ul className="divide-y divide-surface0">
              {group.sets.map((s) => {
                const state = states[s.setId] ?? { kind: 'idle' }
                const isBusy = busy.has(s.setId)
                return (
                  <li key={s.setId} className="flex items-center gap-3 p-3">
                    <div className="relative w-10 h-10 shrink-0 bg-surface0 rounded">
                      {s.logoUrl && (
                        <Image src={s.logoUrl} alt={s.setName} fill sizes="40px" className="object-contain p-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text truncate">
                        {s.setName}
                        {!s.inDb && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-yellow font-bold">new</span>
                        )}
                      </p>
                      <p className="text-[11px] text-overlay0 tabular-nums">
                        {s.setId} · {s.releaseDate} · {s.printedTotal}/{s.apiTotal}
                        {s.inDb && (
                          <>
                            {' '}· DB: {s.dbCardCount} cards
                            {s.dbTotalValue != null && <> · €{s.dbTotalValue.toFixed(2)}</>}
                          </>
                        )}
                      </p>
                      <RowStatus state={state} />
                    </div>
                    <button
                      type="button"
                      onClick={() => runSeed([s.setId])}
                      disabled={isBusy}
                      className="text-xs font-bold px-3 py-1.5 rounded border border-surface0 bg-base text-overlay1 hover:border-blue/60 hover:bg-blue/10 hover:text-blue disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBusy ? '…' : s.inDb ? 'Re-seed' : 'Seed'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function aggregateResults(
  sets: SetRow[],
  states: Record<string, RowState>,
): { sets: number; cards: number; priced: number; totalValue: number | null; errors: number } | null {
  let setsDone = 0
  let cards = 0
  let priced = 0
  let totalValue = 0
  let hasValue = false
  let errors = 0
  for (const s of sets) {
    const st = states[s.setId]
    if (!st) continue
    if (st.kind === 'done') {
      setsDone += 1
      cards += st.result.cardsUpserted
      priced += st.result.pricedCards
      if (st.result.totalValue != null) {
        totalValue += st.result.totalValue
        hasValue = true
      }
    } else if (st.kind === 'error') {
      errors += 1
    }
  }
  if (setsDone === 0 && errors === 0) return null
  return { sets: setsDone, cards, priced, totalValue: hasValue ? totalValue : null, errors }
}

function RowStatus({ state }: { state: RowState }) {
  if (state.kind === 'idle') return null
  if (state.kind === 'running') {
    return <p className="text-[11px] text-blue mt-0.5">Seeding…</p>
  }
  if (state.kind === 'done') {
    const r = state.result
    return (
      <p className="text-[11px] text-green mt-0.5 tabular-nums">
        ✓ {r.cardsUpserted} cards · {r.pricedCards} priced
        {r.totalValue != null && <> · €{r.totalValue.toFixed(2)}</>}
      </p>
    )
  }
  return <p className="text-[11px] text-red mt-0.5">✗ {state.message}</p>
}
