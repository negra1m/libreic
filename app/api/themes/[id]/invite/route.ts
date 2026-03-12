import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes, themeMembers, themeInvites } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'crypto'

async function isOwner(userId: string, themeId: string) {
  const [t] = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1)
  return t?.userId === userId
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  if (!(await isOwner(session.user.id, id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = randomBytes(20).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

  const [invite] = await db.insert(themeInvites).values({
    themeId: id,
    invitedBy: session.user.id,
    token,
    role: 'member',
    expiresAt,
  }).returning()

  return NextResponse.json({ token: invite.token, expiresAt: invite.expiresAt })
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const members = await db.query.themeMembers.findMany({
    where: eq(themeMembers.themeId, id),
    with: { user: { columns: { id: true, name: true, image: true, username: true } } },
  })

  return NextResponse.json(members)
}
