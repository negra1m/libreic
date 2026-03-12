import { Suspense } from 'react'
import SearchClient from './SearchClient'
import { Loader2 } from 'lucide-react'

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    }>
      <SearchClient />
    </Suspense>
  )
}
