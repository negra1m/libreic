'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, Link2, FileText, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/ui/TagInput'
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function QuickSave({ themes }: QuickSaveProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'url' | 'note' | 'file'>('url')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [themeId, setThemeId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const flatThemes = flattenThemes(themes)

  function reset() {
    setUrl(''); setTitle(''); setNote(''); setThemeId(''); setTags([]); setFile(null)
  }

  async function handleSave() {
    startTransition(async () => {
      let body: Record<string, any>

      if (mode === 'file' && file) {
        // 1. Upload do arquivo
        const fd = new FormData()
        fd.append('file', file)
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!upRes.ok) {
          const err = await upRes.json()
          alert(err.error ?? 'Erro no upload')
          return
        }
        const upData = await upRes.json()
        body = {
          title: title || file.name,
          sourceType: upData.sourceType,
          filePath: upData.filePath,
          fileName: upData.fileName,
          fileSizeBytes: upData.fileSizeBytes,
          sourceUrl: upData.publicUrl,
          themeIds: themeId ? [themeId] : [],
          tags,
        }
      } else if (mode === 'url') {
        body = { sourceUrl: url, themeIds: themeId ? [themeId] : [], tags }
      } else {
        body = { title, sourceType: 'note', personalNote: note, themeIds: themeId ? [themeId] : [], tags }
      }

      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setOpen(false)
        reset()
        router.refresh()
      }
    })
  }

  const canSave = mode === 'url' ? !!url
    : mode === 'note' ? !!title
    : !!file

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 cursor-pointer">
          <Plus className="h-4 w-4" />
          Conhecimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar conteúdo</DialogTitle>
        </DialogHeader>

        {/* Modos */}
        <div className="flex gap-2">
          <Button variant={mode === 'url' ? 'default' : 'outline'} size="sm"
            onClick={() => setMode('url')} className="flex-1 gap-1.5 cursor-pointer">
            <Link2 className="h-3.5 w-3.5" /> Link / URL
          </Button>
          <Button variant={mode === 'note' ? 'default' : 'outline'} size="sm"
            onClick={() => setMode('note')} className="flex-1 gap-1.5 cursor-pointer">
            <FileText className="h-3.5 w-3.5" /> Nota
          </Button>
          <Button variant={mode === 'file' ? 'default' : 'outline'} size="sm"
            onClick={() => setMode('file')} className="flex-1 gap-1.5 cursor-pointer">
            <Upload className="h-3.5 w-3.5" /> Arquivo
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
          ) : mode === 'note' ? (
            <>
              <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              <Textarea placeholder="Nota..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
            </>
          ) : (
            <>
              {/* Dropzone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  const dropped = e.dataTransfer.files[0]
                  if (dropped) setFile(dropped)
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.ogg,.m4a"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
                />
                {file ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-400 space-y-1">
                    <Upload className="h-8 w-8 mx-auto opacity-50" />
                    <p className="text-sm">Arraste ou clique para selecionar</p>
                    <p className="text-xs">PDF, imagem ou áudio · máx. 50 MB</p>
                  </div>
                )}
              </div>
              {file && (
                <Input
                  placeholder={`Título (opcional — padrão: ${file.name})`}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              )}
            </>
          )}

          <Select value={themeId} onValueChange={setThemeId}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Tema (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem classificar</SelectItem>
              {flatThemes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="Tags (Enter ou vírgula para adicionar)"
          />

          <Button onClick={handleSave} disabled={isPending || !canSave} className="w-full cursor-pointer">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
