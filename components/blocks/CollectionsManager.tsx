'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getSourceIcon } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Collection {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  collectionBlocks: { block: { id: string; title: string; thumbnailUrl: string | null; sourceType: string; status: string } }[]
}

export function CollectionsManager({ collections: initial }: { collections: Collection[] }) {
  const [collections, setCollections] = useState(initial)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function create() {
    startTransition(async () => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (res.ok) {
        const col = await res.json()
        setCollections(prev => [{ ...col, collectionBlocks: [] }, ...prev])
        setName(''); setDescription(''); setOpen(false)
      }
    })
  }

  async function deleteCollection(id: string) {
    if (!confirm('Deletar coleção?')) return
    await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    setCollections(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          Coleções
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova coleção
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Criar coleção</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} autoFocus />
              <Textarea placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              <Button onClick={create} disabled={!name.trim() || isPending} className="w-full">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl text-slate-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma coleção criada</p>
          <p className="text-sm mt-1">Organize conteúdos em listas temáticas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collections.map(col => (
            <div key={col.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{col.name}</h3>
                  {col.description && <p className="text-sm text-slate-500 mt-0.5">{col.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">{col.collectionBlocks.length} itens</p>
                </div>
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Preview dos primeiros itens */}
              {col.collectionBlocks.length > 0 && (
                <div className="space-y-1.5">
                  {col.collectionBlocks.slice(0, 4).map(cb => (
                    <Link key={cb.block.id} href={`/block/${cb.block.id}`}>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <span className="text-sm">{getSourceIcon(cb.block.sourceType)}</span>
                        <span className="text-sm text-slate-700 truncate">{cb.block.title}</span>
                      </div>
                    </Link>
                  ))}
                  {col.collectionBlocks.length > 4 && (
                    <p className="text-xs text-slate-400 pl-2">+{col.collectionBlocks.length - 4} mais</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
