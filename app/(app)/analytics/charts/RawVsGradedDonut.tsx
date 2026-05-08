'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface Props {
  data: { raw: { copies: number; spend: number }; graded: { copies: number; spend: number } }
}

export default function RawVsGradedDonut({ data }: Props) {
  const chartData = [
    { name: 'Raw', value: data.raw.copies },
    { name: 'Graded', value: data.graded.copies },
  ]
  const colors = ['var(--color-sapphire)', 'var(--color-mauve)']
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">Raw vs Graded</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
            {chartData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
