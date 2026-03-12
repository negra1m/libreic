import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themeInvites, themeMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Login necessário' }, { status: 401 })
  const { token } = await params

  const [invite] = await db.select().from(themeInvites)
    .where(eq(themeInvites.token, token))
    .limit(1)

  if (!invite) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Convite expirado' }, { status: 410 })

  const [existing] = await db.select().from(themeMembers)
    .where(and(eq(themeMembers.themeId, invite.themeId), eq(themeMembers.userId, session.user.id)))
    .limit(1)

  if (!existing) {
    await db.insert(themeMembers).values({
      themeId: invite.themeId,
      userId: session.user.id,
      role: invite.role,
      invitedBy: invite.invitedBy,
    })
  }

  if (!invite.acceptedAt) {
    await db.update(themeInvites).set({ acceptedAt: new Date() }).where(eq(themeInvites.id, invite.id))
  }

  return NextResponse.json({ ok: true, themeId: invite.themeId })
}
