import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { collectionInvites, collectionMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Login necessário' }, { status: 401 })
  const { token } = await params

  const [invite] = await db.select().from(collectionInvites)
    .where(eq(collectionInvites.token, token))
    .limit(1)

  if (!invite) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Convite expirado' }, { status: 410 })

  const [existing] = await db.select().from(collectionMembers)
    .where(and(eq(collectionMembers.collectionId, invite.collectionId), eq(collectionMembers.userId, session.user.id)))
    .limit(1)

  if (!existing) {
    await db.insert(collectionMembers).values({
      collectionId: invite.collectionId,
      userId: session.user.id,
      role: invite.role,
      invitedBy: invite.invitedBy,
    })
  }

  if (!invite.acceptedAt) {
    await db.update(collectionInvites).set({ acceptedAt: new Date() }).where(eq(collectionInvites.id, invite.id))
  }

  return NextResponse.json({ ok: true, collectionId: invite.collectionId })
}
