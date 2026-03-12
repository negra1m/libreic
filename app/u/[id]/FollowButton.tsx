'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'

export function FollowButton({ userId, initialFollowing }: { userId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: following ? 'DELETE' : 'POST',
      })
      if (res.ok) setFollowing(!following)
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0 ${
        following
          ? 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200'
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }`}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <><UserMinus className="h-3.5 w-3.5" /> Seguindo</>
      ) : (
        <><UserPlus className="h-3.5 w-3.5" /> Seguir</>
      )}
    </button>
  )
}
