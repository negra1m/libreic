import { auth, signOut } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, blocks } from '@/lib/db/schema'
import { eq, count, sum } from 'drizzle-orm'
import { formatBytes } from '@/lib/utils'
import { Database, LogOut, Shield, User, Sparkles } from 'lucide-react'
import { AvatarForm } from './AvatarForm'
import { ProfileForm } from './ProfileForm'
import { PasswordForm } from './PasswordForm'
import { ClaudeKeyForm } from './ClaudeKeyForm'

export default async function SettingsPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  const [stats] = await db
    .select({ total: count(blocks.id), storage: sum(blocks.fileSizeBytes) })
    .from(blocks)
    .where(eq(blocks.userId, userId))

  const storageUsed = Number(stats?.storage ?? 0)
  const storageLimit = user?.storageLimitBytes ?? 524288000
  const storagePct = Math.min((storageUsed / storageLimit) * 100, 100)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Conta e preferências</p>
      </div>

      {/* Perfil */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Perfil</span>
        </div>
        <div className="p-4 space-y-5">
          <AvatarForm name={user?.name ?? ''} image={user?.image ?? null} />
          <hr className="border-slate-100" />
          <ProfileForm name={user?.name ?? ''} username={user?.username ?? null} />
          <p className="text-xs text-slate-400">{user?.email}</p>
        </div>
      </section>

      {/* Armazenamento */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <Database className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Armazenamento</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{formatBytes(storageUsed)} usados</span>
            <span className="text-slate-400">de {formatBytes(storageLimit)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${storagePct}%`, backgroundColor: storagePct > 80 ? '#ef4444' : '#6366f1' }}
            />
          </div>
          <p className="text-xs text-slate-400">{stats?.total ?? 0} blocos salvos</p>
        </div>
      </section>

      {/* IA */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-700">Inteligência Artificial</span>
        </div>
        <div className="p-4">
          <ClaudeKeyForm hasKey={!!user?.claudeApiKey} />
        </div>
      </section>

      {/* Segurança */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <Shield className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Segurança</span>
        </div>
        <div className="p-4">
          <PasswordForm hasPassword={!!user?.password} />
        </div>
      </section>

      {/* Sair */}
      <section className="bg-white border border-red-100 rounded-xl overflow-hidden">
        <div className="p-4">
          <form action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors active:scale-[0.99] cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
