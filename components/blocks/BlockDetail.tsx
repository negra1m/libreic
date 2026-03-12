'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ExternalLink, Star, ArrowLeft, Sparkles, Loader2, Save,
  Link2, Trash2, ChevronDown, RotateCcw, BookOpen, Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/ui/TagInput'
import {
  cn, formatRelativeDate, getStatusColor, getStatusLabel,
  getSourceIcon, nextReviewDate
} from '@/lib/utils'
import { ClaudeKeyModal } from './ClaudeKeyModal'

interface Block {
  id: string
  title: string
  sourceUrl: string | null
  sourceType: string
  thumbnailUrl: string | null
  bodyText: string | null
  personalNote: string | null
  summary: string | null
  mainInsight: string | null
  actionItem: string | null
  importance: number
  status: string
  createdAt: Date | string
  updatedAt: Date | string
  reviewDueAt: Date | string | null
  reviewCount: number
  blockThemes: { themeId: string; theme: { id: string; name: string; color: string | null } }[]
  blockTags: { tag: { name: string } }[]
  sourceConnections: { id: string; relationType: string; note: string | null; target: { id: string; title: string; sourceType: string; thumbnailUrl: string | null; status: string } }[]
  targetConnections: { id: string; relationType: string; note: string | null; source: { id: string; title: string; sourceType: string; thumbnailUrl: string | null; status: string } }[]
}

const RELATION_LABELS: Record<string, string> = {
  complementa: 'Complementa',
  aprofunda:   'Aprofunda',
  originou:    'Originou',
  contradiz:   'Contradiz',
  generaliza:  'Generaliza',
}

const STATUS_FLOW = ['saved', 'pending', 'seen', 'summarized', 'applied']

