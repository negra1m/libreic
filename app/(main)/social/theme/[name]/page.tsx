import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockThemes, themes, users } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import Link from 'next/link'
import Image from 'next/image'
import { Users, ArrowLeft } from 'lucide-react'
import { getSourceIcon, formatRelativeDate } from '@/lib/utils'

interface Props { params: Promise<{ name: string }> }

export default async function ThemePeoplePage({ params }: Props) {
  const { name: rawName } = await params
  const themeName = decodeURIComponent(rawName)
  const session = await auth()
  const userId = session!.user!.id!

  const rows = await db.execute(sql`
    SELECT
      u.id AS "userId", u.name AS "userName", u.image AS "userImage", u.username AS "userUsername",
      b.id AS "blockId", b.title AS "blockTitle", b.source_type AS "blockType",
      b.summary AS "blockSummary", b.created_at AS "blockCreated"
    FROM themes t
    JOIN users u ON u.id = t.user_id
    JOIN block_themes bt ON bt.theme_id = t.id
    JOIN blocks b ON b.id = bt.block_id AND b.is_public = true
    WHERE lower(t.name) = lower(${themeName})
      AND u.id != ${userId}
    ORDER BY b.created_at DESC
    LIMIT 40
  `) as any[]

  // Agrupa por usuário
  const byUser = new Map<string, { name: string; image: string | null; username: string | null; blocks: any[] }>()
  for (const r of rows) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, { name: r.userName, image: r.userImage, username: r.userUsername, blocks: [] })
    byUser.get(r.userId)!.blocks.push(r)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/social" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{themeName}</h1>
          <p className="text-sm text-slate-500">{byUser.size} pessoa{byUser.size !== 1 ? 's' : ''} estudando este tema</p>
        </div>
      </div>

      {byUser.size === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhum conteúdo público neste tema</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byUser.entries()).map(([uid, u]) => (
            <div key={uid} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <Link href={`/u/${uid}`} className="flex items-center gap-3 p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {u.image ? (
                  <Image src={u.image} alt={u.name} width={32} height={32} className="rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                    {u.name[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-slate-900 text-sm">{u.name}</p>
                  {u.username && <p className="text-xs text-slate-400">@{u.username}</p>}
                </div>
                <span className="ml-auto text-xs text-slate-400">{u.blocks.length} item{u.blocks.length !== 1 ? 's' : ''}</span>
              </Link>
              <div className="divide-y divide-slate-100">
                {u.blocks.slice(0, 3).map((b: any) => (
                  <div key={b.blockId} className="px-4 py-3 flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">{getSourceIcon(b.blockType)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{b.blockTitle}</p>
                      {b.blockSummary && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{b.blockSummary}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatRelativeDate(b.blockCreated)}</span>
                  </div>
                ))}
                {u.blocks.length > 3 && (
                  <Link href={`/u/${uid}`} className="block px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors">
                    Ver mais {u.blocks.length - 3} item{u.blocks.length - 3 !== 1 ? 's' : ''} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
