export async function GET(request, { params }) {
  const { id } = await params
  const bookId = decodeURIComponent(id)
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY

  // Для книг из Open Library похожие пока не поддерживаем
  if (bookId.startsWith('/')) {
    return Response.json({ items: [] })
  }

  try {
    // Используем эндпоинт "associated" — он возвращает связанные книги
    let url = `https://www.googleapis.com/books/v1/volumes/${bookId}/associated`
    if (apiKey) url += `?key=${apiKey}`

    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      console.error('Associated books error:', res.status)
      return Response.json({ items: [] })
    }

    const data = await res.json()
    const items = (data.items || []).slice(0, 10)

    return Response.json({ items })
  } catch (err) {
    console.error('Similar books error:', err.message)
    return Response.json({ items: [] })
  }
}