import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { blockId } = await req.json()

  const block = await db.query.blocks.findFirst({
    where: and(eq(blocks.id, blockId), eq(blocks.userId, session.user.id)),
  })

  if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const content = [
    block.title && `Título: ${block.title}`,
    block.sourceUrl && `URL: ${block.sourceUrl}`,
    block.bodyText && `Conteúdo: ${block.bodyText}`,
    block.personalNote && `Nota pessoal: ${block.personalNote}`,
  ].filter(Boolean).join('\n\n')

  if (!content.trim()) {
    return NextResponse.json({ error: 'Bloco sem conteúdo suficiente para resumir' }, { status: 422 })
  }

  const message = await client.messages.create({
    model:      'claude-opus-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Você é um assistente de organização de conhecimento pessoal.

Analise o seguinte conteúdo salvo e gere:
1. **Resumo** (2-3 frases objetivas do que é o conteúdo)
2. **Insight principal** (a ideia mais valiosa ou acionável)
3. **Ação prática** (o que o usuário pode fazer com isso)

Responda em JSON:
{
  "summary": "...",
  "mainInsight": "...",
  "actionItem": "..."
}

Conteúdo:
${content}`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const parsed = JSON.parse(jsonMatch[0])

    // Salva no bloco
    await db
      .update(blocks)
      .set({
        summary:     parsed.summary,
        mainInsight: parsed.mainInsight,
        actionItem:  parsed.actionItem,
        updatedAt:   new Date(),
      })
      .where(eq(blocks.id, blockId))

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Falha ao parsear resposta da IA', raw: text }, { status: 500 })
  }
}
