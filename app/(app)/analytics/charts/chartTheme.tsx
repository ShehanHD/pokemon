'use client'
import type { ReactNode } from 'react'

interface TooltipPayloadEntry {
  name?: ReactNode
  value?: number | string
  color?: string
  fill?: string
}

export const CHART_PALETTE = [
  'var(--color-blue)',
  'var(--color-sapphire)',
  'var(--color-mauve)',
  'var(--color-teal)',
  'var(--color-lavender)',
  'var(--color-peach)',
  'var(--color-pink)',
  'var(--color-yellow)',
  'var(--color-green)',
  'var(--color-sky)',
] as const

interface ChartCardProps {
  title: string
  subtitle?: string
  accent?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, accent = 'var(--color-blue)', action, children, className }: ChartCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-mantle to-base border border-surface0 p-5 shadow-sm hover:shadow-md hover:border-surface1 transition-all ${className ?? ''}`}
    >
      <div
        aria-hidden
        className="absolute -top-px left-5 right-5 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
            />
            <h3 className="text-sm font-russo text-text tracking-tight">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-[11px] text-overlay1 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="h-56">{children}</div>
    </div>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: ReactNode
  valueFormatter?: (v: number) => string
  labelFormatter?: (l: string) => string
}

export function CustomTooltip({ active, payload, label, valueFormatter, labelFormatter }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const fmtLabel = labelFormatter && typeof label === 'string' ? labelFormatter(label) : label
  const fmtValue = valueFormatter ?? ((v: number) => v.toLocaleString())
  return (
    <div className="rounded-lg border border-surface1 bg-base/95 backdrop-blur-sm shadow-lg px-3 py-2 text-xs">
      {fmtLabel != null && fmtLabel !== '' && (
        <p className="text-[10px] uppercase tracking-wider text-overlay1 mb-1">{String(fmtLabel)}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: entry.color ?? entry.fill }}
            />
            <span className="text-overlay1">{entry.name}</span>
            <span className="text-text font-russo tabular-nums ml-auto">
              {typeof entry.value === 'number' ? fmtValue(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const axisTickStyle = {
  fontSize: 10,
  fill: 'var(--color-overlay1)',
}

export const gridStyle = {
  stroke: 'var(--color-surface0)',
  strokeDasharray: '2 4',
  vertical: false,
}
