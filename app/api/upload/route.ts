import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadFile, ALLOWED_TYPES, MAX_FILE_SIZE } from '@/lib/storage'
import { db } from '@/lib/db'
import { blocks, blockThemes, tags, blockTags } from '@/lib/db/schema'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const themeId = form.get('themeId') as string | null
  const tagList = (form.get('tags') as string | null)?.split(',').map(t => t.trim()).filter(Boolean) ?? []
  const note = form.get('personalNote') as string | null

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Arquivo maior que 50MB' }, { status: 413 })

  const sourceTypeLabel = ALLOWED_TYPES[file.type]
  if (!sourceTypeLabel) return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 415 })

  const ext = file.name.split('.').pop()
  const key = `uploads/${session.user.id}/${randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileUrl = await uploadFile(key, buffer, file.type)

  const [block] = await db.insert(blocks).values({
    userId:       session.user.id,
    title:        file.name.replace(/\.[^.]+$/, ''),
    sourceType:   sourceTypeLabel as any,
    filePath:     fileUrl,
    fileName:     file.name,
    fileSizeBytes: file.size,
    personalNote: note ?? undefined,
  }).returning()

  if (themeId && themeId !== 'none') {
    await db.insert(blockThemes).values({ blockId: block.id, themeId }).onConflictDoNothing()
  }

  for (const name of tagList) {
    const [tag] = await db
      .insert(tags)
      .values({ userId: session.user.id, name: name.toLowerCase() })
      .onConflictDoUpdate({ target: [tags.userId, tags.name], set: { name: name.toLowerCase() } })
      .returning({ id: tags.id })
    await db.insert(blockTags).values({ blockId: block.id, tagId: tag.id }).onConflictDoNothing()
  }

  return NextResponse.json(block, { status: 201 })
}
