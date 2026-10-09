'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function Profile() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [shelves, setShelves] = useState([])
  const [challenge, setChallenge] = useState(null)
  const [activeTab, setActiveTab] = useState('read')
  const [loading, setLoading] = useState(true)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [currentYear, setCurrentYear] = useState(0)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push('/login')
      return
    }

    setUser(userData.user)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle()

    setProfile(prof)

    const { data: revs } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    const { data: shs } = await supabase
      .from('shelves')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    const year = new Date().getFullYear()

    const { data: ch } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('year', year)
      .maybeSingle()

    setReviews(revs || [])
    setShelves(shs || [])
    setChallenge(ch)
    setGoalInput(ch?.goal || '')
    setLoading(false)
  }

  async function saveGoal() {
    const goal = parseInt(goalInput)
    if (!goal || goal < 1) return alert('Введи число больше 0')

    const { data, error } = await supabase
      .from('challenges')
      .upsert({
        user_id: user.id,
        year: currentYear,
        goal,
      }, { onConflict: 'user_id,year' })
      .select()
      .maybeSingle()

    if (error) return alert(error.message)
    setChallenge(data)
    setEditingGoal(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) return alert(error.message)
    setReviews(reviews.filter((r) => r.id !== id))
  }

  async function removeFromShelf(id) {
    if (!confirm('Убрать книгу с полки?')) return
    const { error } = await supabase.from('shelves').delete().eq('id', id)
    if (error) return alert(error.message)
    setShelves(shelves.filter((s) => s.id !== id))
  }

  if (loading) return <p className="text-gray-400">Загрузка профиля...</p>
  if (!user) return null

  const displayName = profile?.username || user.email
  const avatarUrl = profile?.avatar_url

  const wantBooks = shelves.filter((s) => s.status === 'want')
  const readingBooks = shelves.filter((s) => s.status === 'reading')
  const readBooks = shelves.filter((s) => s.status === 'read')

  const readThisYear = readBooks.filter((s) => {
    const year = new Date(s.created_at).getFullYear()
    return year === currentYear
  }).length

  const progress = challenge
    ? Math.min(100, Math.round((readThisYear / challenge.goal) * 100))
    : 0

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '—'

  const achievements = [
    {
      id: 'first-book',
      icon: '📖',
      title: 'Первая книга',
      desc: 'Добавить книгу на полку «Прочитано»',
      unlocked: readBooks.length >= 1,
    },
    {
      id: 'first-review',
      icon: '✍️',
      title: 'Первый отзыв',
      desc: 'Написать хотя бы один отзыв',
      unlocked: reviews.length >= 1,
    },
    {
      id: 'bookworm',
      icon: '🐛',
      title: 'Книжный червь',
      desc: 'Прочитать 10 книг',
      unlocked: readBooks.length >= 10,
    },
    {
      id: 'critic',
      icon: '🎓',
      title: 'Критик',
      desc: 'Написать 10 отзывов',
      unlocked: reviews.length >= 10,
    },
    {
      id: 'collector',
      icon: '📚',
      title: 'Коллекционер',
      desc: 'Собрать 15 книг на всех полках',
      unlocked: shelves.length >= 15,
    },
    {
      id: 'challenger',
      icon: '🎯',
      title: 'Челленджер',
      desc: 'Поставить цель на год',
      unlocked: !!challenge,
    },
    {
      id: 'achiever',
      icon: '🏆',
      title: 'Цель достигнута',
      desc: 'Выполнить годовой челлендж',
      unlocked: challenge && progress >= 100,
    },
    {
      id: 'generous',
      icon: '💯',
      title: 'Щедрый критик',
      desc: 'Поставить 10 оценок «5 звёзд»',
      unlocked: reviews.filter((r) => r.rating === 5).length >= 10,
    },
    {
      id: 'bio',
      icon: '😊',
      title: 'Личность',
      desc: 'Заполнить «О себе»',
      unlocked: !!(profile?.bio && profile.bio.trim().length > 0),
    },
    {
      id: 'avatar',
      icon: '🖼️',
      title: 'Не аноним',
      desc: 'Загрузить аватарку',
      unlocked: !!profile?.avatar_url,
    },
  ]

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const tabs = {
    want: { label: '🔖 Хочу прочитать', books: wantBooks },
    reading: { label: '📖 Читаю', books: readingBooks },
    read: { label: '✅ Прочитано', books: readBooks },
  }

  return (
    <div>
      {/* Шапка профиля */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Аватар"
            className="w-24 h-24 rounded-full object-cover border-2 border-purple-500 shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-4xl shrink-0">
            👤
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-1 break-words">{displayName}</h1>
          <p className="text-gray-400 text-sm mb-2">{user.email}</p>
          {profile?.bio && <p className="text-gray-300">{profile.bio}</p>}
        </div>

        <div className="flex gap-2 shrink-0">
          <Link
            href="/profile/edit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
          >
            Редактировать
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Челлендж */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold">📚 Челлендж {currentYear}</h2>
            <p className="text-purple-200 text-sm mt-1">
              {challenge
                ? `Цель: прочитать ${challenge.goal} книг за год`
                : 'Поставь цель на этот год!'}
            </p>
          </div>

          {!editingGoal ? (
            <button
              onClick={() => setEditingGoal(true)}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg font-semibold"
            >
              {challenge ? 'Изменить цель' : 'Поставить цель'}
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                min="1"
                placeholder="20"
                className="w-20 px-3 py-2 rounded-lg bg-purple-950 border border-purple-600 outline-none text-white"
              />
              <button
                onClick={saveGoal}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditingGoal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Отмена
              </button>
            </div>
          )}
        </div>

        {challenge && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold">
                {readThisYear} / {challenge.goal} книг
              </span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="w-full h-4 bg-purple-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress >= 100 && (
              <p className="mt-3 text-yellow-300 font-semibold">
                🎉 Цель достигнута! Ты супер!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-green-400">{readBooks.length}</div>
          <div className="text-sm text-gray-400 mt-1">Прочитано</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-blue-400">{readingBooks.length}</div>
          <div className="text-sm text-gray-400 mt-1">Читаю</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-purple-400">{wantBooks.length}</div>
          <div className="text-sm text-gray-400 mt-1">Хочу прочитать</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-yellow-400">{avgRating}</div>
          <div className="text-sm text-gray-400 mt-1">Средняя оценка</div>
        </div>
      </div>

      {/* Ачивки */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">🏆 Достижения</h2>
          <span className="text-sm text-gray-400">
            {unlockedCount} / {achievements.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`flex flex-col items-center text-center p-4 rounded-xl transition ${
                a.unlocked
                  ? 'bg-gradient-to-br from-purple-900 to-purple-800 ring-2 ring-purple-500'
                  : 'bg-gray-800 opacity-50'
              }`}
              title={a.desc}
            >
              <div className="text-4xl mb-2">{a.unlocked ? a.icon : '🔒'}</div>
              <div className="text-sm font-semibold">{a.title}</div>
              <div className="text-xs text-gray-400 mt-1">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Полки */}
      <h2 className="text-2xl font-bold mb-4">Мои полки</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(tabs).map(([key, tab]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            {tab.label} ({tab.books.length})
          </button>
        ))}
      </div>

      {tabs[activeTab].books.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400 mb-8">
          На этой полке пока пусто.
          <br />
          <Link href="/" className="text-purple-400 hover:underline mt-2 inline-block">
            Найти книгу →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {tabs[activeTab].books.map((s) => (
            <div key={s.id} className="group relative bg-gray-900 rounded-lg overflow-hidden">
              <Link href={`/book/${encodeURIComponent(s.book_id)}`}>
                {s.book_cover ? (
                  <img
                    src={s.book_cover}
                    alt={s.book_title}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="w-full h-56 bg-gray-800 flex items-center justify-center text-gray-600 text-sm">
                    Нет обложки
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-400">
                    {s.book_title}
                  </h3>
                </div>
              </Link>
              <button
                onClick={() => removeFromShelf(s.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-600 hover:bg-red-700 rounded-full text-white text-sm opacity-0 group-hover:opacity-100 transition"
                title="Убрать с полки"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Отзывы */}
      <h2 className="text-2xl font-bold mb-4">Мои отзывы ({reviews.length})</h2>

      {reviews.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400">
          Ты пока не написала ни одного отзыва.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-gray-900 rounded-xl p-4 flex gap-4 hover:ring-2 hover:ring-purple-500 transition"
            >
              <Link href={`/book/${encodeURIComponent(r.book_id)}`} className="shrink-0">
                {r.book_cover ? (
                  <img
                    src={r.book_cover}
                    alt={r.book_title}
                    className="w-20 h-28 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-28 bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-600">
                    Нет обложки
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/book/${encodeURIComponent(r.book_id)}`}
                  className="font-semibold hover:text-purple-400 line-clamp-2"
                >
                  {r.book_title}
                </Link>
                <div className="text-yellow-400 my-1">{'★'.repeat(r.rating)}</div>
                {r.content && (
                  <p className="text-sm text-gray-400 line-clamp-3">{r.content}</p>
                )}
                <div className="text-xs text-gray-600 mt-2">
                  {new Date(r.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>

              <button
                onClick={() => deleteReview(r.id)}
                className="self-start text-red-500 hover:text-red-400 text-xl px-2"
                title="Удалить отзыв"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}