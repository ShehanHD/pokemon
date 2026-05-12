'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { ChartCard, CustomTooltip, axisTickStyle } from './chartTheme'

export default function BySetChart({ data }: { data: Array<{ setCode: string; setName: string; copies: number; spend: number }> }) {
  const total = data.reduce((n, r) => n + r.copies, 0)
  return (
    <ChartCard
      title="Top 10 Sets"
      subtitle={`${data.length} set${data.length === 1 ? '' : 's'} · ${total.toLocaleString()} copies`}
      accent="var(--color-teal)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="set-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-surface0)" strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            tick={axisTickStyle}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="setName"
            tick={axisTickStyle}
            width={130}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: 'var(--color-surface0)', opacity: 0.4 }} content={<CustomTooltip />} />
          <Bar dataKey="copies" fill="url(#set-grad)" radius={[0, 6, 6, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
