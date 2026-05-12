'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartCard, CustomTooltip, axisTickStyle, gridStyle } from './chartTheme'

interface Row { month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }

export default function SpendTimeline({ data }: { data: Row[] }) {
  const latest = data.length ? data[data.length - 1].cumulativeSpend : 0
  return (
    <ChartCard
      title="Spend over time"
      subtitle={`€${latest.toFixed(2)} cumulative`}
      accent="var(--color-mauve)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-mauve)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-mauve)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis
            dataKey="month"
            tick={axisTickStyle}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-surface0)' }}
          />
          <YAxis
            tick={axisTickStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `€${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-surface1)', strokeDasharray: '3 3' }}
            content={<CustomTooltip valueFormatter={(v) => `€${v.toFixed(2)}`} />}
          />
          <Area
            type="monotone"
            dataKey="cumulativeSpend"
            name="Cumulative spend"
            stroke="var(--color-mauve)"
            strokeWidth={2}
            fill="url(#spend-fill)"
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--color-base)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
