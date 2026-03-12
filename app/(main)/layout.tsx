import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { themes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { QuickSave } from '@/components/layout/QuickSave'
import { Search } from 'lucide-react'
import Link from 'next/link'

async function getThemeTree(userId: string) {
  const allThemes = await db.query.themes.findMany({
    where: eq(themes.userId, userId),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.name)],
  })

  const map = new Map(allThemes.map(t => ({ ...t, children: [] as typeof allThemes })).map(t => [t.id, t]))
  const roots: typeof allThemes = []

  for (const t of map.values()) {
    if (t.parentId) {
      const parent = map.get(t.parentId)
      if (parent) (parent as any).children.push(t)
    } else {
      roots.push(t as any)
    }
  }
  return roots
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const themeTree = await getThemeTree(session.user.id)

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar — desktop only */}
      <div className="hidden md:block">
        <Sidebar themes={themeTree as any} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 gap-3 shrink-0">
          {/* Logo mobile */}
          <Link href="/" className="md:hidden font-bold text-indigo-600 text-lg tracking-tight">
            LibreIC
          </Link>

          <Link href="/search" className="flex-1 max-w-sm">
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-400 bg-slate-50 cursor-pointer hover:border-indigo-300 transition-colors">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Buscar...</span>
            </div>
          </Link>

          <QuickSave themes={themeTree as any} />
        </header>

        {/* Conteúdo — padding-bottom para não ficar atrás do bottom nav no mobile */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}
