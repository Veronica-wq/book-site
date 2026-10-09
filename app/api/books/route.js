export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return Response.json({ items: [], source: 'empty' })
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY

  // ─── Google Books с улучшенным поиском ───
  try {
    // Формируем запрос: если это название с пробелами — ищем в заголовке
    // Например: "Гарри Поттер" → intitle:"Гарри Поттер"
    const trimmed = query.trim()
    const searchQuery = trimmed.includes(' ')
      ? `intitle:"${trimmed}"`
      : trimmed

    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=20&printType=books&orderBy=relevance`
    if (apiKey) url += `&key=${apiKey}`

    const res = await fetch(url, { cache: 'no-store' })

    if (res.ok) {
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        return Response.json({ items: data.items, source: 'google' })
      }
    }
    console.log('Google Books status:', res.status)

    // Если точный поиск не дал результатов — пробуем без intitle
    if (trimmed.includes(' ')) {
      const url2 = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(trimmed)}&maxResults=20&printType=books${apiKey ? `&key=${apiKey}` : ''}`
      const res2 = await fetch(url2, { cache: 'no-store' })
      if (res2.ok) {
        const data2 = await res2.json()
        if (data2.items && data2.items.length > 0) {
          return Response.json({ items: data2.items, source: 'google' })
        }
      }
    }
  } catch (err) {
    console.error('Google Books error:', err.message)
  }

  // ─── Fallback: Open Library ───
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BookHub/1.0', Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) return Response.json({ items: [], error: `OL: ${res.status}` })

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

    return Response.json({ items, source: 'openlibrary' })
  } catch (err) {
    return Response.json({ items: [], error: err.message })
  }
}