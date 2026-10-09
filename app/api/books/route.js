export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return Response.json({ items: [], source: 'empty' })
  }

  // ─── ШАГ 1: Google Books ───
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&langRestrict=ru`
    const res = await fetch(url, { cache: 'no-store' })

    if (res.ok) {
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        return Response.json({ items: data.items, source: 'google' })
      }
    }
    console.log('Google Books status:', res.status)
  } catch (err) {
    console.error('Google Books error:', err.message)
  }

  // ─── ШАГ 2: Open Library с имитацией браузера ───
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('Open Library status:', res.status)
      return Response.json({ items: [], error: `OL: ${res.status}` })
    }

    const data = await res.json()
    const items = (data.docs || [])
      .filter((doc) => doc.key)
      .map((doc) => ({
        id: doc.key,
        volumeInfo: {
          title: doc.title || 'Без названия',
          authors: doc.author_name || [],
          imageLinks: doc.cover_i
            ? { thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` }
            : null,
        },
        _source: 'openlibrary',
      }))

    console.log('Open Library found:', items.length, 'books')
    return Response.json({ items, source: 'openlibrary' })
  } catch (err) {
    console.error('Open Library error:', err.message)
    return Response.json({ items: [], error: err.message })
  }
}