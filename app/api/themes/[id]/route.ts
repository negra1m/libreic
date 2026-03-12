import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes, blockThemes, blocks } from '@/lib/db/schema'
import { and, eq, count } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  name:     z.string().min(1).max(60).optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon:     z.string().optional(),
  color:    z.string().optional(),
  position: z.number().int().optional(),
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

  await db.delete(themes).where(and(eq(themes.id, id), eq(themes.userId, session.user.id)))
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
