'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function Login() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handle(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setMsg(error.message)
      return
    }

    if (isSignUp) {
      setMsg('✅ Аккаунт создан! Теперь можешь войти.')
      setIsSignUp(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-gray-900 p-8 rounded-xl">
      <h1 className="text-2xl font-bold mb-6">
        {isSignUp ? 'Регистрация' : 'Вход'}
      </h1>

      <form onSubmit={handle} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-purple-500 outline-none text-white placeholder-gray-500"
          required
        />
        <input
          type="password"
          placeholder="Пароль (минимум 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-purple-500 outline-none text-white placeholder-gray-500"
          required
          minLength={6}
        />
        <button
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-semibold"
        >
          {loading ? 'Подожди...' : isSignUp ? 'Создать аккаунт' : 'Войти'}
        </button>
      </form>

      {msg && (
        <p className="mt-4 text-sm text-yellow-400 break-words">{msg}</p>
      )}

      <button
        onClick={() => {
          setIsSignUp(!isSignUp)
          setMsg('')
        }}
        className="mt-6 text-sm text-gray-400 hover:text-purple-400"
      >
        {isSignUp
          ? 'Уже есть аккаунт? Войти'
          : 'Нет аккаунта? Зарегистрироваться'}
      </button>
    </div>
  )
}