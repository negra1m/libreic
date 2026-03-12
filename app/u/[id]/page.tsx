import { db } from '@/lib/db'
import { blocks, blockTags, tags, users, themes, blockThemes } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { Hash, Layers, BookOpen } from 'lucide-react'
import { getSourceIcon, formatRelativeDate } from '@/lib/utils'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) notFound()

  const [publicBlocks, topTags, themeCount] = await Promise.all([
    db.query.blocks.findMany({
      where: and(eq(blocks.userId, id), eq(blocks.isPublic, true)),
      orderBy: (b, { desc }) => [desc(b.createdAt)],
      limit: 20,
      with: { blockTags: { with: { tag: true } } },
    }),
    // Tags mais usadas em blocos públicos
    db
      .select({ name: tags.name, total: count(blockTags.blockId) })
      .from(blockTags)
      .innerJoin(tags,   eq(blockTags.tagId, tags.id))
      .innerJoin(blocks, and(eq(blockTags.blockId, blocks.id), eq(blocks.isPublic, true), eq(blocks.userId, id)))
      .groupBy(tags.name)
      .orderBy(count(blockTags.blockId))
      .limit(12),
    db.select({ value: count() }).from(themes).where(eq(themes.userId, id)),
  ])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Perfil */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              <Image src={user.image} alt={user.name} width={64} height={64} className="rounded-full shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 shrink-0">
                {user.name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
              {user.username && <p className="text-sm text-slate-500">@{user.username}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {publicBlocks.length} públicos
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {themeCount[0]?.value ?? 0} temas
                </span>
              </div>
            </div>
            {session && (
              <Link href="/" className="ml-auto text-sm text-indigo-600 hover:underline shrink-0">
                ← Início
              </Link>
            )}
          </div>
        </div>

        {/* Tags frequentes */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topTags.map(t => (
              <Link
                key={t.name}
                href={`/tags/${encodeURIComponent(t.name)}`}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <Hash className="h-3 w-3" />
                {t.name}
                <span className="text-xs text-slate-400 ml-0.5">{t.total}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Blocos públicos */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Conteúdo compartilhado</h2>
          {publicBlocks.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-white">
              <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum conteúdo público ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {publicBlocks.map(b => (
                <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">{getSourceIcon(b.sourceType)}</span>
                    <p className="font-medium text-slate-900 leading-snug">{b.title}</p>
                    <span className="text-xs text-slate-400 ml-auto shrink-0">{formatRelativeDate(b.createdAt)}</span>
                  </div>
                  {b.summary && <p className="text-sm text-slate-500 line-clamp-2 pl-6">{b.summary}</p>}
                  {b.blockTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-6">
                      {b.blockTags.map(bt => (
                        <Link
                          key={bt.tag.id}
                          href={`/tags/${encodeURIComponent(bt.tag.name)}`}
                          className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          #{bt.tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
