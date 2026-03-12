'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeDate, getStatusColor, getStatusLabel, getSourceIcon } from '@/lib/utils'

interface BlockCardProps {
  block: {
    id: string
    title: string
    sourceType: string
    sourceUrl: string | null
    thumbnailUrl: string | null
    status: string
    importance: number
    personalNote: string | null
    createdAt: Date | string
    blockThemes?: { theme: { id: string; name: string; color: string | null } }[]
    blockTags?: { tag: { name: string } }[]
  }
  compact?: boolean
}

export function BlockCard({ block, compact = false }: BlockCardProps) {
  return (
    <Link href={`/block/${block.id}`} className="group block">
      <div className={cn(
        'bg-white border border-slate-200 rounded-xl overflow-hidden transition-all',
        'hover:border-indigo-200 hover:shadow-md group-hover:-translate-y-0.5',
        compact && 'flex gap-3 p-3'
      )}>
        {/* Thumbnail */}
        {!compact && block.thumbnailUrl && (
          <div className="relative h-36 bg-slate-100 overflow-hidden">
            <Image
              src={block.thumbnailUrl}
              alt={block.title}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <span className="absolute bottom-2 left-2 text-lg">{getSourceIcon(block.sourceType)}</span>
          </div>
        )}

        <div className={cn('p-3 flex-1 min-w-0', compact && 'p-0')}>
          {compact && (
            <span className="text-base shrink-0">{getSourceIcon(block.sourceType)}</span>
          )}
          <div className={cn(compact && 'flex-1 min-w-0')}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug">{block.title}</p>
              {block.importance >= 4 && (
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
              )}
            </div>

            {/* Note preview */}
            {!compact && block.personalNote && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{block.personalNote}</p>
            )}

            {/* Meta */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', getStatusColor(block.status))}>
                {getStatusLabel(block.status)}
              </span>
              {block.blockThemes?.slice(0, 2).map(bt => (
                <span
                  key={bt.theme.id}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
                >
                  {bt.theme.name}
                </span>
              ))}
              {!compact && block.blockTags?.slice(0, 3).map(bt => (
                <span key={bt.tag.name} className="text-xs text-slate-400">#{bt.tag.name}</span>
              ))}
            </div>

            {/* Date */}
            <p className="mt-1.5 text-xs text-slate-400">{formatRelativeDate(block.createdAt)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
