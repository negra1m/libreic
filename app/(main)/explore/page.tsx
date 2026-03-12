import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes, blockThemes, blocks } from '@/lib/db/schema'
import { eq, count, and } from 'drizzle-orm'
import { BlockCard } from '@/components/blocks/BlockCard'
import { ThemeManager } from '@/components/themes/ThemeManager'
import { Layers, Plus } from 'lucide-react'
import { sql } from 'drizzle-orm'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; new?: string }>
}) {
  const session = await auth()
  const userId = session!.user!.id!
  const sp = await searchParams

  // Todos os temas com contagem
  const allThemes = await db
    .select({
      id:       themes.id,
      name:     themes.name,
      color:    themes.color,
      icon:     themes.icon,
      parentId: themes.parentId,
      position: themes.position,
      total:    sql<number>`count(${blockThemes.blockId})`.mapWith(Number),
    })
    .from(themes)
    .leftJoin(blockThemes, eq(blockThemes.themeId, themes.id))
    .where(eq(themes.userId, userId))
    .groupBy(themes.id, themes.name, themes.color, themes.icon, themes.parentId, themes.position)
    .orderBy(themes.position, themes.name)

  // Blocos do tema selecionado
  let themeBlocks: any[] = []
  let selectedTheme = allThemes.find(t => t.id === sp.theme)

  if (sp.theme) {
    themeBlocks = await db.query.blocks.findMany({
      where: (b, { eq: _eq }) => _eq(b.userId, userId),
      orderBy: (b, { desc }) => [desc(b.createdAt)],
      limit: 24,
      with: {
        blockThemes: { with: { theme: true } },
        blockTags:   { with: { tag: true } },
      },
    }).then(bs => bs.filter(b => b.blockThemes.some(bt => bt.themeId === sp.theme)))
  }

  const roots = allThemes.filter(t => !t.parentId)
  const children = (parentId: string) => allThemes.filter(t => t.parentId === parentId)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-500" />
          Explorar Temas
        </h1>
        <ThemeManager />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de temas */}
        <div className="lg:col-span-1 space-y-2">
          {roots.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
              Nenhum tema criado ainda
            </div>
          ) : (
            roots.map(theme => (
              <div key={theme.id}>
                <a
                  href={`/explore?theme=${theme.id}`}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    sp.theme === theme.id
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color ?? '#6366f1' }} />
                    <span className="font-medium text-sm text-slate-900">{theme.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{theme.total}</span>
                </a>
                {/* Subtemas */}
                <div className="ml-4 mt-1 space-y-1">
                  {children(theme.id).map(sub => (
                    <a
                      key={sub.id}
                      href={`/explore?theme=${sub.id}`}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-sm transition-all ${
                        sp.theme === sub.id
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-100 bg-white hover:border-indigo-100'
                      }`}
                    >
                      <span className="text-slate-700">{sub.name}</span>
                      <span className="text-xs text-slate-400">{sub.total}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Blocos do tema */}
        <div className="lg:col-span-2">
          {sp.theme ? (
            <>
              <div className="mb-4">
                <h2 className="font-semibold text-slate-900">{selectedTheme?.name}</h2>
                <p className="text-sm text-slate-500">{themeBlocks.length} itens</p>
              </div>
              {themeBlocks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {themeBlocks.map(b => <BlockCard key={b.id} block={b} />)}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  Nenhum item neste tema ainda
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              Selecione um tema para ver os conteúdos
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
