import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockThemes, themes, blockTags, tags } from '@/lib/db/schema'
import { and, desc, eq, lte } from 'drizzle-orm'
import { BlockCard } from '@/components/blocks/BlockCard'
import { Library, Filter } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'saved',      label: 'Salvos' },
  { value: 'pending',    label: 'Pendentes' },
  { value: 'seen',       label: 'Vistos' },
  { value: 'summarized', label: 'Resumidos' },
  { value: 'applied',    label: 'Aplicados' },
  { value: 'archived',   label: 'Arquivados' },
]

const TYPE_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'link',    label: 'Links' },
  { value: 'note',    label: 'Notas' },
  { value: 'pdf',     label: 'PDFs' },
  { value: 'image',   label: 'Imagens' },
  { value: 'audio',   label: 'Áudios' },
  { value: 'reel',    label: 'Reels' },
]

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; theme?: string; tag?: string; due?: string }>
}) {
  const session = await auth()
  const userId = session!.user!.id!
  const sp = await searchParams

  const result = await db.query.blocks.findMany({
    where: (b, { and: _and, eq: _eq, lte: _lte, ne }) => {
      const conds = [_eq(b.userId, userId)]
      if (sp.status) conds.push(_eq(b.status, sp.status as any))
      else conds.push(ne(b.status, 'archived'))
      if (sp.type) conds.push(_eq(b.sourceType, sp.type as any))
      if (sp.due)  conds.push(_lte(b.reviewDueAt, new Date()))
      return _and(...conds)
    },
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    limit: 48,
    with: {
      blockThemes: { with: { theme: true } },
      blockTags:   { with: { tag: true } },
    },
  })

  // Filtro por tema/tag no lado da aplicação (simples para MVP)
  let filtered = result
  if (sp.theme) filtered = filtered.filter(b => b.blockThemes.some(bt => bt.themeId === sp.theme))
  if (sp.tag)   filtered = filtered.filter(b => b.blockTags.some(bt => bt.tag.name === sp.tag))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Library className="h-5 w-5 text-indigo-500" />
          Biblioteca
          <span className="text-sm font-normal text-slate-400">({filtered.length})</span>
        </h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs text-slate-500 self-center mr-1">Status:</span>
          {STATUS_OPTS.map(opt => (
            <Link
              key={opt.value}
              href={`/library?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k,v]) => v)), status: opt.value }).toString()}`}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                sp.status === opt.value || (!sp.status && !opt.value)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs text-slate-500 self-center mr-1">Tipo:</span>
          {TYPE_OPTS.map(opt => (
            <Link
              key={opt.value}
              href={`/library?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k,v]) => v)), type: opt.value }).toString()}`}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                sp.type === opt.value || (!sp.type && !opt.value)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
          {filtered.map(b => (
            <BlockCard key={b.id} block={b as any} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl">
          <Library className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhum item encontrado com esses filtros</p>
        </div>
      )}
    </div>
  )
}
