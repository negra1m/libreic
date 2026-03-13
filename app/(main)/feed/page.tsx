import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { follows, blocks, users, blockTags, tags, blockThemes, themes } from '@/lib/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { Rss, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getSourceIcon, formatRelativeDate } from '@/lib/utils'

export default async function FeedPage() {
  const session = await auth()
  const userId = session!.user!.id!

  // Quem eu sigo
  const following = await db.select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId))

  const followingIds = following.map(f => f.followingId)

  // Blocos publicos de quem eu sigo (ou de todos se nao sigo ninguem)
  const followingFilter = followingIds.length > 0
    ? sql`AND b.user_id = ANY(ARRAY[${sql.join(followingIds.map(id => sql`${id}`), sql.raw(', '))}]::uuid[])`
    : sql``

  const feedBlocks = await db.execute(sql`
    SELECT
      b.id, b.title, b.source_url, b.source_type, b.summary,
      b.thumbnail_url, b.created_at,
      u.id AS "authorId", u.name AS "authorName", u.image AS "authorImage", u.username AS "authorUsername",
      array_agg(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL) AS "themeTags",
      array_agg(DISTINCT tg.name) FILTER (WHERE tg.id IS NOT NULL) AS "blockTagNames"
    FROM blocks b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN block_themes bt ON bt.block_id = b.id
    LEFT JOIN themes t ON t.id = bt.theme_id
    LEFT JOIN block_tags btg ON btg.block_id = b.id
    LEFT JOIN tags tg ON tg.id = btg.tag_id
    WHERE b.is_public = true
      AND b.user_id != ${userId}
      ${followingFilter}
    GROUP BY b.id, b.title, b.source_url, b.source_type, b.summary,
             b.thumbnail_url, b.created_at,
             u.id, u.name, u.image, u.username
    ORDER BY b.created_at DESC
    LIMIT 40
  `) as any[]

  const isEmpty = feedBlocks.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Rss className="h-5 w-5 text-indigo-500" />
            Feed
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {followingIds.length > 0
              ? `Publicações de ${followingIds.length} pessoa${followingIds.length > 1 ? 's' : ''} que você segue`
              : 'Publicações recentes da comunidade'}
          </p>
        </div>
        <Link href="/social" className="text-sm text-indigo-600 hover:underline cursor-pointer">
          Descobrir pessoas →
        </Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma publicação ainda</p>
          <p className="text-sm text-slate-400 mt-1">
            {followingIds.length > 0
              ? 'As pessoas que você segue ainda não publicaram nada'
              : 'Ninguém compartilhou conteúdo público ainda'}
          </p>
          <Link href="/social" className="inline-block mt-4 text-sm text-indigo-600 hover:underline cursor-pointer">
            Encontrar pessoas para seguir →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {feedBlocks.map((item: any) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              {/* Autor */}
              <Link href={`/u/${item.authorId}`} className="flex items-center gap-2.5 group cursor-pointer">
                {item.authorImage ? (
                  <Image src={item.authorImage} alt={item.authorName} width={32} height={32} className="rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                    {item.authorName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {item.authorName}
                  </p>
                  {item.authorUsername && (
                    <p className="text-xs text-slate-400">@{item.authorUsername}</p>
                  )}
                </div>
                <span className="ml-auto text-xs text-slate-400 shrink-0">{formatRelativeDate(new Date(item.created_at))}</span>
              </Link>

              {/* Conteudo */}
              <Link href={`/u/${item.authorId}`} className="block group cursor-pointer">
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{getSourceIcon(item.source_type)}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 group-hover:text-indigo-700 transition-colors leading-snug">{item.title}</p>
                    {item.summary && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.summary}</p>
                    )}
                  </div>
                </div>
              </Link>

              {/* Tags e temas */}
              {(item.blockTagNames?.length > 0 || item.themeTags?.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {(item.themeTags ?? []).slice(0, 2).map((t: string) => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                      {t}
                    </span>
                  ))}
                  {(item.blockTagNames ?? []).slice(0, 3).map((t: string) => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
