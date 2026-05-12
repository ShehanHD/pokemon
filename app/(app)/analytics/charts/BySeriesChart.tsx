'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { ChartCard, CustomTooltip, axisTickStyle, gridStyle } from './chartTheme'

export default function BySeriesChart({ data }: { data: Array<{ series: string; copies: number; spend: number }> }) {
  const total = data.reduce((n, r) => n + r.copies, 0)
  return (
    <ChartCard
      title="By Series"
      subtitle={`${data.length} series · ${total.toLocaleString()} copies`}
      accent="var(--color-mauve)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -12, right: 4, top: 8, bottom: 36 }}>
          <defs>
            <linearGradient id="series-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-mauve)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--color-mauve)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis
            dataKey="series"
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
          <Bar dataKey="copies" fill="url(#series-grad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
