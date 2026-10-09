'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

function BookContent() {
  const params = useParams()
  const supabase = createClient()
  const bookKey = decodeURIComponent(params.id)

  // Определяем источник по формату ID
  const isOpenLibrary = bookKey.startsWith('/')

  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [user, setUser] = useState(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [hover, setHover] = useState(0)
  const [shelfStatus, setShelfStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadBook()
    loadReviews()
    loadUser()
  }, [bookKey])

  // Загрузка книги — из Google Books или Open Library
  async function loadBook() {
    try {
      if (isOpenLibrary) {
        const res = await fetch(`https://openlibrary.org${bookKey}.json`)
        const data = await res.json()
        setBook(data)
      } else {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookKey}`)
        const data = await res.json()
        setBook(data.volumeInfo ? { ...data.volumeInfo, _google: true } : null)
      }
    } catch (err) {
      console.error(err)
      setBook(null)
    }
    setLoading(false)
  }

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(username, avatar_url)')
      .eq('book_id', bookKey)
      .order('created_at', { ascending: false })
    setReviews(data || [])
  }

  async function loadUser() {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUser(data.user)
      const { data: shelfData } = await supabase
        .from('shelves')
        .select('status')
        .eq('user_id', data.user.id)
        .eq('book_id', bookKey)
        .maybeSingle()
      if (shelfData) setShelfStatus(shelfData.status)
    }
  }

  // Универсальные геттеры — работают с обоими источниками
  function getTitle() {
    return book?.title || 'Без названия'
  }

  function getAuthors() {
    if (book?._google) return book.authors || []
    return book?.by_statement ? [book.by_statement] : []
  }

  function getCoverUrl(size = 'L') {
    if (book?._google) {
      return book.imageLinks?.thumbnail?.replace('http://', 'https://') || null
    }
    const coverId = book?.covers?.[0]
    return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null
  }

  function getDescription() {
    let desc = book?.description
    if (typeof desc === 'object' && desc?.value) desc = desc.value
    return desc || null
  }

  function getSubjects() {
    if (book?._google) return book.categories || []
    return book?.subjects || []
  }

  function getYear() {
    if (book?._google) return book.publishedDate
    return book?.first_publish_date
  }

  async function setShelf(status) {
    if (!user) return alert('Войди в аккаунт!')

    const cover = getCoverUrl('M')
    const title = getTitle()

    if (shelfStatus === status) {
      await supabase.from('shelves').delete()
        .eq('user_id', user.id).eq('book_id', bookKey)
      setShelfStatus(null)
    } else {
      const { error } = await supabase.from('shelves').upsert({
        user_id: user.id,
        book_id: bookKey,
        book_title: title,
        book_cover: cover,
        status,
      }, { onConflict: 'user_id,book_id' })
      if (error) return alert(error.message)
      setShelfStatus(status)
    }
  }

  async function submitReview(e) {
    e.preventDefault()
    if (!user) return alert('Войди в аккаунт!')
    if (!content.trim()) return alert('Напиши текст отзыва')

    setSubmitting(true)

    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      book_id: bookKey,
      book_title: getTitle(),
      book_cover: getCoverUrl('M'),
      rating,
      content,
    })
    setSubmitting(false)

    if (error) return alert(error.message)
    setContent('')
    setRating(5)
    loadReviews()
  }

  if (loading) return <p className="text-gray-400">Загрузка...</p>
  if (!book) return <p className="text-gray-400">Книга не найдена</p>

  const coverUrl = getCoverUrl('L')
  const description = getDescription()
  const subjects = getSubjects()
  const authors = getAuthors()
  const year = getYear()

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null

  return (
    <div>
      {/* Информация о книге */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {coverUrl ? (
          <img src={coverUrl} alt={getTitle()} className="w-48 rounded-lg shadow-lg shrink-0" />
        ) : (
          <div className="w-48 h-72 bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 shrink-0">
            Нет обложки
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{getTitle()}</h1>

          {authors.length > 0 && (
            <p className="text-gray-300 mb-2">{authors.join(', ')}</p>
          )}

          {year && (
            <p className="text-gray-400 mb-2 text-sm">Год: {year}</p>
          )}

          {avgRating && (
            <p className="text-yellow-400 mb-4">
              ★ {avgRating} ({reviews.length} отзывов)
            </p>
          )}

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {subjects.slice(0, 8).map((s, i) => (
                <span key={i} className="text-xs px-3 py-1 bg-gray-800 rounded-full text-gray-300">
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Кнопки полок */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setShelf('want')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                shelfStatus === 'want'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              🔖 Хочу прочитать
            </button>
            <button
              onClick={() => setShelf('reading')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                shelfStatus === 'reading'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              📖 Читаю
            </button>
            <button
              onClick={() => setShelf('read')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                shelfStatus === 'read'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              ✅ Прочитано
            </button>
          </div>
        </div>
      </div>

      {/* Описание */}
      {description && (
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-3">Описание</h2>
          <p className="text-gray-300 whitespace-pre-line">{description}</p>
        </div>
      )}

      {/* Отзывы */}
      <h2 className="text-2xl font-bold mb-4">Отзывы ({reviews.length})</h2>

      {user ? (
        <form onSubmit={submitReview} className="bg-gray-900 p-5 rounded-xl mb-6">
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="text-3xl"
              >
                <span className={star <= (hover || rating) ? 'text-yellow-400' : 'text-gray-600'}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Поделись впечатлениями..."
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-purple-500 outline-none text-white placeholder-gray-500"
            rows={4}
          />
          <button
            disabled={submitting}
            className="mt-3 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-semibold"
          >
            {submitting ? 'Публикуем...' : 'Опубликовать'}
          </button>
        </form>
      ) : (
        <p className="text-gray-400 mb-6">
          <a href="/login" className="text-purple-400 hover:underline">Войди</a>, чтобы оставить отзыв.
        </p>
      )}

      <div className="space-y-4">
        {reviews.length === 0 && (
          <p className="text-gray-500 italic">Пока нет отзывов. Будь первой!</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="bg-gray-900 p-4 rounded-xl">
            <div className="flex items-start gap-3 mb-3">
              {r.profiles?.avatar_url ? (
                <img
                  src={r.profiles.avatar_url}
                  alt="Аватар"
                  className="w-10 h-10 rounded-full object-cover border border-purple-500 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  👤
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold">
                    {r.profiles?.username || 'Аноним'}
                  </span>
                  <span className="text-yellow-400 shrink-0">
                    {'★'.repeat(r.rating)}
                  </span>
                </div>
                <p className="text-gray-300 mt-2 whitespace-pre-line">{r.content}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {new Date(r.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Загрузка книги...</p>}>
      <BookContent />
    </Suspense>
  )
}