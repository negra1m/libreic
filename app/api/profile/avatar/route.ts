import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const BUCKET = 'avatars'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey)
    return NextResponse.json({ error: 'Storage não configurado' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Formato não suportado (use JPG, PNG ou WebP)' }, { status: 415 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Imagem muito grande (máx. 5 MB)' }, { status: 413 })

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const storagePath = `${session.user.id}/${randomUUID()}.${ext}`
  const buffer = await file.arrayBuffer()

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: buffer,
    }
  )

  if (!uploadRes.ok) {
    console.error('Supabase avatar upload error:', await uploadRes.text())
    return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`
  await db.update(users).set({ image: publicUrl, updatedAt: new Date() }).where(eq(users.id, session.user.id))

  return NextResponse.json({ ok: true, url: publicUrl })
}
