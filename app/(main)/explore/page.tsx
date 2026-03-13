import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes, blockThemes, blocks, themeMembers } from '@/lib/db/schema'
import { eq, count, inArray, desc } from 'drizzle-orm'
import { BlockCard } from '@/components/blocks/BlockCard'
import { ThemeManager, ThemeInviteButton } from '@/components/themes/ThemeManager'
import { ThemeDeleteButton } from '@/components/themes/ThemeDeleteButton'
import { Layers, Lock, Globe, ChevronDown } from 'lucide-react'
import { sql } from 'drizzle-orm'
import Link from 'next/link'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; filter?: string; load?: string }>
}) {
  const session = await auth()
  const userId = session!.user!.id!
  const sp = await searchParams
  const filter = (sp.filter === 'private') ? 'private' : 'public'

  const ownedThemes = await db
    .select({
      id:         themes.id,
      name:       themes.name,
      color:      themes.color,
      icon:       themes.icon,
      parentId:   themes.parentId,
      position:   themes.position,
      visibility: themes.visibility,
      ownerId:    themes.userId,
      total:      sql<number>`count(${blockThemes.blockId})`.mapWith(Number),
    })
    .from(themes)
    .leftJoin(blockThemes, eq(blockThemes.themeId, themes.id))
    .where(eq(themes.userId, userId))
    .groupBy(themes.id, themes.name, themes.color, themes.icon, themes.parentId, themes.position, themes.visibility, themes.userId)
    .orderBy(themes.position, themes.name)

  const memberships = await db.select({ themeId: themeMembers.themeId })
    .from(themeMembers)
    .where(eq(themeMembers.userId, userId))

  const memberIds = memberships.map(m => m.themeId).filter(id => !ownedThemes.find(t => t.id === id))

  let sharedThemes: typeof ownedThemes = []
  if (memberIds.length > 0) {
    sharedThemes = await db
      .select({
        id:         themes.id,
        name:       themes.name,
        color:      themes.color,
        icon:       themes.icon,
        parentId:   themes.parentId,
        position:   themes.position,
        visibility: themes.visibility,
        ownerId:    themes.userId,
        total:      sql<number>`count(${blockThemes.blockId})`.mapWith(Number),
      })
      .from(themes)
      .leftJoin(blockThemes, eq(blockThemes.themeId, themes.id))
      .where(inArray(themes.id, memberIds))
      .groupBy(themes.id, themes.name, themes.color, themes.icon, themes.parentId, themes.position, themes.visibility, themes.userId)
      .orderBy(themes.name)
  }

  const allMyThemes = [...ownedThemes, ...sharedThemes]
  const visibleThemes = filter === 'private'
    ? allMyThemes.filter(t => t.visibility === 'private')
    : allMyThemes.filter(t => t.visibility === 'public')

  const selectedTheme = visibleThemes.find(t => t.id === sp.theme) ?? allMyThemes.find(t => t.id === sp.theme)
  const isShared = memberIds.includes(sp.theme ?? '')
  const shouldLoad = !!sp.load

  let allThemeBlocks: any[] = []

  if (sp.theme && selectedTheme) {
    // Fetch block IDs that belong to this theme directly (avoids limit-then-filter bug)
    const themeBlockRows = await db
      .select({ blockId: blockThemes.blockId })
      .from(blockThemes)
      .where(eq(blockThemes.themeId, sp.theme))
    const blockIds = themeBlockRows.map(r => r.blockId)

    if (blockIds.length > 0) {
      allThemeBlocks = await db.query.blocks.findMany({
        where: (b, { inArray: _in }) => _in(b.id, blockIds),
        orderBy: (b, { desc: _d }) => [_d(b.createdAt)],
        limit: shouldLoad ? 48 : 1,
        with: { blockThemes: { with: { theme: true } }, blockTags: { with: { tag: true } } },
      })
    }
  }

  const previewBlock = allThemeBlocks[0] ?? null

  const roots = visibleThemes.filter(t => !t.parentId)
  const children = (parentId: string) => visibleThemes.filter(t => t.parentId === parentId)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-500" />
          Explorar Temas
        </h1>
        <ThemeManager />
      </div>

      <div className="flex gap-2">
        {(['public', 'private'] as const).map(f => (
          <Link
            key={f}
            href={`/explore?filter=${f}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-colors cursor-pointer ${
              filter === f
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f === 'public' ? <><Globe className="h-3.5 w-3.5" /> Públicos</> : <><Lock className="h-3.5 w-3.5" /> Privados</>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {roots.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
              Nenhum tema encontrado
            </div>
          ) : roots.map(theme => (
            <div key={theme.id}>
              <a
                href={`/explore?theme=${theme.id}&filter=${filter}`}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  sp.theme === theme.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.color ?? '#6366f1' }} />
                  <span className="font-medium text-sm text-slate-900 truncate">{theme.name}</span>
                  {theme.visibility === 'private' && <Lock className="h-3 w-3 text-orange-400 shrink-0" />}
                  {memberIds.includes(theme.id) && (
                    <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full shrink-0">grupo</span>
                  )}
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">{theme.total}</span>
              </a>
              <div className="ml-4 mt-1 space-y-1">
                {children(theme.id).map(sub => (
                  <a
                    key={sub.id}
                    href={`/explore?theme=${sub.id}&filter=${filter}`}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-sm transition-all ${
                      sp.theme === sub.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-100'
                    }`}
                  >
                    <span className="text-slate-700">{sub.name}</span>
                    <span className="text-xs text-slate-400">{sub.total}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {sp.theme && selectedTheme ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{selectedTheme.name}</h2>
                    {selectedTheme.visibility === 'private' && (
                      <span className="text-xs flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                        <Lock className="h-3 w-3" /> Privado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{selectedTheme.total} {isShared ? 'itens do grupo' : 'itens'}</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedTheme.visibility === 'private' && selectedTheme.ownerId === userId && (
                    <ThemeInviteButton themeId={selectedTheme.id} />
                  )}
                  {selectedTheme.ownerId === userId && (
                    <ThemeDeleteButton
                      theme={{ id: selectedTheme.id, name: selectedTheme.name, color: selectedTheme.color }}
                      itemCount={selectedTheme.total}
                      otherThemes={allMyThemes
                        .filter(t => t.id !== selectedTheme.id)
                        .map(t => ({ id: t.id, name: t.name, color: t.color }))}
                    />
                  )}
                </div>
              </div>

              {previewBlock ? (
                <div className="space-y-4">
                  {!shouldLoad && (
                    <>
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Último salvo</p>
                        <div className="max-w-xs">
                          <BlockCard block={previewBlock} />
                        </div>
                      </div>
                      {selectedTheme.total > 1 && (
                        <a
                          href={`/explore?theme=${sp.theme}&filter=${filter}&load=1`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Carregar todos ({selectedTheme.total} itens)
                        </a>
                      )}
                    </>
                  )}

                  {shouldLoad && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      {allThemeBlocks.map(b => <BlockCard key={b.id} block={b} />)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  Nenhum item neste tema ainda
                </div>
              )}
            </div>
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
