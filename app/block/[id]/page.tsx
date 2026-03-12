import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { BlockDetail } from '@/components/blocks/BlockDetail'

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  const block = await db.query.blocks.findFirst({
    where: and(eq(blocks.id, id), eq(blocks.userId, session!.user!.id!)),
    with: {
      blockThemes:       { with: { theme: true } },
      blockTags:         { with: { tag: true } },
      sourceConnections: { with: { target: { columns: { id: true, title: true, sourceType: true, thumbnailUrl: true, status: true } } } },
      targetConnections: { with: { source: { columns: { id: true, title: true, sourceType: true, thumbnailUrl: true, status: true } } } },
    },
  })

  if (!block) notFound()

  // Temas disponíveis para edição
  const allThemes = await db.query.themes.findMany({
    where: eq(blocks.userId, session!.user!.id!),
    orderBy: (t, { asc }) => [asc(t.name)],
  })

  return <BlockDetail block={block as any} allThemes={allThemes as any} />
}
