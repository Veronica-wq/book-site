'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase'

const RANDOM_TOPICS = [
  'фэнтези',
  'детектив',
  'фантастика',
  'любовный роман',
  'приключения',
  'ужасы',
  'исторический роман',
  'классическая литература',
  'биография',
  'психология',
  'поэзия',
  'young adult',
  'антиутопия',
  'мистика',
  'триллер',
  'нон-фикшн',
  'саморазвитие',
  'бизнес',
  'научная фантастика',
  'современная проза',
]

export default function Home() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [popular, setPopular] = useState([])
  const [searched, setSearched] = useState(false)

  // Состояния для "Удиви меня"
  const [surprise, setSurprise] = useState(null)
  const [surpriseLoading, setSurpriseLoading] = useState(false)

  useEffect(() => {
    loadPopular()
  }, [])

  async function loadPopular() {
    const { data } = await supabase
      .from('popular_books')
      .select('*')
      .limit(10)
    setPopular(data || [])
  }

  async function searchBooks(e) {
    if (e) e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setSurprise(null)
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setBooks(data.items || [])
    } catch (err) {
      console.error(err)
      setBooks([])
    }
    setLoading(false)
  }

  async function surpriseMe() {
    setSurpriseLoading(true)
    setSearched(false)
    setBooks([])

    try {
      // Пробуем до 3 раз, пока не найдём хорошую книгу с обложкой
      for (let attempt = 0; attempt < 3; attempt++) {
        const randomTopic = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)]
        const res = await fetch(`/api/books?q=${encodeURIComponent(randomTopic)}`)
        const data = await res.json()
        const items = (data.items || []).filter(
          (b) => b.volumeInfo?.imageLinks?.thumbnail && b.volumeInfo?.description
        )

        if (items.length > 0) {
          const randomBook = items[Math.floor(Math.random() * items.length)]
          setSurprise(randomBook)
          setSurpriseLoading(false)
          return
        }
      }
      // Если совсем не нашли — сообщение
      setSurprise({ _error: true })
    } catch (err) {
      console.error(err)
      setSurprise({ _error: true })
    }
    setSurpriseLoading(false)
  }

  function clearAll() {
    setSearched(false)
    setQuery('')
    setBooks([])
    setSurprise(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Найди свою следующую книгу</h1>

      <form onSubmit={searchBooks} className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название или автор..."
          className="flex-1 px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-purple-500 outline-none text-white placeholder-gray-500"
        />
        <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
          Искать
        </button>
      </form>

      {/* Кнопка «Удиви меня» */}
      {!surprise && !searched && (
        <button
          onClick={surpriseMe}
          disabled={surpriseLoading}
          className="w-full md:w-auto mb-8 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 rounded-lg font-bold text-lg transition-all"
        >
          {surpriseLoading ? '🎲 Ищем что-то интересное...' : '🎲 Удиви меня!'}
        </button>
      )}

      {/* ─── Удиви меня — карточка книги ─── */}
      {surprise && !surprise._error && (
        <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl p-6 mb-8 relative">
          <button
            onClick={() => setSurprise(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
            title="Закрыть"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎲</span>
            <h2 className="text-xl font-bold text-white">Тебе может понравиться</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {surprise.volumeInfo.imageLinks?.thumbnail && (
              <img
                src={surprise.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://')}
                alt={surprise.volumeInfo.title}
                className="w-40 rounded-lg shadow-2xl shrink-0 self-center md:self-start"
              />
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold mb-2 text-white">
                {surprise.volumeInfo.title}
              </h3>

              {surprise.volumeInfo.authors && (
                <p className="text-purple-200 mb-3">
                  {surprise.volumeInfo.authors.join(', ')}
                </p>
              )}

              {surprise.volumeInfo.publishedDate && (
                <p className="text-purple-200/70 text-sm mb-3">
                  Год: {surprise.volumeInfo.publishedDate}
                </p>
              )}

              {surprise.volumeInfo.description && (
                <p className="text-white/90 text-sm line-clamp-5 mb-4">
                  {surprise.volumeInfo.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/book/${encodeURIComponent(surprise.id)}`}
                  className="px-5 py-2 bg-white text-purple-900 hover:bg-gray-100 rounded-lg font-semibold"
                >
                  Открыть книгу →
                </Link>
                <button
                  onClick={surpriseMe}
                  disabled={surpriseLoading}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg font-semibold text-white"
                >
                  {surpriseLoading ? 'Ищем...' : '🎲 Другая книга'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Если "Удиви меня" не нашёл */}
      {surprise && surprise._error && (
        <div className="bg-gray-900 rounded-xl p-6 mb-8 text-center">
          <p className="text-gray-400 mb-3">Не получилось найти книгу. Попробуй ещё раз?</p>
          <button
            onClick={surpriseMe}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
          >
            🎲 Попробовать снова
          </button>
        </div>
      )}

      {loading && <p className="text-gray-400">Ищем...</p>}

      {/* Ничего не найдено */}
      {searched && !loading && books.length === 0 && (
        <p className="text-gray-400 mb-6">Ничего не найдено. Попробуй другое название.</p>
      )}

      {books.length > 0 && (
        <h2 className="text-xl font-bold mb-4">Результаты поиска</h2>
      )}

      {/* Сетка книг */}
      {books.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
          {books.map((book) => {
            const info = book.volumeInfo || {}
            const coverUrl = info.imageLinks?.thumbnail?.replace('http://', 'https://')

            return (
              <Link
                key={book.id}
                href={`/book/${encodeURIComponent(book.id)}`}
                className="group bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition"
              >
                {coverUrl ? (
                  <img src={coverUrl} alt={info.title} className="w-full h-56 object-cover" />
                ) : (
                  <div className="w-full h-56 bg-gray-800 flex items-center justify-center text-gray-600 text-sm">
                    Нет обложки
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-400">
                    {info.title || 'Без названия'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {info.authors?.join(', ') || 'Автор неизвестен'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Популярные книги */}
      {!searched && !surprise && popular.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold">🔥 Популярные на BookHub</h2>
            <span className="text-sm text-gray-500">— что добавляют чаще всего</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {popular.map((p) => (
              <Link
                key={p.book_id}
                href={`/book/${encodeURIComponent(p.book_id)}`}
                className="group bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition relative"
              >
                {p.book_cover ? (
                  <img
                    src={p.book_cover}
                    alt={p.book_title}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="w-full h-56 bg-gray-800 flex items-center justify-center text-gray-600 text-sm">
                    Нет обложки
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {p.adds} 📚
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-400">
                    {p.book_title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {!searched && !surprise && popular.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400">
          Пока никто не добавлял книги на полки. Будь первой! 👆
        </div>
      )}
    </div>
  )
}