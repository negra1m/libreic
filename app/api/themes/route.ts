import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  name:     z.string().min(1).max(60),
  parentId: z.string().uuid().optional().nullable(),
  icon:     z.string().optional(),
  color:    z.string().optional(),
  position: z.number().int().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = await db.query.themes.findMany({
    where: eq(themes.userId, session.user.id),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.name)],
  })

  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [theme] = await db
    .insert(themes)
    .values({ userId: session.user.id, ...parsed.data })
    .returning()

  return NextResponse.json(theme, { status: 201 })
}
