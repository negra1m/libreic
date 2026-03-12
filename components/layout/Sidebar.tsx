'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Library, Search, Folder, Download, Settings, ChevronRight, Plus, GitFork, Users, Rss } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Theme {
  id: string
  name: string
  color: string | null
  icon: string | null
  children?: Theme[]
}

interface SidebarProps {
  themes: Theme[]
}

const navItems = [
  { href: '/',           label: 'Home',       icon: Home },
  { href: '/library',    label: 'Biblioteca', icon: Library },
  { href: '/explore',    label: 'Explorar',   icon: Folder },
  { href: '/search',     label: 'Busca',      icon: Search },
  { href: '/feed',       label: 'Feed',       icon: Rss },
  { href: '/social',     label: 'Social',     icon: Users },
  { href: '/collections', label: 'Coleções',  icon: BookOpen },
  { href: '/downloads',  label: 'Downloads',  icon: Download },
  { href: '/graph',      label: 'Grafo',      icon: GitFork },
]

function ThemeItem({ theme, depth = 0 }: { theme: Theme; depth?: number }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const hasChildren = theme.children && theme.children.length > 0

  return (
    <div>
      <div className="flex items-center group">
        <Link
          href={`/explore?theme=${theme.id}`}
          className={cn(
            'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
            'hover:bg-slate-100 text-slate-700',
            pathname.includes(theme.id) && 'bg-indigo-50 text-indigo-700 font-medium'
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: theme.color ?? '#6366f1' }}
          />
          <span className="truncate">{theme.name}</span>
        </Link>
        {hasChildren && (
          <button
            onClick={() => setOpen(!open)}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded"
          >
            <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
          </button>
        )}
      </div>
      {open && hasChildren && (
        <div>
          {theme.children!.map(child => (
            <ThemeItem key={child.id} theme={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ themes }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">LibreIC</span>
        </Link>
      </div>

      {/* Nav principal */}
      <nav className="px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer',
              'hover:bg-slate-100 text-slate-700',
              pathname === href && 'bg-indigo-50 text-indigo-700 font-medium'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mx-2 my-1 border-t border-slate-100" />

      {/* Temas */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Temas</span>
          <Link href="/explore?new=1" className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700">
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-0.5">
          {themes.map(theme => (
            <ThemeItem key={theme.id} theme={theme} />
          ))}
          {themes.length === 0 && (
            <p className="text-xs text-slate-400 px-2 py-2">Nenhum tema ainda</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-slate-200">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
      </div>
    </aside>
  )
}
