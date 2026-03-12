import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { blocks } from '@/lib/db/schema'
import { eq, and, isNotNull } from 'drizzle-orm'
import { Download, FileText, Image as ImageIcon, Music, HardDrive } from 'lucide-react'
import Link from 'next/link'
import { formatBytes } from '@/lib/utils'

export default async function DownloadsPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const files = await db
    .select({
      id: blocks.id,
      title: blocks.title,
      sourceType: blocks.sourceType,
      fileName: blocks.fileName,
      fileSizeBytes: blocks.fileSizeBytes,
      filePath: blocks.filePath,
      createdAt: blocks.createdAt,
    })
    .from(blocks)
    .where(and(eq(blocks.userId, userId), isNotNull(blocks.filePath)))
    .orderBy(blocks.createdAt)

  const totalBytes = files.reduce((acc, f) => acc + (f.fileSizeBytes ?? 0), 0)

  const typeIcon = (type: string) => {
    if (type === 'pdf') return FileText
    if (type === 'image') return ImageIcon
    if (type === 'audio') return Music
    return Download
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Downloads</h1>
        <p className="text-sm text-slate-500 mt-0.5">Arquivos salvos no seu dispositivo</p>
      </div>

      {/* Uso de armazenamento */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
        <div className="p-2.5 bg-indigo-50 rounded-lg">
          <HardDrive className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">Armazenamento usado</p>
          <p className="text-xs text-slate-500">{formatBytes(totalBytes)} · {files.length} arquivo{files.length !== 1 ? 's' : ''}</p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min((totalBytes / 524288000) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{formatBytes(totalBytes)} de 500 MB (plano free)</p>
        </div>
      </div>

      {/* Lista de arquivos */}
      {files.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
          <Download className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum arquivo salvo</p>
          <p className="text-sm text-slate-400 mt-1">PDFs e imagens que você salvar aparecem aqui</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map(f => {
            const Icon = typeIcon(f.sourceType)
            return (
              <Link key={f.id} href={`/block/${f.id}`}>
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-200 transition-colors active:scale-[0.99]">
                  <div className="p-2 bg-slate-50 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{f.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {f.fileName ?? 'arquivo'} · {formatBytes(f.fileSizeBytes ?? 0)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
