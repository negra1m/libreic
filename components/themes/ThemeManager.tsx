'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Lock, Globe, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#0ea5e9','#64748b',
]

export function ThemeManager() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleCreate() {
    startTransition(async () => {
      await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, visibility }),
      })
      setName(''); setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer">
          <Plus className="h-4 w-4" /> Novo tema
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar tema</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Nome do tema"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />

          <div>
            <p className="text-xs text-slate-500 mb-2">Cor</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">Visibilidade</p>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibility('public')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm transition-colors cursor-pointer ${
                  visibility === 'public'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Público
              </button>
              <button
                onClick={() => setVisibility('private')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm transition-colors cursor-pointer ${
                  visibility === 'private'
                    ? 'bg-orange-50 border-orange-300 text-orange-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> Privado
              </button>
            </div>
            {visibility === 'private' && (
              <p className="text-xs text-slate-400 mt-1.5">Só você e as pessoas convidadas vão ver este tema</p>
            )}
          </div>

          <Button onClick={handleCreate} disabled={!name.trim() || isPending} className="w-full cursor-pointer">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar tema'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Botão para gerar link de convite de um tema privado
export function ThemeInviteButton({ themeId }: { themeId: string }) {
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleInvite() {
    startTransition(async () => {
      const res = await fetch(`/api/themes/${themeId}/invite`, { method: 'POST' })
      const data = await res.json()
      if (data.token) {
        const link = `${window.location.origin}/invite/theme/${data.token}`
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    })
  }

  return (
    <button
      onClick={handleInvite}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Link copiado!' : 'Copiar link de convite'}
    </button>
  )
}
