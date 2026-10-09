export async function GET(request, { params }) {
  const { id } = await params
  const bookId = decodeURIComponent(id)
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY

  try {
    // 1. Узнаём прямую ссылку на PDF
    let detailUrl = `https://www.googleapis.com/books/v1/volumes/${bookId}`
    if (apiKey) detailUrl += `?key=${apiKey}`

    const detailRes = await fetch(detailUrl, { cache: 'no-store' })
    if (!detailRes.ok) {
      return new Response('Book not found', { status: 404 })
    }

    const detail = await detailRes.json()
    const pdfLink = detail.accessInfo?.pdf?.downloadLink

    if (!pdfLink) {
      return new Response('PDF not available', { status: 404 })
    }

    // 2. Скачиваем PDF через сервер Vercel (обход блокировки РФ)
    const pdfRes = await fetch(pdfLink)

    if (!pdfRes.ok) {
      return new Response('Failed to fetch PDF', { status: pdfRes.status })
    }

    const pdfData = await pdfRes.arrayBuffer()

    // 3. Отдаём PDF пользователю
    return new Response(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('PDF proxy error:', err.message)
    return new Response('Error: ' + err.message, { status: 500 })
  }
}