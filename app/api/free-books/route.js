export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || ''

  if (!title.trim()) {
    return Response.json({ link: null })
  }

  // 1. Ищем в Project Gutenberg (через Gutendex)
  try {
    const url = `https://gutendex.com/books?search=${encodeURIComponent(title)}&languages=ru`
    const res = await fetch(url, { cache: 'no-store' })

    if (res.ok) {
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const book = data.results[0]
        const formats = book.formats || {}

        const htmlLink = Object.entries(formats).find(([key]) => key.includes('text/html'))?.[1]
        const txtLink = Object.entries(formats).find(([key]) => key.includes('text/plain'))?.[1]
        const epubLink = Object.entries(formats).find(([key]) => key.includes('epub'))?.[1]
        const link = htmlLink || txtLink || epubLink

        if (link) {
          return Response.json({ link, source: 'gutenberg', title: book.title })
        }
      }
    }
  } catch (err) {
    console.error('Gutenberg error:', err.message)
  }

  // 2. Ищем в Wikisource (русская версия)
  try {
    const url = `https://ru.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&format=json&srlimit=1&origin=*`
    const res = await fetch(url, { cache: 'no-store' })

    if (res.ok) {
      const data = await res.json()
      const results = data.query?.search || []

      if (results.length > 0) {
        const pageTitle = results[0].title
        const link = `https://ru.wikisource.org/wiki/${encodeURIComponent(pageTitle)}`
        return Response.json({ link, source: 'wikisource', title: pageTitle })
      }
    }
  } catch (err) {
    console.error('Wikisource error:', err.message)
  }

  return Response.json({ link: null })
}