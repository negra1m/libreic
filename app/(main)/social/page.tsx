import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks, blockThemes, themes, users } from '@/lib/db/schema'
import { eq, and, ne, count, sql, inArray } from 'drizzle-orm'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Layers, BookOpen, Hash } from 'lucide-react'
import { UserSearch } from './UserSearch'

export default async function SocialPage() {
  const session = await auth()
  const userId = session!.user!.id!

  // Temas do usuário atual
  const myThemes = await db
    .select({ id: themes.id, name: themes.name, color: themes.color })
    .from(themes)
    .where(eq(themes.userId, userId))

  const myThemeNames = myThemes.map(t => t.name.toLowerCase())

  // Pessoas que estudam temas parecidos (mesmo nome de tema)
  let similarPeople: {
    userId: string
    userName: string
    userImage: string | null
    userUsername: string | null
    sharedThemes: string[]
    publicCount: number
  }[] = []

  if (myThemeNames.length > 0) {
    const themeNamesSQL = sql.join(myThemeNames.map(n => sql`${n}`), sql.raw(', '))
    const rows = await db.execute(sql`
      SELECT
        u.id             AS "userId",
        u.name           AS "userName",
        u.image          AS "userImage",
        u.username       AS "userUsername",
        array_agg(DISTINCT t.name) AS "sharedThemes",
        COUNT(DISTINCT b.id) FILTER (WHERE b.is_public = true) AS "publicCount"
      FROM themes t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN block_themes bt ON bt.theme_id = t.id
      LEFT JOIN blocks b ON b.id = bt.block_id AND b.user_id = u.id
      WHERE u.id != ${userId}
        AND lower(t.name) = ANY(ARRAY[${themeNamesSQL}])
      GROUP BY u.id, u.name, u.image, u.username
      ORDER BY COUNT(DISTINCT t.name) DESC, "publicCount" DESC
      LIMIT 20
    `)
    similarPeople = rows as any[]
  }

  // Explorar por tema — temas com mais conteúdo público
  const popularThemes = await db.execute(sql`
    SELECT
      t.name,
      t.color,
      COUNT(DISTINCT b.id) AS "blockCount",
      COUNT(DISTINCT b.user_id) AS "peopleCount"
    FROM themes t
    JOIN block_themes bt ON bt.theme_id = t.id
    JOIN blocks b ON b.id = bt.block_id AND b.is_public = true
    WHERE b.user_id != ${userId}
    GROUP BY t.name, t.color
    HAVING COUNT(DISTINCT b.id) > 0
    ORDER BY "peopleCount" DESC, "blockCount" DESC
    LIMIT 24
  `) as any[]

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          Social
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Encontre pessoas que estudam o mesmo que você</p>
      </div>

      {/* Pessoas com temas parecidos */}
      {myThemeNames.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-white">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Crie temas na sua biblioteca</p>
          <p className="text-sm text-slate-400 mt-1">Assim conseguimos encontrar pessoas que estudam o mesmo que você</p>
          <Link href="/explore" className="inline-block mt-4 text-sm text-indigo-600 hover:underline">
            Criar meus temas →
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-indigo-400" />
            Estudam temas parecidos com os seus
          </h2>

          {similarPeople.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-white">
              <p className="text-slate-400 text-sm">Nenhum usuário com temas em comum ainda</p>
              <p className="text-xs text-slate-400 mt-1">Compartilhe seus blocos públicos para aparecer aqui também</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {similarPeople.map(p => (
                <Link key={p.userId} href={`/u/${p.userId}`}>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors flex items-start gap-3">
                    {p.userImage ? (
                      <Image src={p.userImage} alt={p.userName} width={40} height={40} className="rounded-full shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                        {p.userName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{p.userName}</p>
                      {p.userUsername && <p className="text-xs text-slate-400">@{p.userUsername}</p>}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(p.sharedThemes ?? []).slice(0, 3).map((t: string) => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {p.publicCount} item{p.publicCount !== 1 ? 's' : ''} públicos
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Busca de pessoas */}
      <UserSearch />

      {/* Explorar por tema */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-slate-400" />
          Explorar por tema
        </h2>
        {popularThemes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum tema público ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {popularThemes.map((t: any) => {
              const isMyTheme = myThemeNames.includes(t.name.toLowerCase())
              return (
                <Link
                  key={t.name}
                  href={`/social/theme/${encodeURIComponent(t.name)}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors cursor-pointer ${
                    isMyTheme
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.color ?? '#6366f1' }}
                  />
                  <span>{t.name}</span>
                  <span className="text-xs text-slate-400 ml-1">{t.peopleCount} {t.peopleCount === 1 ? 'pessoa' : 'pessoas'}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
