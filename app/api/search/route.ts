import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q       = searchParams.get('q')?.trim()
  const theme   = searchParams.get('theme')
  const type    = searchParams.get('type')
  const status  = searchParams.get('status')
  const tag     = searchParams.get('tag')
  const page    = parseInt(searchParams.get('page') ?? '1')
  const limit   = parseInt(searchParams.get('limit') ?? '20')
  const offset  = (page - 1) * limit

  const userId = session.user.id

  const result = await db.execute(sql`
    SELECT
      b.id, b.title, b.source_url, b.source_type, b.thumbnail_url,
      b.status, b.importance, b.personal_note, b.created_at, b.updated_at,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('theme', jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)))
        FILTER (WHERE t.id IS NOT NULL), '[]'
      ) AS "blockThemes",
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('tag', jsonb_build_object('name', tg.name)))
        FILTER (WHERE tg.id IS NOT NULL), '[]'
      ) AS "blockTags",
      ${q ? sql`ts_rank(
        to_tsvector('portuguese',
          coalesce(b.title,'') || ' ' ||
          coalesce(b.body_text,'') || ' ' ||
          coalesce(b.personal_note,'') || ' ' ||
          coalesce(b.summary,'')
        ),
        plainto_tsquery('portuguese', ${q})
      )` : sql`0`} AS rank
    FROM blocks b
    LEFT JOIN block_themes bt ON bt.block_id = b.id
    LEFT JOIN themes t ON t.id = bt.theme_id
    LEFT JOIN block_tags btg ON btg.block_id = b.id
    LEFT JOIN tags tg ON tg.id = btg.tag_id
    WHERE b.user_id = ${userId}
      AND (${q ? sql`(
        to_tsvector('portuguese',
          coalesce(b.title,'') || ' ' ||
          coalesce(b.body_text,'') || ' ' ||
          coalesce(b.personal_note,'') || ' ' ||
          coalesce(b.summary,'')
        ) @@ plainto_tsquery('portuguese', ${q})
        OR b.title ILIKE ${'%' + (q ?? '') + '%'}
        OR EXISTS (
          SELECT 1 FROM block_tags btg2
          JOIN tags tg2 ON tg2.id = btg2.tag_id
          WHERE btg2.block_id = b.id AND tg2.name ILIKE ${'%' + (q ?? '') + '%'}
        )
        OR EXISTS (
          SELECT 1 FROM block_themes bt2
          JOIN themes t2 ON t2.id = bt2.theme_id
          WHERE bt2.block_id = b.id AND t2.name ILIKE ${'%' + (q ?? '') + '%'}
        )
      )` : sql`true`})
      AND (${theme ? sql`bt.theme_id = ${theme}` : sql`true`})
      AND (${type   ? sql`b.source_type = ${type}::source_type` : sql`true`})
      AND (${status ? sql`b.status = ${status}::status` : sql`true`})
      AND (${tag    ? sql`tg.name = ${tag}` : sql`true`})
    GROUP BY b.id
    ORDER BY rank DESC, b.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `)

  // Search users by name/username (only when a query is provided)
  let users: any[] = []
  if (q) {
    const userRows = await db.execute(sql`
      SELECT
        u.id, u.name, u.username, u.image,
        COUNT(DISTINCT b.id) AS "publicCount"
      FROM users u
      LEFT JOIN blocks b ON b.user_id = u.id AND b.is_public = true
      WHERE u.id != ${userId}
        AND (
          u.name ILIKE ${'%' + q + '%'}
          OR u.username ILIKE ${'%' + q + '%'}
          OR u.email ILIKE ${'%' + q + '%'}
        )
      GROUP BY u.id, u.name, u.username, u.image
      ORDER BY u.name
      LIMIT 5
    `)
    users = userRows as any[]
  }

  return NextResponse.json({ results: result, users, page, limit })
}
