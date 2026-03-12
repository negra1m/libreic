import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockThemes, themes, blockTags, tags } from '@/lib/db/schema'
import { eq, desc, and, lte, count, sql } from 'drizzle-orm'
import { BlockCard } from '@/components/blocks/BlockCard'
import { Clock, Star, RotateCcw, BookOpen, Layers } from 'lucide-react'
import Link from 'next/link'

export default async function HomePage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [recent, dueReview, themeStats] = await Promise.all([
    // Recentes
    db.query.blocks.findMany({
      where: and(eq(blocks.userId, userId), eq(blocks.status, 'saved')),
      orderBy: desc(blocks.createdAt),
      limit: 8,
      with: {
        blockThemes: { with: { theme: true } },
        blockTags:   { with: { tag: true } },
      },
    }),
    // Para revisar hoje
    db.query.blocks.findMany({
      where: and(
        eq(blocks.userId, userId),
        lte(blocks.reviewDueAt, new Date())
      ),
      orderBy: blocks.reviewDueAt,
      limit: 5,
      with: { blockThemes: { with: { theme: true } } },
    }),
    // Contagem por tema
    db
      .select({
        themeId:   blockThemes.themeId,
        themeName: themes.name,
        themeColor: themes.color,
        total:     count(blockThemes.blockId),
      })
      .from(blockThemes)
      .innerJoin(themes, eq(blockThemes.themeId, themes.id))
      .innerJoin(blocks, eq(blockThemes.blockId, blocks.id))
      .where(eq(blocks.userId, userId))
      .groupBy(blockThemes.themeId, themes.name, themes.color)
      .orderBy(sql`count(${blockThemes.blockId}) desc`)
      .limit(6),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Boas-vindas */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {session?.user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 mt-0.5">Sua biblioteca pessoal de conhecimento</p>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Para revisar', value: dueReview.length, icon: RotateCcw, href: '/library?status=pending', color: 'text-amber-600' },
          { label: 'Temas', value: themeStats.length, icon: Layers, href: '/explore', color: 'text-indigo-600' },
        ].map(s => (
          <Link key={s.label} href={s.href}>
            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Para revisar */}
      {dueReview.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              Para revisar hoje
            </h2>
            <Link href="/library?due=true" className="text-sm text-indigo-600 hover:underline">ver todos</Link>
          </div>
          <div className="space-y-2">
            {dueReview.map(b => (
              <BlockCard key={b.id} block={b as any} compact />
            ))}
          </div>
        </section>
      )}

      {/* Temas em destaque */}
      {themeStats.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              Seus temas
            </h2>
            <Link href="/explore" className="text-sm text-indigo-600 hover:underline">explorar</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {themeStats.map(t => (
              <Link key={t.themeId} href={`/explore?theme=${t.themeId}`}>
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: t.themeColor ?? '#6366f1' }}
                    />
                    <span className="font-medium text-sm text-slate-900 truncate">{t.themeName}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{t.total}</p>
                  <p className="text-xs text-slate-500">itens</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recentes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Adicionados recentemente
          </h2>
          <Link href="/library" className="text-sm text-indigo-600 hover:underline">ver biblioteca</Link>
        </div>
        {recent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {recent.map(b => (
              <BlockCard key={b.id} block={b as any} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Sua biblioteca está vazia</p>
            <p className="text-sm text-slate-400 mt-1">Clique em <strong>Salvar</strong> no topo para adicionar o primeiro conteúdo</p>
          </div>
        )}
      </section>
    </div>
  )
}
