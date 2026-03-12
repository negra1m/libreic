import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { randomUUID } from 'crypto'

const BUCKET = 'blocks'
const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB por arquivo

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg':      'image',
  'image/png':       'image',
  'image/webp':      'image',
  'image/gif':       'image',
  'audio/mpeg':      'audio',
  'audio/mp3':       'audio',
  'audio/wav':       'audio',
  'audio/ogg':       'audio',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey)
    return NextResponse.json({ error: 'Storage nao configurado' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const sourceType = ALLOWED_TYPES[file.type]
  if (!sourceType) return NextResponse.json({ error: 'Tipo de arquivo nao suportado' }, { status: 415 })
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: 'Arquivo muito grande (max. 50 MB)' }, { status: 413 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = session.user.id + '/' + randomUUID() + '.' + ext

  const buffer = await file.arrayBuffer()

  const uploadRes = await fetch(
    supabaseUrl + '/storage/v1/object/' + BUCKET + '/' + storagePath,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: buffer,
    }
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    console.error('Supabase storage error:', err)
    return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
  }

  const publicUrl = supabaseUrl + '/storage/v1/object/public/' + BUCKET + '/' + storagePath

  return NextResponse.json({
    filePath: storagePath,
    publicUrl,
    fileName: file.name,
    fileSizeBytes: file.size,
    sourceType,
  })
}
