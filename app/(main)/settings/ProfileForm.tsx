'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function ProfileForm({ name, username }: { name: string; username: string | null }) {
  const [nameVal, setNameVal] = useState(name)
  const [usernameVal, setUsernameVal] = useState(username ?? '')
  const [usernameStatus, setUsernameStatus] = useState<Status>('idle')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    const u = usernameVal.trim().toLowerCase()
    if (!u || u === (username ?? '').toLowerCase()) { setUsernameStatus('idle'); return }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/profile?q=${encodeURIComponent(u)}`)
      const data = await res.json()
      setUsernameStatus(data.available ? 'available' : 'taken')
    }, 400)
  }, [usernameVal, username])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return
    setSaving(true); setError(''); setSuccess(false)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameVal, username: usernameVal.trim().toLowerCase() || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess(true)
    router.refresh()
  }

  const usernameIcon = {
    idle: null,
    checking: <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />,
    available: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    taken: <XCircle className="h-4 w-4 text-red-500" />,
    invalid: <XCircle className="h-4 w-4 text-red-400" />,
  }[usernameStatus]

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
        <input
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
          <input
            value={usernameVal}
            onChange={e => setUsernameVal(e.target.value)}
            placeholder="seunome"
            className={`w-full pl-7 pr-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          {usernameIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">{usernameIcon}</span>
          )}
        </div>
        {usernameStatus === 'invalid' && <p className="text-xs text-red-500 mt-1">3–20 caracteres: letras, números ou _</p>}
        {usernameStatus === 'taken' && <p className="text-xs text-red-500 mt-1">Username já em uso</p>}
        {usernameStatus === 'available' && <p className="text-xs text-green-600 mt-1">Disponível!</p>}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">Salvo com sucesso!</p>}

      <button
        type="submit"
        disabled={saving || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
