import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { themes, themeMembers } from '@/lib/db/schema'
import { eq, or, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  name:       z.string().min(1).max(60),
  parentId:   z.string().uuid().optional().nullable(),
  icon:       z.string().optional(),
  color:      z.string().optional(),
  position:   z.number().int().optional(),
  visibility: z.enum(['public', 'private']).optional().default('public'),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  // Themes I own
  const owned = await db.query.themes.findMany({
    where: eq(themes.userId, userId),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.name)],
  })

  // Private themes I'm a member of (but don't own)
  const memberships = await db.select({ themeId: themeMembers.themeId })
    .from(themeMembers)
    .where(eq(themeMembers.userId, userId))

  const memberThemeIds = memberships.map(m => m.themeId).filter(id => !owned.find(t => t.id === id))

  let sharedThemes: typeof owned = []
  if (memberThemeIds.length > 0) {
    sharedThemes = await db.query.themes.findMany({
      where: inArray(themes.id, memberThemeIds),
      orderBy: (t, { asc }) => [asc(t.name)],
    })
  }

  return NextResponse.json([...owned, ...sharedThemes])
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
