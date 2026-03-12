import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, users, blockTags, tags as tagsTable, blockThemes, themes } from '@/lib/db/schema'
import { eq, and, or, ilike, inArray } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 })

  // Usa chave do usuário (BYOK) ou fallback para env
  const [userData] = await db.select({ claudeApiKey: users.claudeApiKey })
    .from(users).where(eq(users.id, session.user.id)).limit(1)
  const apiKey = userData?.claudeApiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'no_key' }, { status: 402 })

  const client = new Anthropic({ apiKey })

  const userId = session.user.id

  // 1. Tenta full-text search (PostgreSQL tsvector)
  let relevant = await db.execute(`
    SELECT b.id, b.title, b.body_text, b.personal_note, b.summary, b.main_insight, b.source_url,
      ts_rank(
        to_tsvector('portuguese', coalesce(b.title,'') || ' ' || coalesce(b.body_text,'') || ' ' || coalesce(b.personal_note,'') || ' ' || coalesce(b.summary,'')),
        plainto_tsquery('portuguese', ${question})
      ) AS rank
    FROM blocks b
    WHERE b.user_id = ${userId}
      AND to_tsvector('portuguese', coalesce(b.title,'') || ' ' || coalesce(b.body_text,'') || ' ' || coalesce(b.personal_note,'') || ' ' || coalesce(b.summary,''))
          @@ plainto_tsquery('portuguese', ${question})
    ORDER BY rank DESC
    LIMIT 8
  `) as any[]

  // 2. Se FTS não retornou nada, fallback para ILIKE nos campos + tags + temas
  if (relevant.length === 0) {
    const terms = question.trim().split(/\s+/).filter(Boolean)
    const pattern = `%${terms.join('%')}%`

    // Busca por ILIKE nos campos de texto
    const fuzzyBlocks = await db
      .select({
        id: blocks.id,
        title: blocks.title,
        bodyText: blocks.bodyText,
        personalNote: blocks.personalNote,
        summary: blocks.summary,
        mainInsight: blocks.mainInsight,
        sourceUrl: blocks.sourceUrl,
      })
      .from(blocks)
      .where(and(
        eq(blocks.userId, userId),
        or(
          ilike(blocks.title, pattern),
          ilike(blocks.bodyText, `%${terms[0]}%`),
          ilike(blocks.personalNote, `%${terms[0]}%`),
          ilike(blocks.summary, `%${terms[0]}%`),
        )
      ))
      .limit(8)

    // Também busca via tags
    const tagMatches = await db
      .select({ blockId: blockTags.blockId })
      .from(blockTags)
      .innerJoin(tagsTable, eq(blockTags.tagId, tagsTable.id))
      .innerJoin(blocks, eq(blockTags.blockId, blocks.id))
      .where(and(
        eq(blocks.userId, userId),
        ilike(tagsTable.name, `%${terms[0]}%`),
      ))
      .limit(8)

    // Também busca via temas
    const themeMatches = await db
      .select({ blockId: blockThemes.blockId })
      .from(blockThemes)
      .innerJoin(themes, eq(blockThemes.themeId, themes.id))
      .innerJoin(blocks, eq(blockThemes.blockId, blocks.id))
      .where(and(
        eq(blocks.userId, userId),
        ilike(themes.name, `%${terms[0]}%`),
      ))
      .limit(8)

    const extraIds = new Set([
      ...tagMatches.map(r => r.blockId),
      ...themeMatches.map(r => r.blockId),
    ])
    const alreadyIds = new Set(fuzzyBlocks.map(b => b.id))

    const filteredExtraIds = [...extraIds].filter(id => !alreadyIds.has(id))
    const extraBlocks = filteredExtraIds.length > 0
      ? await db.select({
          id: blocks.id,
          title: blocks.title,
          bodyText: blocks.bodyText,
          personalNote: blocks.personalNote,
          summary: blocks.summary,
          mainInsight: blocks.mainInsight,
          sourceUrl: blocks.sourceUrl,
        }).from(blocks).where(and(
          eq(blocks.userId, userId),
          inArray(blocks.id, filteredExtraIds)
        )).limit(4)
      : []

    relevant = [...fuzzyBlocks, ...extraBlocks].map(b => ({
      title: b.title,
      body_text: b.bodyText,
      personal_note: b.personalNote,
      summary: b.summary,
      main_insight: b.mainInsight,
      source_url: b.sourceUrl,
    }))
  }

  const context = (relevant as any[]).map((b, i) =>
    `[${i + 1}] ${b.title}\n${[b.summary, b.main_insight, b.personal_note, b.body_text].filter(Boolean).join(' | ').slice(0, 400)}`
  ).join('\n\n')

  if (!context) {
    return NextResponse.json({
      answer: 'Não encontrei conteúdo relevante na sua biblioteca para responder essa pergunta. Tente salvar mais conteúdo sobre o tema.',
      sources: [],
    })
  }

  const message = await client.messages.create({
    model:      'claude-opus-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Você é um assistente que responde perguntas com base na biblioteca pessoal de conhecimento do usuário.

Use APENAS as informações abaixo para responder. Se a resposta não estiver nos conteúdos, diga claramente que não encontrou.

CONTEÚDOS DA BIBLIOTECA:
${context}

PERGUNTA: ${question}

Responda de forma direta e útil, citando os números dos itens quando relevante (ex: "Conforme [1]...").`,
    }],
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({
    answer,
    sources: (relevant as any[]).map(b => ({ title: b.title, url: b.source_url })),
  })
}
