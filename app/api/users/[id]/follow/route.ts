import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { follows } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (id === session.user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  await db.insert(follows)
    .values({ followerId: session.user.id, followingId: id })
    .onConflictDoNothing()

  return NextResponse.json({ ok: true, following: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  await db.delete(follows)
    .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, id)))

  return NextResponse.json({ ok: true, following: false })
}
