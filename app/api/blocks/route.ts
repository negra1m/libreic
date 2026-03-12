import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockThemes, blockTags, tags } from '@/lib/db/schema'
import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { extractMetadata } from '@/lib/metadata'
import { z } from 'zod'

const createSchema = z.object({
  title:         z.string().optional(),
  sourceUrl:     z.string().url().optional(),
  sourceType:    z.enum(['link','youtube','reel','pdf','audio','image','note','internal']).optional(),
  themeIds:      z.string().array().optional().default([]),
  tags:          z.string().array().optional().default([]),
  personalNote:  z.string().optional(),
  importance:    z.number().int().min(1).max(5).optional(),
  filePath:      z.string().optional(),
  fileName:      z.string().optional(),
  fileSizeBytes: z.number().int().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const themeId  = searchParams.get('theme')
  const status   = searchParams.get('status')
  const type     = searchParams.get('type')
  const tagName  = searchParams.get('tag')
  const due      = searchParams.get('due')
  const page     = parseInt(searchParams.get('page') ?? '1')
  const limit    = parseInt(searchParams.get('limit') ?? '24')
  const offset   = (page - 1) * limit

  const result = await db.query.blocks.findMany({
    where: (b, { and: _and, eq: _eq, lte }) => {
      const conditions = [_eq(b.userId, session.user!.id!)]
      if (status) conditions.push(_eq(b.status, status as any))
      if (type)   conditions.push(_eq(b.sourceType, type as any))
      if (due)    conditions.push(lte(b.reviewDueAt, new Date()))
      return _and(...conditions)
    },
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    limit,
    offset,
    with: {
      blockThemes: { with: { theme: true } },
      blockTags:   { with: { tag: true } },
    },
  })

  // Filtro por tema ou tag (pós-query, simples para MVP)
  let filtered = result
  if (themeId) filtered = filtered.filter(b => b.blockThemes.some(bt => bt.themeId === themeId))
  if (tagName)  filtered = filtered.filter(b => b.blockTags.some(bt => bt.tag.name === tagName))

  return NextResponse.json({ blocks: filtered, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  let { title, sourceUrl, sourceType, themeIds, tags: tagList, personalNote, importance, filePath, fileName, fileSizeBytes } = parsed.data

  // Extrai metadados se tiver URL
  let thumbnailUrl: string | null = null
  let bodyText: string | null = null
  let duration: number | null = null

  if (sourceUrl && !sourceType) {
    const meta = await extractMetadata(sourceUrl)
    title       = title || meta.title
    thumbnailUrl = meta.thumbnailUrl
    bodyText     = meta.bodyText
    sourceType   = meta.sourceType
    duration     = meta.duration
  }

  if (!title) title = sourceUrl ?? 'Sem título'
  if (!sourceType) sourceType = 'note'

  // Cria bloco
  const [block] = await db.insert(blocks).values({
    userId:       session.user.id,
    title,
    sourceUrl,
    sourceType,
    thumbnailUrl,
    bodyText,
    duration,
    personalNote,
    importance:   importance ?? 3,
    filePath,
    fileName,
    fileSizeBytes,
  }).returning()

  // Associa temas
  if (themeIds.length > 0) {
    await db.insert(blockThemes).values(
      themeIds.filter(id => id && id !== 'none').map(themeId => ({ blockId: block.id, themeId }))
    ).onConflictDoNothing()
  }

  // Cria/associa tags
  if (tagList.length > 0) {
    for (const name of tagList) {
      if (!name.trim()) continue
      const [tag] = await db
        .insert(tags)
        .values({ userId: session.user.id, name: name.trim().toLowerCase() })
        .onConflictDoUpdate({ target: [tags.userId, tags.name], set: { name: name.trim().toLowerCase() } })
        .returning({ id: tags.id })

      await db.insert(blockTags).values({ blockId: block.id, tagId: tag.id }).onConflictDoNothing()
    }
  }

  return NextResponse.json(block, { status: 201 })
}
