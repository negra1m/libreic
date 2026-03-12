import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 7) return `${days}d atrás`
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`
  if (days < 365) return `${Math.floor(days / 30)}mes atrás`
  return `${Math.floor(days / 365)}a atrás`
}

export function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function getSourceIcon(type: string): string {
  const icons: Record<string, string> = {
    youtube:  '▶',
    reel:     '📱',
    link:     '🔗',
    pdf:      '📄',
    audio:    '🎵',
    image:    '🖼',
    note:     '📝',
    internal: '📚',
  }
  return icons[type] ?? '📌'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    saved:     'Salvo',
    pending:   'Pendente',
    seen:      'Visto',
    summarized: 'Resumido',
    applied:   'Aplicado',
    archived:  'Arquivado',
  }
  return labels[status] ?? status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    saved:     'bg-slate-100 text-slate-700',
    pending:   'bg-amber-100 text-amber-700',
    seen:      'bg-blue-100 text-blue-700',
    summarized: 'bg-violet-100 text-violet-700',
    applied:   'bg-green-100 text-green-700',
    archived:  'bg-gray-100 text-gray-500',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

// Próximo intervalo de revisão (spaced repetition simplificado)
const REVIEW_INTERVALS = [3, 7, 30, 90] // dias
export function nextReviewDate(reviewCount: number): Date {
  const days = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)]
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
