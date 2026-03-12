import { parseYouTubeId } from './utils'

export interface ExtractedMetadata {
  title:        string
  thumbnailUrl: string | null
  bodyText:     string | null
  sourceType:   'youtube' | 'link' | 'reel' | 'note'
  duration:     number | null
}

export async function extractMetadata(url: string): Promise<ExtractedMetadata> {
  try {
    const hostname = new URL(url).hostname

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return await extractYouTube(url)
    }

    if (hostname.includes('instagram.com') || hostname.includes('tiktok.com')) {
      return await extractSocial(url)
    }

    return await extractOpenGraph(url)
  } catch {
    return {
      title:        url,
      thumbnailUrl: null,
      bodyText:     null,
      sourceType:   'link',
      duration:     null,
    }
  }
}

async function extractYouTube(url: string): Promise<ExtractedMetadata> {
  const videoId = parseYouTubeId(url)
  if (!videoId) throw new Error('Invalid YouTube URL')

  // oEmbed — sem API key necessária
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { next: { revalidate: 86400 } }
  )

  if (!res.ok) throw new Error('oEmbed failed')
  const data = await res.json()

  return {
    title:        data.title ?? 'Vídeo YouTube',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    bodyText:     data.author_name ? `Canal: ${data.author_name}` : null,
    sourceType:   'youtube',
    duration:     null,
  }
}

async function extractSocial(url: string): Promise<ExtractedMetadata> {
  // Sem API privada — salva apenas URL e deixa usuário enriquecer manualmente
  const hostname = new URL(url).hostname
  return {
    title:        `Conteúdo de ${hostname}`,
    thumbnailUrl: null,
    bodyText:     null,
    sourceType:   'reel',
    duration:     null,
  }
}

async function extractOpenGraph(url: string): Promise<ExtractedMetadata> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LibreIC/1.0 (link preview)' },
    signal:  AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error('Fetch failed')
  const html = await res.text()

  const getMeta = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
    return m?.[1] ?? null
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

  return {
    title:        getMeta('og:title') ?? titleMatch?.[1]?.trim() ?? url,
    thumbnailUrl: getMeta('og:image'),
    bodyText:     getMeta('og:description'),
    sourceType:   'link',
    duration:     null,
  }
}
