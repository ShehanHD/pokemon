import Link from 'next/link'

interface Props {
  page: number
  pageCount: number
  buildHref: (p: number) => string
}

export default function Pagination({ page, pageCount, buildHref }: Props) {
  if (pageCount <= 1) return null
  const prev = page > 1 ? page - 1 : null
  const next = page < pageCount ? page + 1 : null

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {prev ? (
        <Link
          href={buildHref(prev)}
          className="px-3 py-1.5 rounded text-xs font-medium bg-mantle text-overlay1 border border-surface0 hover:text-text transition-colors"
        >
          ← Prev
        </Link>
      ) : (
        <span className="px-3 py-1.5 rounded text-xs font-medium bg-mantle text-overlay0 border border-surface0 opacity-50">← Prev</span>
      )}
      <span className="text-[11px] text-overlay0 tabular-nums px-2">
        Page {page} of {pageCount}
      </span>
      {next ? (
        <Link
          href={buildHref(next)}
          className="px-3 py-1.5 rounded text-xs font-medium bg-mantle text-overlay1 border border-surface0 hover:text-text transition-colors"
        >
          Next →
        </Link>
      ) : (
        <span className="px-3 py-1.5 rounded text-xs font-medium bg-mantle text-overlay0 border border-surface0 opacity-50">Next →</span>
      )}
    </div>
  )
}
