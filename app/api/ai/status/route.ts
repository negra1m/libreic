import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ available: false, reason: 'unauthenticated' })

  const [userData] = await db.select({ claudeApiKey: users.claudeApiKey })
    .from(users).where(eq(users.id, session.user.id)).limit(1)

  const apiKey = userData?.claudeApiKey ?? process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json({ available: false, reason: 'no_key' })
  }

  return NextResponse.json({ available: true })
}
