import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbSegment {
  label: string
  href?: string
}

export default function Breadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
  return (
    <nav className="flex items-center gap-1 text-[11px] mb-4">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="text-overlay0 flex-shrink-0" />}
          {seg.href ? (
            <Link href={seg.href} className="text-overlay1 hover:text-text transition-colors">
              {seg.label}
            </Link>
          ) : (
            <span className="text-text font-medium">{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
