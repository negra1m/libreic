'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, UserPlus, UserMinus, Loader2 } from 'lucide-react'

type UserResult = {
  id: string
  name: string
  image: string | null
  username: string | null
  isFollowing: boolean
}

export function UserSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [followState, setFollowState] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  async function search(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }

  function toggleFollow(userId: string) {
    const isFollowing = followState[userId] ?? results.find(u => u.id === userId)?.isFollowing ?? false
    startTransition(async () => {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      })
      if (res.ok) setFollowState(s => ({ ...s, [userId]: !isFollowing }))
    })
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
        <Search className="h-4 w-4 text-slate-400" />
        Buscar pessoas
      </h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Buscar por nome ou @username..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
      </div>

      {results.length > 0 && (
        <div className="mt-2 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {results.map(u => {
            const isFollowing = followState[u.id] ?? u.isFollowing
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/u/${u.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                  {u.image ? (
                    <Image src={u.image} alt={u.name} width={36} height={36} className="rounded-full shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                      {u.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                    {u.username && <p className="text-xs text-slate-400">@{u.username}</p>}
                  </div>
                </Link>
                <button
                  onClick={() => toggleFollow(u.id)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    isFollowing
                      ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isFollowing ? <><UserMinus className="h-3.5 w-3.5" /> Seguindo</> : <><UserPlus className="h-3.5 w-3.5" /> Seguir</>}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <p className="mt-3 text-sm text-slate-400 text-center">Nenhum usuário encontrado para "{query}"</p>
      )}
    </section>
  )
}
