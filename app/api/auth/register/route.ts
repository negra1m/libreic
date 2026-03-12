import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { name, email, password } = parsed.data

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })

  const hash = await bcrypt.hash(password, 10)
  const [user] = await db.insert(users).values({ name, email, password: hash }).returning({ id: users.id })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
