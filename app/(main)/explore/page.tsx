import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes, blockThemes, blocks, themeMembers, users } from '@/lib/db/schema'
import { eq, count, and, inArray, or } from 'drizzle-orm'
import { BlockCard } from '@/components/blocks/BlockCard'
import { ThemeManager, ThemeInviteButton } from '@/components/themes/ThemeManager'
import { Layers, Lock, Globe } from 'lucide-react'
import { sql } from 'drizzle-orm'
import Link from 'next/link'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; filter?: string }>
}) {
  const session = await auth()
  const userId = session!.user!.id!
  const sp = await searchParams
  const filter = sp.filter ?? 'all'

  // Temas próprios com contagem
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

  // Temas compartilhados (membro mas não dono)
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

  // Filtrar conforme tab selecionada
  const allMyThemes = [...ownedThemes, ...sharedThemes]
  const visibleThemes = filter === 'public'
    ? allMyThemes.filter(t => t.visibility === 'public')
    : filter === 'private'
      ? allMyThemes.filter(t => t.visibility === 'private')
      : allMyThemes

  // Blocos do tema selecionado (próprios + de membros se tema compartilhado)
  let themeBlocks: any[] = []
  let selectedTheme = visibleThemes.find(t => t.id === sp.theme) ?? allMyThemes.find(t => t.id === sp.theme)
  let themeOwner: { name: string } | null = null
  let isShared = false

  if (sp.theme && selectedTheme) {
    isShared = memberIds.includes(sp.theme)

    if (isShared) {
      // Mostrar blocos de todos os membros neste tema
      const memberUserIds = await db.select({ userId: themeMembers.userId })
        .from(themeMembers)
        .where(eq(themeMembers.themeId, sp.theme))

      const allMemberIds = [selectedTheme.ownerId, ...memberUserIds.map(m => m.userId)]

      themeBlocks = await db.query.blocks.findMany({
        where: (b, { inArray }) => inArray(b.userId, allMemberIds),
        orderBy: (b, { desc }) => [desc(b.createdAt)],
        limit: 48,
        with: {
          blockThemes: { with: { theme: true } },
          blockTags:   { with: { tag: true } },
        },
      }).then(bs => bs.filter(b => b.blockThemes.some(bt => bt.themeId === sp.theme)))
    } else {
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
  }

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

      {/* Filtro */}
      <div className="flex gap-2">
        {(['all', 'public', 'private'] as const).map(f => (
          <Link
            key={f}
            href={`/explore?filter=${f}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-colors cursor-pointer ${
              filter === f
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f === 'all' && 'Todos'}
            {f === 'public' && <><Globe className="h-3.5 w-3.5" /> Públicos</>}
            {f === 'private' && <><Lock className="h-3.5 w-3.5" /> Privados</>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de temas */}
        <div className="lg:col-span-1 space-y-2">
          {roots.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
              Nenhum tema encontrado
            </div>
          ) : (
            roots.map(theme => (
              <div key={theme.id}>
                <a
                  href={`/explore?theme=${theme.id}&filter=${filter}`}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    sp.theme === theme.id
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.color ?? '#6366f1' }} />
                    <span className="font-medium text-sm text-slate-900 truncate">{theme.name}</span>
                    {theme.visibility === 'private' && (
                      <Lock className="h-3 w-3 text-orange-400 shrink-0" />
                    )}
                    {memberIds.includes(theme.id) && (
                      <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full shrink-0">grupo</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">{theme.total}</span>
                </a>
                {/* Subtemas */}
                <div className="ml-4 mt-1 space-y-1">
                  {children(theme.id).map(sub => (
                    <a
                      key={sub.id}
                      href={`/explore?theme=${sub.id}&filter=${filter}`}
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
          {sp.theme && selectedTheme ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{selectedTheme.name}</h2>
                    {selectedTheme.visibility === 'private' && (
                      <span className="text-xs flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                        <Lock className="h-3 w-3" /> Privado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {themeBlocks.length} {isShared ? 'itens do grupo' : 'itens'}
                  </p>
                </div>
                {selectedTheme.visibility === 'private' && selectedTheme.ownerId === userId && (
                  <ThemeInviteButton themeId={selectedTheme.id} />
                )}
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
