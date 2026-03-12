'use client'

import { useState, useTransition, useEffect } from 'react'
import { Search, Loader2, Sparkles, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BlockCard } from '@/components/blocks/BlockCard'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function SearchPage() {
  const sp = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [results, setResults] = useState<any[]>([])
  const [userResults, setUserResults] = useState<any[]>([])
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<{ answer: string; sources: any[] } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isAiPending, startAiTransition] = useTransition()
  const [mode, setMode] = useState<'search' | 'ask'>('search')

  useEffect(() => {
    if (q.length >= 2) {
      const timeout = setTimeout(() => {
        startTransition(async () => {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
          const data = await res.json()
          setResults(data.results ?? [])
          setUserResults(data.users ?? [])
        })
      }, 300)
      return () => clearTimeout(timeout)
    } else {
      setResults([])
      setUserResults([])
    }
  }, [q])

  async function handleAsk() {
    if (!aiQuestion.trim()) return
    startAiTransition(async () => {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion }),
      })
      const data = await res.json()
      setAiAnswer(data)
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex gap-2">
        <Button
          variant={mode === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('search')}
          className="gap-1.5"
        >
          <Search className="h-3.5 w-3.5" /> Buscar
        </Button>
        <Button
          variant={mode === 'ask' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('ask')}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" /> Perguntar à biblioteca (IA)
        </Button>
      </div>

      {mode === 'search' ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 h-11 text-base"
              placeholder="Buscar em título, notas, resumos, tags..."
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
            />
            {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
          </div>

          {userResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Pessoas
              </p>
              <div className="flex flex-col gap-2">
                {userResults.map((u: any) => (
                  <Link key={u.id} href={`/u/${u.id}`}>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-200 transition-colors flex items-center gap-3 cursor-pointer">
                      {u.image ? (
                        <Image src={u.image} alt={u.name} width={36} height={36} className="rounded-full shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                          {u.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{u.name}</p>
                        {u.username && <p className="text-xs text-slate-400">@{u.username}</p>}
                      </div>
                      <span className="ml-auto text-xs text-slate-400 shrink-0">{u.publicCount} público{u.publicCount !== 1 ? 's' : ''}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Blocos ({results.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((b: any) => (
                  <BlockCard key={b.id} block={b} />
                ))}
              </div>
            </div>
          ) : q.length >= 2 && !isPending && userResults.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum resultado para <strong>&ldquo;{q}&rdquo;</strong></p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              className="h-11 text-base"
              placeholder="O que você quer saber sobre o que salvou?"
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              autoFocus
            />
            <Button onClick={handleAsk} disabled={isAiPending || !aiQuestion.trim()} className="h-11 px-5">
              {isAiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Perguntar'}
            </Button>
          </div>

          {aiAnswer && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-indigo-700">Resposta da IA</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiAnswer.answer}</p>
              </div>

              {aiAnswer.sources.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Fontes usadas:</p>
                  <div className="space-y-1">
                    {aiAnswer.sources.map((s, i) => (
                      <div key={i} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="text-xs text-slate-400">[{i + 1}]</span>
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                            {s.title}
                          </a>
                        ) : (
                          <span>{s.title}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
