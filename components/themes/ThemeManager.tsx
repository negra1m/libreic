'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Plus, Loader2, Lock, Globe, Copy, Check, AlertTriangle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#0ea5e9','#64748b',
]

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isSimilar(a: string, b: string) {
  const na = normalize(a)
  const nb = normalize(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

export function ThemeManager() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [isPending, startTransition] = useTransition()
  const [suggestions, setSuggestions] = useState<{ own: any[]; platform: any[] }>({ own: [], platform: [] })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) { setSuggestions({ own: [], platform: [] }); return }
    if (name.trim().length < 2) { setSuggestions({ own: [], platform: [] }); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/themes?q=${encodeURIComponent(name.trim())}`)
      const data = await res.json()
      if (data.own || data.platform) {
        // Filtra pela similaridade normalizada para destacar casos como T.I. vs TI
        const filtered = {
          own: (data.own ?? []).filter((t: any) => isSimilar(t.name, name)),
          platform: (data.platform ?? []).filter((t: any) => isSimilar(t.name, name)),
        }
        setSuggestions(filtered)
      }
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [name, open])

  async function handleCreate() {
    startTransition(async () => {
      await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, visibility }),
      })
      setName(''); setSuggestions({ own: [], platform: [] }); setOpen(false)
      router.refresh()
    })
  }

  const hasSuggestions = suggestions.own.length > 0 || suggestions.platform.length > 0

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setName(''); setSuggestions({ own: [], platform: [] }) } }}>
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
            onKeyDown={e => e.key === 'Enter' && !hasSuggestions && handleCreate()}
          />

          {hasSuggestions && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Temas parecidos já existem
              </div>

              {suggestions.own.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-600 font-medium">Seus temas:</p>
                  {suggestions.own.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => { setOpen(false); router.push(`/theme/${t.id}`) }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 hover:border-amber-400 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color ?? '#6366f1' }} />
                      <span className="text-xs font-medium text-slate-800 truncate">{t.name}</span>
                      <span className="ml-auto text-xs text-amber-500 shrink-0">usar este →</span>
                    </button>
                  ))}
                </div>
              )}

              {suggestions.platform.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" /> Na plataforma:
                  </p>
                  {suggestions.platform.map((t: any) => (
                    <div
                      key={t.id}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-left"
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color ?? '#6366f1' }} />
                      <span className="text-xs font-medium text-slate-800 truncate">{t.name}</span>
                      <span className="ml-auto text-xs text-slate-400 shrink-0">público</span>
                    </div>
                  ))}
                  <p className="text-xs text-amber-600 mt-1">
                    Considere usar o mesmo nome para conectar conhecimento entre usuários.
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleCreate}
                disabled={!name.trim() || isPending}
                className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-100 cursor-pointer"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Criar mesmo assim com este nome'}
              </Button>
            </div>
          )}

          {!hasSuggestions && (
            <>
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
            </>
          )}
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
