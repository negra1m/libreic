import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockThemes, blockTags, tags } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  title:        z.string().optional(),
  personalNote: z.string().optional(),
  summary:      z.string().optional(),
  mainInsight:  z.string().optional(),
  actionItem:   z.string().optional(),
  importance:   z.number().int().min(1).max(5).optional(),
  themeIds:     z.string().array().optional(),
  tags:         z.string().array().optional(),
}).partial()

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const block = await db.query.blocks.findFirst({
    where: and(eq(blocks.id, id), eq(blocks.userId, session.user.id)),
    with: {
      blockThemes:       { with: { theme: true } },
      blockTags:         { with: { tag: true } },
      sourceConnections: { with: { target: { columns: { id: true, title: true, sourceType: true, thumbnailUrl: true } } } },
      targetConnections: { with: { source: { columns: { id: true, title: true, sourceType: true, thumbnailUrl: true } } } },
    },
  })

  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(block)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { themeIds, tags: tagList, ...rest } = parsed.data

  // Atualiza campos do bloco
  const [block] = await db
    .update(blocks)
    .set({ ...rest, updatedAt: new Date() })
    .where(and(eq(blocks.id, id), eq(blocks.userId, session.user.id)))
    .returning()

  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Atualiza temas se enviados
  if (themeIds !== undefined) {
    await db.delete(blockThemes).where(eq(blockThemes.blockId, id))
    if (themeIds.length > 0) {
      await db.insert(blockThemes).values(
        themeIds.filter(t => t && t !== 'none').map(themeId => ({ blockId: id, themeId }))
      ).onConflictDoNothing()
    }
  }

  // Atualiza tags se enviadas
  if (tagList !== undefined) {
    await db.delete(blockTags).where(eq(blockTags.blockId, id))
    for (const name of tagList) {
      if (!name.trim()) continue
      const [tag] = await db
        .insert(tags)
        .values({ userId: session.user.id, name: name.trim().toLowerCase() })
        .onConflictDoUpdate({ target: [tags.userId, tags.name], set: { name: name.trim().toLowerCase() } })
        .returning({ id: tags.id })
      await db.insert(blockTags).values({ blockId: id, tagId: tag.id }).onConflictDoNothing()
    }
  }

  return NextResponse.json(block)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  await db.delete(blocks).where(and(eq(blocks.id, id), eq(blocks.userId, session.user.id)))
  return NextResponse.json({ ok: true })
}
