'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartCard, CustomTooltip, axisTickStyle, gridStyle } from './chartTheme'

interface Row { month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }

export default function AcquisitionTimeline({ data }: { data: Row[] }) {
  const latest = data.length ? data[data.length - 1].cumulativeCopies : 0
  return (
    <ChartCard
      title="Acquisitions over time"
      subtitle={`${latest.toLocaleString()} cumulative copies`}
      accent="var(--color-blue)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="acq-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-blue)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-blue)" stopOpacity={0} />
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
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ stroke: 'var(--color-surface1)', strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulativeCopies"
            name="Cumulative copies"
            stroke="var(--color-blue)"
            strokeWidth={2}
            fill="url(#acq-fill)"
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--color-base)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
