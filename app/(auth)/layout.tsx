export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-crust flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-mantle border border-surface0 rounded-xl p-8">
        <div className="text-center mb-6">
          <span className="text-2xl font-black text-text">Poke</span>
          <span className="text-2xl font-black text-red">Vault</span>
        </div>
        {children}
      </div>
    </div>
  )
}
