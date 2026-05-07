'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function BySetChart({ data }: { data: Array<{ setCode: string; setName: string; copies: number; spend: number }> }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">Top 10 Sets</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} layout="vertical" margin={{ left: 60, right: 8, top: 8, bottom: 8 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
          <YAxis type="category" dataKey="setName" tick={{ fontSize: 10 }} width={120} />
          <Tooltip />
          <Bar dataKey="copies" fill="var(--color-teal)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
