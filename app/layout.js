'use client'
import './globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RootLayout({ children }) {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadUser() {
    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      setUser(null)
      setProfile(null)
      return
    }

    setUser(data.user)

    const { data: prof } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', data.user.id)
      .maybeSingle()

    setProfile(prof)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = profile?.username || user?.email?.split('@')[0] || ''

  return (
    <html lang="ru">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-purple-400 shrink-0">
            📚 BookHub
          </Link>

          <div className="flex gap-4 md:gap-6 items-center">
            <Link href="/" className="hover:text-purple-400 hidden sm:inline">
              Поиск
            </Link>

            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 hover:text-purple-400"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Аватар"
                      className="w-8 h-8 rounded-full object-cover border border-purple-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm">
                      👤
                    </div>
                  )}
                  <span className="hidden md:inline">{displayName}</span>
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  Выйти
                </button>
              </>
            ) : (
              <Link href="/login" className="hover:text-purple-400">
                Войти
              </Link>
            )}
          </div>
        </nav>
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  )
}