import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 })

  // Busca full-text nos blocos do usuário (RAG simples)
  const relevant = await db.execute(sql`
    SELECT b.title, b.body_text, b.personal_note, b.summary, b.main_insight, b.source_url,
      ts_rank(
        to_tsvector('portuguese', coalesce(b.title,'') || ' ' || coalesce(b.body_text,'') || ' ' || coalesce(b.personal_note,'') || ' ' || coalesce(b.summary,'')),
        plainto_tsquery('portuguese', ${question})
      ) AS rank
    FROM blocks b
    WHERE b.user_id = ${session.user.id}
      AND to_tsvector('portuguese', coalesce(b.title,'') || ' ' || coalesce(b.body_text,'') || ' ' || coalesce(b.personal_note,'') || ' ' || coalesce(b.summary,''))
          @@ plainto_tsquery('portuguese', ${question})
    ORDER BY rank DESC
    LIMIT 8
  `)

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
