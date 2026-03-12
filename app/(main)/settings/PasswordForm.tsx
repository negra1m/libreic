'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setError('As senhas não coincidem'); return }
    setSaving(true); setError(''); setSuccess(false)

    const res = await fetch('/api/profile/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess(true); setCurrent(''); setNext(''); setConfirm('')
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {hasPassword && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Senha atual</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {hasPassword ? 'Nova senha' : 'Criar senha'}
        </label>
        <input
          type={show ? 'text' : 'password'}
          value={next}
          onChange={e => setNext(e.target.value)}
          placeholder="mínimo 6 caracteres"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          required
          minLength={6}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar senha</label>
        <input
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
            confirm && next !== confirm ? 'border-red-300' : 'border-slate-200'
          }`}
          required
        />
        {confirm && next !== confirm && <p className="text-xs text-red-500 mt-1">Senhas não coincidem</p>}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">{hasPassword ? 'Senha alterada!' : 'Senha criada!'}</p>}

      <button
        type="submit"
        disabled={saving || (confirm.length > 0 && next !== confirm)}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {saving ? 'Salvando...' : hasPassword ? 'Alterar senha' : 'Criar senha'}
      </button>
    </form>
  )
}
