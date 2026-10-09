'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase'

export default function Home() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [popular, setPopular] = useState([])
  const [searched, setSearched] = useState(false)

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
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Найди свою следующую книгу</h1>

      <form onSubmit={searchBooks} className="flex gap-2 mb-8">
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

      {loading && <p className="text-gray-400">Ищем...</p>}

      {/* Результаты поиска */}
      {searched && !loading && books.length === 0 && (
        <p className="text-gray-400 mb-6">Ничего не найдено. Попробуй другое название.</p>
      )}

      {books.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4">Результаты поиска</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
            {books.map((book) => {
              const info = book.volumeInfo
              const coverUrl = info.imageLinks?.thumbnail?.replace('http://', 'https://')

              return (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
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
                      {info.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {info.authors?.join(', ') || 'Автор неизвестен'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Популярные книги на сайте */}
      {!searched && popular.length > 0 && (
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

      {/* Заглушка, если популярных пока нет */}
      {!searched && popular.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400">
          Пока никто не добавлял книги на полки. Будь первой! 👆
        </div>
      )}
    </div>
  )
}