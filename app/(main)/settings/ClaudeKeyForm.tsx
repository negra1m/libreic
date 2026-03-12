'use client'

import { useState } from 'react'
import { Eye, EyeOff, ExternalLink } from 'lucide-react'

export function ClaudeKeyForm({ hasKey }: { hasKey: boolean }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claudeApiKey: key.trim() || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess(key.trim() ? 'Chave salva!' : 'Chave removida.')
    setKey('')
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-xs text-slate-500">
        Sua chave é usada apenas nas suas chamadas de IA.{' '}
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
        >
          Obter chave <ExternalLink className="h-3 w-3" />
        </a>
      </p>

      {hasKey && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          Chave configurada — IA habilitada
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder={hasKey ? 'Substituir por nova chave...' : 'sk-ant-...'}
            className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {hasKey && (
        <button
          type="button"
          onClick={() => { setKey(''); save({ preventDefault: () => {} } as any) }}
          className="text-xs text-red-500 hover:underline cursor-pointer"
        >
          Remover chave
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}
    </form>
  )
}
