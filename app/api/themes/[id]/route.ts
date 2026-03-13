import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes, blockThemes, blocks } from '@/lib/db/schema'
import { and, eq, count, ne, notExists } from 'drizzle-orm'
import { z } from 'zod'
import { alias } from 'drizzle-orm/pg-core'

const updateSchema = z.object({
  name:       z.string().min(1).max(60).optional(),
  parentId:   z.string().uuid().nullable().optional(),
  icon:       z.string().optional(),
  color:      z.string().optional(),
  position:   z.number().int().optional(),
  visibility: z.enum(['public', 'private']).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [theme] = await db
    .update(themes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(themes.id, id), eq(themes.userId, session.user.id)))
    .returning()

  if (!theme) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(theme)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const userId = session.user.id

  // Verify ownership
  const theme = await db.query.themes.findFirst({ where: and(eq(themes.id, id), eq(themes.userId, userId)) })
  if (!theme) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const migrateTo = req.nextUrl.searchParams.get('migrateTo')

  if (migrateTo) {
    // Verify target theme belongs to user
    const target = await db.query.themes.findFirst({ where: and(eq(themes.id, migrateTo), eq(themes.userId, userId)) })
    if (!target) return NextResponse.json({ error: 'Target theme not found' }, { status: 404 })

    // Get all blockIds in the source theme
    const sourceLinks = await db.select({ blockId: blockThemes.blockId }).from(blockThemes).where(eq(blockThemes.themeId, id))
    const blockIds = sourceLinks.map(r => r.blockId)

    if (blockIds.length > 0) {
      // Get blockIds already in target theme (to avoid duplicates)
      const existingLinks = await db.select({ blockId: blockThemes.blockId }).from(blockThemes).where(eq(blockThemes.themeId, migrateTo))
      const alreadyInTarget = new Set(existingLinks.map(r => r.blockId))

      const toInsert = blockIds.filter(bid => !alreadyInTarget.has(bid))
      if (toInsert.length > 0) {
        await db.insert(blockThemes).values(toInsert.map(blockId => ({ blockId, themeId: migrateTo })))
      }
    }
  }

  // Delete all blockTheme links for this theme, then delete theme
  await db.delete(blockThemes).where(eq(blockThemes.themeId, id))
  await db.delete(themes).where(and(eq(themes.id, id), eq(themes.userId, userId)))

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const theme = await db.query.themes.findFirst({
    where: and(eq(themes.id, id), eq(themes.userId, session.user.id)),
    with: { children: true },
  })

  if (!theme) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(theme)
}
