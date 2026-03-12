import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { collections, collectionBlocks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const [col] = await db
    .update(collections)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(collections.id, id), eq(collections.userId, session.user.id)))
    .returning()

  return NextResponse.json(col)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  await db.delete(collections).where(and(eq(collections.id, id), eq(collections.userId, session.user.id)))
  return NextResponse.json({ ok: true })
}

// Adicionar/remover bloco de coleção
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { blockId, position = 0, remove } = await req.json()

  if (remove) {
    await db.delete(collectionBlocks).where(
      and(eq(collectionBlocks.collectionId, id), eq(collectionBlocks.blockId, blockId))
    )
  } else {
    await db.insert(collectionBlocks).values({ collectionId: id, blockId, position }).onConflictDoNothing()
  }

  return NextResponse.json({ ok: true })
}
