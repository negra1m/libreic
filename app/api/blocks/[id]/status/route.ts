import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { nextReviewDate } from '@/lib/utils'
import { z } from 'zod'

const VALID_TRANSITIONS: Record<string, string[]> = {
  saved:      ['pending', 'seen', 'archived'],
  pending:    ['seen', 'archived'],
  seen:       ['summarized', 'archived', 'pending'],
  summarized: ['applied', 'seen', 'archived'],
  applied:    ['archived', 'seen'],
  archived:   ['saved', 'applied'],
}

const schema = z.object({
  status:   z.enum(['saved','pending','seen','summarized','applied','archived']),
  schedule: z.boolean().optional(), // agenda próxima revisão
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })

  const { status, schedule } = parsed.data

  const [current] = await db
    .select({ status: blocks.status, reviewCount: blocks.reviewCount })
    .from(blocks)
    .where(and(eq(blocks.id, id), eq(blocks.userId, session.user.id)))
    .limit(1)

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[current.status] ?? []
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: `Transição inválida: ${current.status} → ${status}` }, { status: 422 })
  }

  const updates: Partial<typeof blocks.$inferInsert> = {
    status,
    updatedAt: new Date(),
  }

  if (status === 'seen') {
    updates.lastReviewedAt = new Date()
    updates.reviewCount    = current.reviewCount + 1
    if (schedule !== false) {
      updates.reviewDueAt = nextReviewDate(current.reviewCount + 1)
    }
  }

  const [block] = await db
    .update(blocks)
    .set(updates)
    .where(and(eq(blocks.id, id), eq(blocks.userId, session.user.id)))
    .returning()

  return NextResponse.json(block)
}
