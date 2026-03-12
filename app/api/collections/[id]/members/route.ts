import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { collections, collectionMembers, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function assertAccess(userId: string, collectionId: string, minRole: 'viewer' | 'editor' | 'owner' = 'viewer') {
  const col = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1)
  if (!col[0]) return null
  if (col[0].userId === userId) return 'owner'
  const [mem] = await db.select().from(collectionMembers)
    .where(and(eq(collectionMembers.collectionId, collectionId), eq(collectionMembers.userId, userId)))
    .limit(1)
  if (!mem) return null
  const order = { viewer: 0, editor: 1, owner: 2 }
  if (order[mem.role as keyof typeof order] < order[minRole]) return null
  return mem.role
}

// GET /api/collections/[id]/members
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const role = await assertAccess(session.user.id, id)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image, username: users.username, role: collectionMembers.role })
    .from(collectionMembers)
    .innerJoin(users, eq(collectionMembers.userId, users.id))
    .where(eq(collectionMembers.collectionId, id))

  return NextResponse.json(members)
}

// DELETE /api/collections/[id]/members — remove a si mesmo
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  await db.delete(collectionMembers)
    .where(and(eq(collectionMembers.collectionId, id), eq(collectionMembers.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
