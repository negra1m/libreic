import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tags, blockTags } from '@/lib/db/schema'
import { eq, sql, count } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db
    .select({
      id:    tags.id,
      name:  tags.name,
      count: count(blockTags.blockId),
    })
    .from(tags)
    .leftJoin(blockTags, eq(blockTags.tagId, tags.id))
    .where(eq(tags.userId, session.user.id))
    .groupBy(tags.id, tags.name)
    .orderBy(sql`count(${blockTags.blockId}) desc`)

  return NextResponse.json(result)
}
