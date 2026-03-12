import { db } from '@/lib/db'
import { blocks, blockTags, tags, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { Hash, User, ExternalLink } from 'lucide-react'
import { getSourceIcon, formatRelativeDate } from '@/lib/utils'

interface Props { params: Promise<{ tag: string }> }

export async function generateMetadata({ params }: Props) {
  const { tag } = await params
  return { title: `#${decodeURIComponent(tag)} — LibreIC` }
}

export default async function TagPage({ params }: Props) {
  const { tag: rawTag } = await params
  const tagName = decodeURIComponent(rawTag)
  const session = await auth()

  // Busca todos os blocos públicos com essa tag
  const results = await db
    .select({
      blockId:      blocks.id,
      blockTitle:   blocks.title,
      blockType:    blocks.sourceType,
      blockThumb:   blocks.thumbnailUrl,
      blockNote:    blocks.personalNote,
      blockSummary: blocks.summary,
      blockCreated: blocks.createdAt,
      userId:       users.id,
      userName:     users.name,
      userImage:    users.image,
      userUsername: users.username,
    })
    .from(blockTags)
    .innerJoin(tags,   and(eq(blockTags.tagId, tags.id), eq(tags.name, tagName)))
    .innerJoin(blocks, and(eq(blockTags.blockId, blocks.id), eq(blocks.isPublic, true)))
    .innerJoin(users,  eq(blocks.userId, users.id))
    .orderBy(blocks.createdAt)
    .limit(50)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Hash className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">#{tagName}</h1>
            <p className="text-sm text-slate-500">{results.length} item{results.length !== 1 ? 's' : ''} públicos</p>
          </div>
          {session && (
            <Link href="/" className="ml-auto text-sm text-indigo-600 hover:underline">
              ← Minha biblioteca
            </Link>
          )}
        </div>

        {results.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-white">
            <Hash className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum conteúdo público com #{tagName}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.blockId} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                {/* Autor */}
                <Link href={`/u/${r.userId}`} className="flex items-center gap-2 group">
                  {r.userImage ? (
                    <Image src={r.userImage} alt={r.userName} width={24} height={24} className="rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                      {r.userName[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">
                    {r.userUsername ? `@${r.userUsername}` : r.userName}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{formatRelativeDate(r.blockCreated)}</span>
                </Link>

                {/* Conteúdo */}
                <div>
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 shrink-0">{getSourceIcon(r.blockType)}</span>
                    <p className="font-medium text-slate-900 leading-snug">{r.blockTitle}</p>
                  </div>
                  {(r.blockSummary ?? r.blockNote) && (
                    <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 pl-6">
                      {r.blockSummary ?? r.blockNote}
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-3 pl-6">
                  <Link
                    href={`/u/${r.userId}`}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    Ver perfil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
