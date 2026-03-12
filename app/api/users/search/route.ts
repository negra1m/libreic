import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, follows } from '@/lib/db/schema'
import { ilike, or, ne, eq, and, inArray } from 'drizzle-orm'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const userId = session.user.id

  const foundUsers = await db
    .select({ id: users.id, name: users.name, image: users.image, username: users.username })
    .from(users)
    .where(and(
      ne(users.id, userId),
      or(
        ilike(users.name, `%${q}%`),
        ilike(users.username, `%${q}%`),
      ),
    ))
    .limit(10)

  if (foundUsers.length === 0) return NextResponse.json([])

  const followingRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(
      eq(follows.followerId, userId),
      inArray(follows.followingId, foundUsers.map(u => u.id)),
    ))

  const followingSet = new Set(followingRows.map(f => f.followingId))

  return NextResponse.json(
    foundUsers.map(u => ({ ...u, isFollowing: followingSet.has(u.id) }))
  )
}
