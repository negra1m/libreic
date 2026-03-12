'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AvatarForm({ name, image }: { name: string; image: string | null }) {
  const [preview, setPreview] = useState<string | null>(image)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setError('')

    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) { setError(data.error); setPreview(image); return }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group cursor-pointer shrink-0"
        disabled={loading}
      >
        {preview ? (
          <Image src={preview} alt={name} width={56} height={56} className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
        </div>
      </button>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="text-sm text-indigo-600 hover:underline cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Trocar foto'}
        </button>
        <p className="text-xs text-slate-400 mt-0.5">JPG, PNG ou WebP · máx. 5 MB</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
    </div>
  )
}
