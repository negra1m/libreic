'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Users, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ token: string }> }

export default function InvitePage({ params }: Props) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const router = useRouter()

  useEffect(() => {
    params.then(async ({ token }) => {
      // Extrai collectionId do token via API dedicada
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCollectionId(data.collectionId)
        setStatus('success')
      } else {
        setMessage(data.error ?? 'Erro ao aceitar convite')
        setStatus('error')
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
          <Users className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Convite para coleção</h1>

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processando convite...</span>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Você entrou na coleção!</span>
            </div>
            <Link
              href={`/collections/${collectionId}`}
              className="block w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Abrir coleção
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex items-center justify-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{message}</span>
            </div>
            <Link
              href="/"
              className="block w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Voltar ao início
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
