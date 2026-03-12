import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword: string
    newPassword: string
  }

  if (!newPassword || newPassword.length < 6)
    return NextResponse.json({ error: 'Nova senha deve ter pelo menos 6 caracteres' }, { status: 400 })

  const [user] = await db.select({ password: users.password }).from(users)
    .where(eq(users.id, session.user.id)).limit(1)

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  if (user.password) {
    if (!currentPassword)
      return NextResponse.json({ error: 'Informe a senha atual' }, { status: 400 })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await db.update(users).set({ password: hashed, updatedAt: new Date() }).where(eq(users.id, session.user.id))

  return NextResponse.json({ ok: true })
}
