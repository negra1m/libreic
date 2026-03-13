import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { QuickSave } from '@/components/layout/QuickSave'
import Link from 'next/link'

async function getThemeTree(userId: string) {
  // Raw SQL to avoid issues if new columns (visibility) not yet migrated
  const allThemes = await db.execute(sql`
    SELECT id, user_id AS "userId", parent_id AS "parentId",
           name, icon, color, position
    FROM themes
    WHERE user_id = ${userId}
    ORDER BY position, name
  `) as any[]

  const map = new Map(allThemes.map((t: any) => [t.id, { ...t, children: [] as any[] }]))
  const roots: any[] = []

  for (const t of map.values()) {
    if (t.parentId) {
      const parent = map.get(t.parentId)
      if (parent) parent.children.push(t)
    } else {
      roots.push(t)
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

          <QuickSave themes={themeTree as any} />
        </header>

        {/* Conteúdo — padding-bottom para não ficar atrás do bottom nav no mobile */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 flex flex-col">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}
