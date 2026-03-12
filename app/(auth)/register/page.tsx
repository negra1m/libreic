'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { BookOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao criar conta')
        return
      }

      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Erro ao fazer login automático. Tente entrar manualmente.')
        return
      }
      window.location.href = '/'
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">LibreIC</h1>
          <p className="text-slate-500 text-sm mt-1">Crie sua biblioteca pessoal</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-900 text-center">Criar conta</h2>

          <form onSubmit={handleRegister} className="space-y-3">
            <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
