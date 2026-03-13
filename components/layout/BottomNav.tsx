'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Library, Folder, Search, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/',         label: 'Home',       icon: Home },
  { href: '/library',  label: 'Biblioteca', icon: Library },
  { href: '/explore',  label: 'Temas',      icon: Folder },
  { href: '/search',   label: 'Busca',      icon: Search },
  { href: '/settings', label: 'Config',     icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex md:hidden safe-bottom">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
              active ? 'text-indigo-600' : 'text-slate-400'
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
