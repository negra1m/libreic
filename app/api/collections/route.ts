import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { collections, collectionBlocks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  isPublic:    z.boolean().optional().default(false),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.query.collections.findMany({
    where: eq(collections.userId, session.user.id),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
    with: {
      collectionBlocks: {
        with: { block: { columns: { id: true, title: true, thumbnailUrl: true, sourceType: true } } },
        orderBy: (cb, { asc }) => [asc(cb.position)],
      },
    },
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [col] = await db
    .insert(collections)
    .values({ userId: session.user.id, ...parsed.data })
    .returning()

  return NextResponse.json(col, { status: 201 })
}
