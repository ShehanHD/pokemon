'use client'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function RarityChart({ data }: { data: Array<{ rarity: string; copies: number }> }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">By Rarity</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 24 }}>
          <XAxis dataKey="rarity" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="copies" fill="var(--color-blue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
