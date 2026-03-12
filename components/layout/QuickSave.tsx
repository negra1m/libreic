'use client'

import { useState, useTransition } from 'react'
import { Plus, Link2, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

interface Theme {
  id: string
  name: string
  children?: Theme[]
}

interface QuickSaveProps {
  themes: Theme[]
}

function flattenThemes(themes: Theme[], prefix = ''): { id: string; label: string }[] {
  return themes.flatMap(t => [
    { id: t.id, label: prefix + t.name },
    ...(t.children ? flattenThemes(t.children, prefix + t.name + ' › ') : []),
  ])
}

export function QuickSave({ themes }: QuickSaveProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'url' | 'note'>('url')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [themeId, setThemeId] = useState('')
  const [tags, setTags] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const flatThemes = flattenThemes(themes)

  async function handleSave() {
    startTransition(async () => {
      const body = mode === 'url'
        ? { sourceUrl: url, themeIds: themeId ? [themeId] : [], tags: tags.split(',').map(t => t.trim()).filter(Boolean) }
        : { title, sourceType: 'note', personalNote: note, themeIds: themeId ? [themeId] : [], tags: tags.split(',').map(t => t.trim()).filter(Boolean) }

      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setOpen(false)
        setUrl(''); setTitle(''); setNote(''); setThemeId(''); setTags('')
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Salvar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar conteúdo</DialogTitle>
        </DialogHeader>

        {/* Modo: URL ou Nota */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('url')}
            className="flex-1 gap-1.5"
          >
            <Link2 className="h-3.5 w-3.5" /> Link / URL
          </Button>
          <Button
            variant={mode === 'note' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('note')}
            className="flex-1 gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" /> Nota
          </Button>
        </div>

        <div className="space-y-3">
          {mode === 'url' ? (
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              autoFocus
            />
          ) : (
            <>
              <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              <Textarea placeholder="Nota..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
            </>
          )}

          <Select value={themeId} onValueChange={setThemeId}>
            <SelectTrigger>
              <SelectValue placeholder="Tema (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem classificar</SelectItem>
              {flatThemes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Tags (separadas por vírgula)"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />

          <Button onClick={handleSave} disabled={isPending || (!url && !title)} className="w-full">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
