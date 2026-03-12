import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blockConnections, blocks } from '@/lib/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  targetId:     z.string().uuid(),
  relationType: z.enum(['complementa','aprofunda','originou','contradiz','generaliza']).default('complementa'),
  note:         z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (parsed.data.targetId === id) return NextResponse.json({ error: 'Não pode conectar a si mesmo' }, { status: 422 })

  const [conn] = await db
    .insert(blockConnections)
    .values({ sourceId: id, ...parsed.data })
    .returning()

  return NextResponse.json(conn, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { connId } = await req.json()

  await db.delete(blockConnections).where(eq(blockConnections.id, connId))
  return NextResponse.json({ ok: true })
}
