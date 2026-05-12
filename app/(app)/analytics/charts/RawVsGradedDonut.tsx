'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartCard, CustomTooltip } from './chartTheme'

interface Props {
  data: { raw: { copies: number; spend: number }; graded: { copies: number; spend: number } }
}

export default function RawVsGradedDonut({ data }: Props) {
  const total = data.raw.copies + data.graded.copies
  const chartData = [
    { name: 'Raw', value: data.raw.copies, color: 'var(--color-sapphire)' },
    { name: 'Graded', value: data.graded.copies, color: 'var(--color-mauve)' },
  ]
  const pct = (v: number) => (total === 0 ? '0%' : `${Math.round((v / total) * 100)}%`)

  return (
    <ChartCard
      title="Raw vs Graded"
      subtitle={`${total.toLocaleString()} copies total`}
      accent="var(--color-sapphire)"
    >
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="rg-raw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-sapphire)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--color-sapphire)" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="rg-graded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-mauve)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--color-mauve)" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="none"
            >
              <Cell fill="url(#rg-raw)" />
              <Cell fill="url(#rg-graded)" />
            </Pie>
            <Tooltip content={<CustomTooltip valueFormatter={(v) => `${v.toLocaleString()} (${pct(v)})`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] uppercase tracking-wider text-overlay1">Total</p>
          <p className="text-2xl font-russo text-text tabular-nums">{total.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-1 -mb-1">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            <span className="text-overlay1">{d.name}</span>
            <span className="text-text font-russo tabular-nums">{pct(d.value)}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}
