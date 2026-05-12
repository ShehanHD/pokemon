'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts'
import { ChartCard, CustomTooltip, axisTickStyle, gridStyle, CHART_PALETTE } from './chartTheme'

export default function RarityChart({ data }: { data: Array<{ rarity: string; copies: number }> }) {
  const total = data.reduce((n, r) => n + r.copies, 0)
  return (
    <ChartCard
      title="By Rarity"
      subtitle={`${data.length} rarit${data.length === 1 ? 'y' : 'ies'} · ${total.toLocaleString()} copies`}
      accent="var(--color-blue)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -12, right: 4, top: 8, bottom: 36 }}>
          <defs>
            {CHART_PALETTE.map((c, i) => (
              <linearGradient key={i} id={`rarity-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                <stop offset="100%" stopColor={c} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis
            dataKey="rarity"
            tick={axisTickStyle}
            angle={-30}
            textAnchor="end"
            interval={0}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-surface0)' }}
          />
          <YAxis
            tick={axisTickStyle}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: 'var(--color-surface0)', opacity: 0.4 }} content={<CustomTooltip />} />
          <Bar dataKey="copies" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((_, i) => (
              <Cell key={i} fill={`url(#rarity-grad-${i % CHART_PALETTE.length})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
