'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

interface Row { month: string; copiesAdded: number; cumulativeCopies: number; cumulativeSpend: number }

export default function AcquisitionTimeline({ data }: { data: Row[] }) {
  return (
    <div className="rounded-xl bg-mantle border border-surface0 p-4 h-72">
      <h3 className="text-sm text-text mb-2">Acquisitions over time</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-surface0)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="cumulativeCopies" stroke="var(--color-blue)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
