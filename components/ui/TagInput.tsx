'use client'

import { useState, KeyboardEvent, useRef } from 'react'
import { X } from 'lucide-react'

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9áàâãéèêíïóôõöúùûüçñ\-_]/g, '') // remove chars especiais
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = 'Adicionar tag...' }: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const tag = normalizeTag(raw)
    if (!tag) return
    if (value.includes(tag)) { setInput(''); return }
    onChange([...value, tag])
    setInput('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === ',' || e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function handleBlur() {
    if (input.trim()) addTag(input)
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const parts = pasted.split(/[,\n\t]+/)
    const newTags = parts
      .map(normalizeTag)
      .filter(Boolean)
      .filter(t => !value.includes(t))
    if (newTags.length > 0) {
      onChange([...value, ...newTags])
    }
    setInput('')
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-10 px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-sm rounded-full border border-indigo-200 shrink-0"
        >
          #{tag}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(value.filter(t => t !== tag)) }}
            className="text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 text-sm outline-none bg-transparent placeholder:text-slate-400 text-base md:text-sm"
      />
    </div>
  )
}
