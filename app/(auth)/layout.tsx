import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-crust flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-mantle border border-surface0 rounded-2xl p-8 shadow-2xl">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <PokeballMark />
          </div>
          <div>
            <span className="font-russo text-2xl text-text tracking-widest">Poke</span>
            <span className="font-russo text-2xl text-blue tracking-widest">Vault</span>
          </div>
          <p className="text-[10px] text-overlay0 mt-1 tracking-wider uppercase">TCG Collection Manager</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function PokeballMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#334155" strokeWidth="1.5" />
      <path d="M2 12h20" stroke="#334155" strokeWidth="1.5" />
      <path d="M2 12a10 10 0 0 1 20 0" fill="#ee2626" fillOpacity="0.3" />
      <circle cx="12" cy="12" r="3" fill="#1e2a3a" stroke="#334155" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="#f8fafc" />
    </svg>
  )
}
