export async function GET(request, { params }) {
  const { id } = await params
  const bookId = decodeURIComponent(id)
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY

  // Для книг из Open Library не поддерживаем
  if (bookId.startsWith('/')) {
    return Response.json({ error: 'Not supported' }, { status: 400 })
  }

  try {
    let url = `https://www.googleapis.com/books/v1/volumes/${bookId}`
    if (apiKey) url += `?key=${apiKey}`

    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      return Response.json({ error: 'Not found' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}