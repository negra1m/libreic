'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Search, Loader2, Sparkles, Users, AlertTriangle, KeyRound, Send, Bot } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BlockCard } from '@/components/blocks/BlockCard'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const AI_ERROR_MESSAGES: Record<string, { title: string; detail: string; fatal?: boolean }> = {
  credits_exhausted: {
    title: 'Créditos esgotados',
    detail: 'Sua chave da API Anthropic ficou sem créditos. Recarregue em console.anthropic.com.',
    fatal: true,
  },
  invalid_key: {
    title: 'Chave de API inválida',
    detail: 'A chave configurada não é válida. Verifique nas configurações.',
    fatal: true,
  },
  rate_limit: {
    title: 'Limite de uso atingido',
    detail: 'Muitas requisições em pouco tempo. Aguarde alguns instantes e tente novamente.',
  },
  overloaded: {
    title: 'Serviço temporariamente indisponível',
    detail: 'A Anthropic está com alta demanda agora. Tente novamente em instantes.',
  },
  api_error: {
    title: 'Erro ao consultar Jones',
    detail: 'Ocorreu um erro inesperado. Tente novamente.',
  },
  unknown: {
    title: 'Erro desconhecido',
    detail: 'Não foi possível obter resposta de Jones.',
  },
  no_key: {
    title: 'Chave de API não configurada',
    detail: 'Configure uma chave da API Anthropic nas configurações para usar Jones.',
    fatal: true,
  },
}

type Message =
  | { role: 'user'; text: string }
  | { role: 'jones'; text: string; sources?: { title: string; url?: string | null }[] }
  | { role: 'error'; code: string }

