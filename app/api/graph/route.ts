import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockConnections, blockThemes, themes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [allBlocks, connections, allBlockThemes, allThemes] = await Promise.all([
    db.select({ id: blocks.id, title: blocks.title, sourceType: blocks.sourceType, status: blocks.status, importance: blocks.importance })
      .from(blocks)
      .where(eq(blocks.userId, userId)),
    db.select({ sourceId: blockConnections.sourceId, targetId: blockConnections.targetId, relationType: blockConnections.relationType })
      .from(blockConnections)
      .innerJoin(blocks, eq(blockConnections.sourceId, blocks.id))
      .where(eq(blocks.userId, userId)),
    db.select({ blockId: blockThemes.blockId, themeId: blockThemes.themeId })
      .from(blockThemes)
      .innerJoin(blocks, eq(blockThemes.blockId, blocks.id))
      .where(eq(blocks.userId, userId)),
    db.select({ id: themes.id, name: themes.name, color: themes.color })
      .from(themes)
      .where(eq(themes.userId, userId)),
  ])

  // Mapa de temas por bloco
  const blockThemeMap = new Map<string, string[]>()
  for (const bt of allBlockThemes) {
    if (!blockThemeMap.has(bt.blockId)) blockThemeMap.set(bt.blockId, [])
    blockThemeMap.get(bt.blockId)!.push(bt.themeId)
  }

  const themeColorMap = new Map(allThemes.map(t => [t.id, t.color ?? '#6366f1']))

  // Nós: blocos + temas
  const nodes = [
    // Nós de tema (maiores)
    ...allThemes.map(t => ({
      id:   `theme_${t.id}`,
      type: 'theme',
      data: { label: t.name, color: t.color ?? '#6366f1' },
    })),
    // Nós de bloco
    ...allBlocks.map(b => {
      const themeIds = blockThemeMap.get(b.id) ?? []
      const color = themeIds.length > 0 ? (themeColorMap.get(themeIds[0]) ?? '#6366f1') : '#94a3b8'
      return {
        id:   b.id,
        type: 'block',
        data: { label: b.title, sourceType: b.sourceType, status: b.status, importance: b.importance, color },
      }
    }),
  ]

  // Arestas: bloco→tema + conexões entre blocos
  const edges = [
    // Bloco pertence a tema
    ...allBlockThemes.map((bt, i) => ({
      id:     `bt_${i}`,
      source: bt.blockId,
      target: `theme_${bt.themeId}`,
      type:   'theme',
    })),
    // Conexões explícitas
    ...connections.map((c, i) => ({
      id:           `conn_${i}`,
      source:       c.sourceId,
      target:       c.targetId,
      label:        c.relationType,
      type:         'connection',
    })),
  ]

  return NextResponse.json({ nodes, edges, themes: allThemes })
}
