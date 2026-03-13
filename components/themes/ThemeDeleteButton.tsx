'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface Theme {
  id: string
  name: string
  color: string | null
}

interface ThemeDeleteButtonProps {
  theme: Theme
  itemCount: number
  otherThemes: Theme[]
}

export function ThemeDeleteButton({ theme, itemCount, otherThemes }: ThemeDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [migrateTo, setMigrateTo] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const needsMigration = itemCount > 0
  const canDelete = !needsMigration || migrateTo !== ''

  function handleDelete() {
    startTransition(async () => {
      const url = `/api/themes/${theme.id}${migrateTo ? `?migrateTo=${migrateTo}` : ''}`
      await fetch(url, { method: 'DELETE' })
      setOpen(false)
      router.push('/explore')
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Apagar tema
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              Apagar tema
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.color ?? '#6366f1' }} />
              <span className="text-sm font-medium text-slate-800">{theme.name}</span>
              {itemCount > 0 && (
                <span className="ml-auto text-xs text-slate-500">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
              )}
            </div>

            {needsMigration ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Este tema tem {itemCount} {itemCount === 1 ? 'item' : 'itens'}. Escolha para onde migrar antes de apagar.</span>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Migrar itens para:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {otherThemes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setMigrateTo(t.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors cursor-pointer ${
                          migrateTo === t.id
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color ?? '#6366f1' }} />
                        <span className="truncate">{t.name}</span>
                        {migrateTo === t.id && <ArrowRight className="h-3.5 w-3.5 ml-auto shrink-0" />}
                      </button>
                    ))}
                    {otherThemes.length === 0 && (
                      <p className="text-xs text-slate-400 px-2 py-2">Nenhum outro tema disponível</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Tem certeza que quer apagar este tema? Essa ação não pode ser desfeita.</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 cursor-pointer" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                onClick={handleDelete}
                disabled={!canDelete || isPending || (needsMigration && otherThemes.length === 0)}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : needsMigration ? 'Migrar e apagar' : 'Apagar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
