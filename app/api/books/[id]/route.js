export async function GET(request, { params }) {
  const { id } = await params
  const bookId = decodeURIComponent(id)

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY

  // ─── Google Books ───
  if (!bookId.startsWith('/')) {
    try {
      let url = `https://www.googleapis.com/books/v1/volumes/${bookId}`
      if (apiKey) url += `?key=${apiKey}`

      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        return Response.json(data)
      }
    } catch (err) {
      console.error('Google Books detail error:', err.message)
    }
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // ─── Open Library ───
  try {
    const res = await fetch(`https://openlibrary.org${bookId}.json`, {
      headers: { 'User-Agent': 'BookHub/1.0', Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}