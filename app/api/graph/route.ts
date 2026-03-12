import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockConnections, blockThemes, themes, blockTags, tags } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [allBlocks, connections, allBlockThemes, allThemes, allBlockTags] = await Promise.all([
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
    db.select({ blockId: blockTags.blockId, tagName: tags.name })
      .from(blockTags)
      .innerJoin(tags, eq(blockTags.tagId, tags.id))
      .innerJoin(blocks, eq(blockTags.blockId, blocks.id))
      .where(eq(blocks.userId, userId)),
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

  // Mapa tag por bloco
  const blockTagMap = new Map<string, Set<string>>()
  for (const bt of allBlockTags) {
    if (!blockTagMap.has(bt.blockId)) blockTagMap.set(bt.blockId, new Set())
    blockTagMap.get(bt.blockId)!.add(bt.tagName)
  }

  // Para cada tema, acumula o conjunto de tags de todos os seus blocos
  const themeTagMap = new Map<string, Set<string>>()
  for (const bt of allBlockThemes) {
    const tagSet = blockTagMap.get(bt.blockId) ?? new Set<string>()
    if (!themeTagMap.has(bt.themeId)) themeTagMap.set(bt.themeId, new Set())
    for (const tag of tagSet) themeTagMap.get(bt.themeId)!.add(tag)
  }

  // Arestas tema↔tema quando compartilham ao menos 1 tag
  const themeIds = allThemes.map(t => t.id)
  const themeOverlapEdges: any[] = []
  for (let i = 0; i < themeIds.length; i++) {
    for (let j = i + 1; j < themeIds.length; j++) {
      const tagsA = themeTagMap.get(themeIds[i]) ?? new Set<string>()
      const tagsB = themeTagMap.get(themeIds[j]) ?? new Set<string>()
      const shared = [...tagsA].filter(t => tagsB.has(t))
      if (shared.length > 0) {
        themeOverlapEdges.push({
          id:     `toverlap_${i}_${j}`,
          source: `theme_${themeIds[i]}`,
          target: `theme_${themeIds[j]}`,
          // relationType em data — não usar type customizado no React Flow
          data:   { relationType: 'theme-overlap', sharedTags: shared.slice(0, 2) },
          label:  shared.slice(0, 2).join(', '),
        })
      }
    }
  }

  // Arestas bloco↔bloco implícitas via tags compartilhadas
  const blockIds = allBlocks.map(b => b.id)
  const tagBlockEdges: any[] = []
  const tagBlockPairs = new Set<string>() // evita duplicatas
  for (let i = 0; i < blockIds.length; i++) {
    for (let j = i + 1; j < blockIds.length; j++) {
      const tagsA = blockTagMap.get(blockIds[i]) ?? new Set<string>()
      const tagsB = blockTagMap.get(blockIds[j]) ?? new Set<string>()
      const shared = [...tagsA].filter(t => tagsB.has(t))
      if (shared.length > 0) {
        const pairKey = `${blockIds[i]}__${blockIds[j]}`
        if (!tagBlockPairs.has(pairKey)) {
          tagBlockPairs.add(pairKey)
          tagBlockEdges.push({
            id:     `tagconn_${i}_${j}`,
            source: blockIds[i],
            target: blockIds[j],
            label:  shared.slice(0, 2).join(', '),
            data:   { relationType: 'tag-connection', sharedTags: shared.slice(0, 2) },
          })
        }
      }
    }
  }

  // Arestas: bloco→tema + conexões entre blocos + sobreposição de temas + tag-connection
  const edges = [
    ...allBlockThemes.map((bt, i) => ({
      id:     `bt_${i}`,
      source: bt.blockId,
      target: `theme_${bt.themeId}`,
      data:   { relationType: 'theme' },
    })),
    ...connections.map((c, i) => ({
      id:     `conn_${i}`,
      source: c.sourceId,
      target: c.targetId,
      label:  c.relationType,
      data:   { relationType: 'connection' },
    })),
    ...themeOverlapEdges,
    ...tagBlockEdges,
  ]

  return NextResponse.json({ nodes, edges, themes: allThemes })
}
