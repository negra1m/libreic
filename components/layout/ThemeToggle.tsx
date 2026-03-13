'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const isDark = stored === null ? true : stored === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:border-indigo-300 transition-all cursor-pointer"
    >
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${dark ? 'bg-indigo-600' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${dark ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span>{dark ? 'Tema escuro' : 'Tema claro'}</span>
      {dark ? <Moon className="h-4 w-4 ml-auto text-indigo-400" /> : <Sun className="h-4 w-4 ml-auto text-amber-400" />}
    </button>
  )
}