export function BlockDetail({ block: initial, allThemes }: { block: Block; allThemes: any[] }) {
  const [block, setBlock] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(block.title)
  const [note, setNote] = useState(block.personalNote ?? '')
  const [summary, setSummary] = useState(block.summary ?? '')
  const [mainInsight, setMainInsight] = useState(block.mainInsight ?? '')
  const [actionItem, setActionItem] = useState(block.actionItem ?? '')
  const [tags, setTags] = useState<string[]>(block.blockTags.map(bt => bt.tag.name))
  const [isPending, startTransition] = useTransition()
  const [isAiPending, startAiTransition] = useTransition()
  const [showKeyModal, setShowKeyModal] = useState(false)
  const router = useRouter()

  async function save() {
    startTransition(async () => {
      const res = await fetch(`/api/blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          personalNote: note,
          summary,
          mainInsight,
          actionItem,
          tags,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBlock(prev => ({ ...prev, ...updated }))
        setEditing(false)
        router.refresh()
      }
    })
  }

  async function updateStatus(status: string) {
    startTransition(async () => {
      const res = await fetch(`/api/blocks/${block.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBlock(prev => ({ ...prev, ...updated }))
        router.refresh()
      }
    })
  }

  async function generateSummary() {
    startAiTransition(async () => {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: block.id }),
      })
      if (res.status === 402) {
        setShowKeyModal(true)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary ?? '')
        setMainInsight(data.mainInsight ?? '')
        setActionItem(data.actionItem ?? '')
        setEditing(true)
      }
    })
  }

  async function deleteBlock() {
    if (!confirm('Deletar este item?')) return
    await fetch(`/api/blocks/${block.id}`, { method: 'DELETE' })
    router.push('/library')
  }

  const isArchived = block.status === 'archived'
  const currentIdx = STATUS_FLOW.indexOf(block.status)
  const nextStatus = !isArchived ? STATUS_FLOW[currentIdx + 1] : undefined
  const prevStatus = isArchived ? 'applied' : STATUS_FLOW[currentIdx - 1]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{getSourceIcon(block.sourceType)}</span>
            {editing ? (
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="font-bold text-slate-900 text-lg leading-tight bg-white border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-0 flex-1"
                autoFocus
              />
            ) : (
              <h1 className="font-bold text-slate-900 text-lg leading-tight">{title}</h1>
            )}
            {block.importance >= 4 && <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Adicionado {formatRelativeDate(block.createdAt)}
            {block.reviewDueAt && ` · Revisão: ${formatRelativeDate(block.reviewDueAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {block.sourceUrl && (
            <Button variant="outline" size="icon-sm" asChild>
              <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={deleteBlock} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Thumbnail */}
      {block.thumbnailUrl && (
        <div className="relative h-48 rounded-xl overflow-hidden bg-slate-100">
          <Image src={block.thumbnailUrl} alt={block.title} fill className="object-cover" unoptimized />
        </div>
      )}

      {/* Status + Progresso */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium px-2.5 py-1 rounded-full', getStatusColor(block.status))}>
            {getStatusLabel(block.status)}
          </span>
          <div className="flex gap-1.5">
            {prevStatus && (
              <Button variant="outline" size="sm" onClick={() => updateStatus(prevStatus)} disabled={isPending}>
                ← {getStatusLabel(prevStatus)}
              </Button>
            )}
            {nextStatus && (
              <Button size="sm" onClick={() => updateStatus(nextStatus)} disabled={isPending}>
                {getStatusLabel(nextStatus)} →
              </Button>
            )}
            {!isArchived && (
              <Button variant="outline" size="sm" onClick={() => updateStatus('archived')} disabled={isPending} className="text-slate-500 hover:text-slate-700">
                Arquivar
              </Button>
            )}
          </div>
        </div>

        {/* Temas e tags */}
        <div className="flex flex-wrap gap-1.5">
          {block.blockThemes.map(bt => (
            <Link key={bt.themeId} href={`/explore?theme=${bt.themeId}`}>
              <span
                className="text-xs px-2 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: (bt.theme.color ?? '#6366f1') + '20', color: bt.theme.color ?? '#6366f1' }}
              >
                {bt.theme.name}
              </span>
            </Link>
          ))}
          {block.blockTags.map(bt => (
            <Link key={bt.tag.name} href={`/search?q=${bt.tag.name}`}>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
                #{bt.tag.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Conteúdo do bloco */}
      {block.bodyText && !editing && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Conteúdo</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{block.bodyText}</p>
        </div>
      )}

      {/* Conhecimento pessoal */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Meu conhecimento
          </h2>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={generateSummary} disabled={isAiPending} className="gap-1.5">
              {isAiPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Resumir com IA
            </Button>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
            ) : (
              <Button size="sm" onClick={save} disabled={isPending} className="gap-1.5">
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </Button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Nota pessoal</label>
              <Textarea placeholder="Por que isso importa pra você?" value={note} onChange={e => setNote(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Resumo</label>
              <Textarea placeholder="O que é isso em 2-3 frases" value={summary} onChange={e => setSummary(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Insight principal</label>
              <Textarea placeholder="A ideia mais valiosa" value={mainInsight} onChange={e => setMainInsight(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Ação prática</label>
              <Input placeholder="O que vou fazer com isso?" value={actionItem} onChange={e => setActionItem(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Tags</label>
              <TagInput value={tags} onChange={setTags} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Nota pessoal', value: note },
              { label: 'Resumo', value: summary },
              { label: 'Insight principal', value: mainInsight },
              { label: 'Ação prática', value: actionItem },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-slate-700">{value}</p>
              </div>
            ) : null)}

            {!note && !summary && !mainInsight && !actionItem && (
              <p className="text-sm text-slate-400 italic">
                Clique em <strong>Editar</strong> para adicionar suas notas, ou <strong>Resumir com IA</strong> para gerar automaticamente.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de chave Claude */}
      {showKeyModal && (
        <ClaudeKeyModal
          onClose={() => setShowKeyModal(false)}
          onSaved={() => {
            setShowKeyModal(false)
            generateSummary()
          }}
        />
      )}

      {/* Conexões */}
      {(block.sourceConnections.length > 0 || block.targetConnections.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-indigo-500" />
            Conectado com
          </h2>
          <div className="space-y-2">
            {block.sourceConnections.map(conn => (
              <Link key={conn.id} href={`/block/${conn.target.id}`}>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  <span className="text-base">{getSourceIcon(conn.target.sourceType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{conn.target.title}</p>
                    <p className="text-xs text-slate-400">{RELATION_LABELS[conn.relationType] ?? conn.relationType}</p>
                  </div>
                  {conn.note && <p className="text-xs text-slate-400 truncate max-w-[120px]">{conn.note}</p>}
                </div>
              </Link>
            ))}
            {block.targetConnections.map(conn => (
              <Link key={conn.id} href={`/block/${conn.source.id}`}>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  <span className="text-base">{getSourceIcon(conn.source.sourceType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{conn.source.title}</p>
                    <p className="text-xs text-slate-400">← {RELATION_LABELS[conn.relationType] ?? conn.relationType}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