export default function SearchPage() {
  const sp = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [results, setResults] = useState<any[]>([])
  const [userResults, setUserResults] = useState<any[]>([])
  const [aiQuestion, setAiQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [aiStatus, setAiStatus] = useState<{ available: boolean; reason?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isAiPending, startAiTransition] = useTransition()
  const [mode, setMode] = useState<'search' | 'ask'>('search')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/ai/status')
      .then(r => r.json())
      .then(setAiStatus)
      .catch(() => setAiStatus({ available: false, reason: 'network' }))
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiPending])

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
    const question = aiQuestion.trim()
    if (!question) return

    setAiQuestion('')
    setMessages(prev => [...prev, { role: 'user', text: question }])

    startAiTransition(async () => {
      try {
        const res = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        })
        const data = await res.json()
        if (data.error) {
          const code = data.error as string
          setMessages(prev => [...prev, { role: 'error', code }])
          if (AI_ERROR_MESSAGES[code]?.fatal) {
            setAiStatus({ available: false, reason: code })
          }
        } else {
          setMessages(prev => [...prev, { role: 'jones', text: data.answer, sources: data.sources }])
        }
      } catch {
        setMessages(prev => [...prev, { role: 'error', code: 'unknown' }])
      }
    })
  }

  const aiUnavailableReason = !aiStatus?.available ? (aiStatus?.reason ?? 'no_key') : null
  const aiDisabled = aiUnavailableReason != null

  return (
    <div className="h-full flex flex-col">
      {/* Mode tabs */}
      <div className="flex gap-2 mb-4 shrink-0">
        <Button
          variant={mode === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('search')}
          className="gap-1.5"
        >
          <Search className="h-3.5 w-3.5" /> Buscar
        </Button>
        <div className="relative group">
          <Button
            variant={mode === 'ask' ? 'default' : 'outline'}
            size="sm"
            onClick={() => !aiDisabled && setMode('ask')}
            className={cn('gap-1.5', aiDisabled && 'opacity-60 cursor-not-allowed')}
            disabled={aiDisabled}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Jones (IA)
            {aiDisabled && <KeyRound className="h-3 w-3 ml-0.5" />}
          </Button>
          {aiDisabled && (
            <div className="absolute left-0 top-full mt-1.5 z-10 hidden group-hover:block w-72 bg-white border border-amber-200 rounded-xl shadow-lg p-3">
              <div className="flex items-start gap-2 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-semibold">{AI_ERROR_MESSAGES[aiUnavailableReason]?.title ?? 'IA indisponível'}</p>
                  <p className="mt-0.5 text-amber-600">{AI_ERROR_MESSAGES[aiUnavailableReason]?.detail}</p>
                  <Link href="/settings" className="mt-1.5 inline-block text-indigo-600 hover:underline font-medium">Ir para configurações →</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {mode === 'search' ? (
        <div className="space-y-4 flex-1 overflow-y-auto max-w-3xl mx-auto w-full">
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
        </div>
      ) : (
        /* ── JONES CHAT ──────────────────────────────────────── */
        <div className="flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden"
          style={{
            background: '#03031a',
            border: '1px solid rgba(0,255,255,0.18)',
          }}>

          {/* Jones header bar */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b font-mono text-xs"
            style={{ borderColor: 'rgba(0,255,255,0.25)', background: 'rgba(4,4,24,0.95)' }}>
            <span style={{ color: '#00FFFF' }}>JONES_V3</span>
            <span style={{ color: 'rgba(0,255,255,0.4)' }}>//</span>
            <span style={{ color: 'rgba(0,255,255,0.6)' }}>PROTOCOL_CHAT</span>
            <span className="ml-auto flex items-center gap-1.5">
              {isAiPending
                ? <><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FF2ECC' }} /><span style={{ color: '#FF2ECC' }}>PROCESSING</span></>
                : <><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00FFFF' }} /><span style={{ color: 'rgba(0,255,255,0.7)' }}>IDLE</span></>
              }
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-10">
                {/* Jones face */}
                <div className="relative select-none">
                  <div className="flex gap-4 mb-2">
                    <div className="w-7 h-7 rounded-lg" style={{ background: '#00FFFF', boxShadow: '0 0 16px #00FFFF' }} />
                    <div className="w-7 h-7 rounded-lg" style={{ background: '#00FFFF', boxShadow: '0 0 16px #00FFFF' }} />
                  </div>
                  <div className="mx-auto h-0.5 w-12 rounded-full" style={{ background: '#00FFFF', boxShadow: '0 0 8px #00FFFF' }} />
                </div>
                <div className="font-mono">
                  <p className="text-sm font-bold" style={{ color: '#00FFFF' }}>JONES_V3 // ONLINE</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(0,255,255,0.5)' }}>Assistente de biblioteca pessoal · Pronto para ajudar</p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {['O que salvei sobre astronomia?', 'Quais são meus itens para revisar?', 'Me fale sobre os temas que tenho'].map(s => (
                    <button
                      key={s}
                      onClick={() => setAiQuestion(s)}
                      className="text-xs px-3 py-2 font-mono text-left transition-all cursor-pointer"
                      style={{
                        background: 'rgba(0,255,255,0.04)',
                        border: '1px solid rgba(0,255,255,0.2)',
                        borderRadius: '6px',
                        color: 'rgba(0,255,255,0.7)',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#00FFFF'; (e.currentTarget as HTMLButtonElement).style.color = '#00FFFF' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,255,255,0.7)' }}
                    >
                      <span style={{ color: '#FF2ECC' }}>{'>'}</span> {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] font-mono text-sm px-4 py-2.5 rounded-lg"
                      style={{ background: 'rgba(255,46,204,0.1)', border: '1px solid rgba(255,46,204,0.3)', color: '#f0c0f0' }}>
                      <span style={{ color: '#FF2ECC', marginRight: 8 }}>{'>'}</span>{msg.text}
                    </div>
                  </div>
                )
              }

              if (msg.role === 'error') {
                const errInfo = AI_ERROR_MESSAGES[msg.code] ?? AI_ERROR_MESSAGES.unknown
                return (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded shrink-0 mt-0.5 flex items-center justify-center font-mono text-xs font-bold"
                      style={{ background: 'rgba(255,46,204,0.15)', border: '1px solid rgba(255,46,204,0.4)', color: '#FF2ECC' }}>!</div>
                    <div className="font-mono text-xs p-3 rounded-lg flex-1"
                      style={{ background: 'rgba(255,46,204,0.07)', border: '1px solid rgba(255,46,204,0.25)' }}>
                      <p className="font-bold mb-1" style={{ color: '#FF2ECC' }}>ERROR // {errInfo.title.toUpperCase()}</p>
                      <p style={{ color: 'rgba(255,192,240,0.8)' }}>{errInfo.detail}</p>
                      {errInfo.fatal && (
                        <Link href="/settings" className="mt-2 inline-block underline font-bold" style={{ color: '#00FFFF' }}>
                          {'>'} IR PARA CONFIGURAÇÕES
                        </Link>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div key={i} className="flex gap-3">
                  {/* Mini Jones face avatar */}
                  <div className="shrink-0 mt-1 flex flex-col items-center gap-0.5">
                    <div className="flex gap-0.5">
                      <div className="w-2 h-2 rounded-sm" style={{ background: '#00FFFF', boxShadow: '0 0 4px #00FFFF' }} />
                      <div className="w-2 h-2 rounded-sm" style={{ background: '#00FFFF', boxShadow: '0 0 4px #00FFFF' }} />
                    </div>
                    <div className="w-4 h-px" style={{ background: '#00FFFF' }} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="font-mono text-sm p-3 rounded-lg whitespace-pre-wrap"
                      style={{ background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.18)', color: '#c8f8f8' }}>
                      {msg.text}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 font-mono">
                        {msg.sources.map((s, si) => (
                          <span key={si} className="text-xs" style={{ color: 'rgba(0,255,255,0.4)' }}>
                            [{si + 1}]{' '}
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,255,255,0.7)' }} className="hover:underline">
                                {s.title}
                              </a>
                            ) : s.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {isAiPending && (
              <div className="flex gap-3">
                <div className="shrink-0 mt-1 flex flex-col items-center gap-0.5">
                  <div className="flex gap-0.5">
                    <div className="w-2 h-2 rounded-sm animate-pulse" style={{ background: '#00FFFF' }} />
                    <div className="w-2 h-2 rounded-sm animate-pulse" style={{ background: '#00FFFF', animationDelay: '150ms' }} />
                  </div>
                  <div className="w-4 h-px" style={{ background: '#00FFFF' }} />
                </div>
                <div className="font-mono text-xs p-3 rounded-lg" style={{ background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.18)' }}>
                  <span style={{ color: '#00FFFF' }} className="animate-pulse">PROCESSANDO...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t" style={{ borderColor: 'rgba(0,255,255,0.18)', background: 'rgba(2,2,20,0.95)' }}>
            <div className="px-4 pt-2.5 font-mono text-[10px] tracking-widest" style={{ color: 'rgba(0,255,255,0.35)' }}>
              INSTRUA JONES
            </div>
            <div className="flex items-center gap-3 px-4 pb-3 pt-2">
              <span className="font-mono text-base shrink-0 pb-1 leading-none" style={{ color: '#00FFFF' }}>{'>'}</span>
              <textarea
                className="flex-1 p-2 resize-none font-mono text-sm focus:outline-none bg-transparent leading-relaxed"
                style={{
                  color: '#e0feff',
                  caretColor: '#00FFFF',
                  minHeight: '44px',
                  maxHeight: '120px',
                  border: 'none',
                  padding: '4px 4px',
                }}
                placeholder="INSTRUA JONES..."
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() }
                }}
                rows={1}
                disabled={aiDisabled}
              />
              <button
                onClick={handleAsk}
                disabled={isAiPending || !aiQuestion.trim() || aiDisabled}
                className="shrink-0 font-mono text-xs px-3 py-2 rounded transition-all cursor-pointer disabled:opacity-30"
                style={{
                  background: 'rgba(0,255,255,0.08)',
                  border: '1px solid rgba(0,255,255,0.35)',
                  color: '#00FFFF',
                  boxShadow: '0 0 10px rgba(0,255,255,0.15)',
                }}
              >
                {isAiPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
