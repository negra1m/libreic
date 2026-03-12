import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { collections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { CollectionsManager } from '@/components/blocks/CollectionsManager'

export default async function CollectionsPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const cols = await db.query.collections.findMany({
    where: eq(collections.userId, userId),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
    with: {
      collectionBlocks: {
        with: {
          block: {
            columns: { id: true, title: true, thumbnailUrl: true, sourceType: true, status: true },
          },
        },
        orderBy: (cb, { asc }) => [asc(cb.position)],
      },
    },
  })

  return <CollectionsManager collections={cols as any} />
}
