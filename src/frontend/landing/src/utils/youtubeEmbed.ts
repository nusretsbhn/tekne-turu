/** YouTube watch/shorts/youtu.be → embed URL (privacy-enhanced) */
export function toYoutubeEmbedUrl(input: string | null | undefined): string | null {
  if (!input?.trim()) return null
  const u = input.trim()

  if (u.includes('youtube-nocookie.com/embed') || u.includes('youtube.com/embed')) {
    try {
      const url = new URL(u)
      if (!url.searchParams.has('enablejsapi')) url.searchParams.set('rel', '0')
      return url.toString()
    } catch {
      return u
    }
  }

  let id: string | null = null
  const shorts = /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/.exec(u)
  if (shorts) id = shorts[1]
  const watch = /[?&]v=([a-zA-Z0-9_-]{11})/.exec(u)
  if (!id && watch) id = watch[1]
  const be = /youtu\.be\/([a-zA-Z0-9_-]{11})/.exec(u)
  if (!id && be) id = be[1]

  if (!id) return null
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`
}
