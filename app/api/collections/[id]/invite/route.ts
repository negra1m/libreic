import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { collections, collectionMembers, collectionInvites, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { z } from 'zod'

async function isOwnerOrEditor(userId: string, collectionId: string) {
  const [col] = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1)
  if (!col) return false
  if (col.userId === userId) return true
  const [mem] = await db.select().from(collectionMembers)
    .where(and(eq(collectionMembers.collectionId, collectionId), eq(collectionMembers.userId, userId)))
    .limit(1)
  return mem?.role === 'editor' || mem?.role === 'owner'
}

// POST — gerar link de convite
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  if (!(await isOwnerOrEditor(session.user.id, id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { role = 'editor' } = await req.json().catch(() => ({}))
  const token = randomBytes(20).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

  const [invite] = await db.insert(collectionInvites).values({
    collectionId: id,
    invitedBy: session.user.id,
    token,
    role,
    expiresAt,
  }).returning()

  return NextResponse.json({ token: invite.token, expiresAt: invite.expiresAt })
}

// GET /api/collections/[id]/invite?token=xxx — aceitar convite
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const [invite] = await db.select().from(collectionInvites)
    .where(and(eq(collectionInvites.token, token), eq(collectionInvites.collectionId, id)))
    .limit(1)

  if (!invite) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Convite expirado' }, { status: 410 })
  if (invite.acceptedAt) return NextResponse.json({ error: 'Convite já usado' }, { status: 409 })

  // Verificar se já é membro
  const [existing] = await db.select().from(collectionMembers)
    .where(and(eq(collectionMembers.collectionId, id), eq(collectionMembers.userId, session.user.id)))
    .limit(1)

  if (!existing) {
    await db.insert(collectionMembers).values({
      collectionId: id,
      userId: session.user.id,
      role: invite.role,
      invitedBy: invite.invitedBy,
    })
  }

  await db.update(collectionInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(collectionInvites.id, invite.id))

  return NextResponse.json({ ok: true, collectionId: id })
}
