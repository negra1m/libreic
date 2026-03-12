import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'

// GET /api/profile/username?q=kevin — verifica disponibilidade
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().toLowerCase()
  if (!q) return NextResponse.json({ available: false })

  const [existing] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.username, q), ne(users.id, session.user.id)))
    .limit(1)

  return NextResponse.json({ available: !existing })
}

// PATCH /api/profile — atualiza nome e/ou username
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, username, claudeApiKey } = body as { name?: string; username?: string; claudeApiKey?: string | null }

  const updates: Partial<typeof users.$inferInsert> = {}

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: 'Nome não pode ser vazio' }, { status: 400 })
    updates.name = name.trim()
  }

  if (username !== undefined) {
    const u = username.trim().toLowerCase()
    if (u) {
      if (!/^[a-z0-9_]{3,20}$/.test(u))
        return NextResponse.json({ error: 'Username deve ter 3–20 caracteres (letras, números, _)' }, { status: 400 })

      const [existing] = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.username, u), ne(users.id, session.user.id)))
        .limit(1)
      if (existing) return NextResponse.json({ error: 'Username já está em uso' }, { status: 409 })
    }
    updates.username = u || null
  }

  if (claudeApiKey !== undefined) {
    updates.claudeApiKey = claudeApiKey ?? null
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })

  updates.updatedAt = new Date()
  await db.update(users).set(updates).where(eq(users.id, session.user.id))

  return NextResponse.json({ ok: true })
}
