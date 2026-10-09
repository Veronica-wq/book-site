'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

export default function EditProfile() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push('/login')
      return
    }
    setUser(userData.user)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profile) {
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatar_url || null)
    }
  }

  async function uploadAvatar(e) {
    e.preventDefault()
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)

    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setMessage('Ошибка загрузки: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id)

    if (updateError) {
      setMessage('Ошибка: ' + updateError.message)
    } else {
      setAvatarUrl(data.publicUrl + '?t=' + Date.now())
      setMessage('✅ Аватарка обновлена!')
    }

    setUploading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ username, bio })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      setMessage('Ошибка: ' + error.message)
      return
    }

    setMessage('✅ Профиль сохранён!')
    setTimeout(() => {
      router.push('/profile')
      router.refresh()
    }, 1000)
  }

  if (!user) return <p className="text-gray-400">Загрузка...</p>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Редактировать профиль</h1>

      {/* Аватарка */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Аватарка</h2>
        <div className="flex items-center gap-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Аватар"
              className="w-24 h-24 rounded-full object-cover border-2 border-purple-500"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-3xl">
              👤
            </div>
          )}

          <label className="cursor-pointer px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
            {uploading ? 'Загрузка...' : 'Загрузить фото'}
            <input
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Рекомендуем квадратное изображение, до 2 МБ.
        </p>
      </div>

      {/* Никнейм и био */}
      <form onSubmit={saveProfile} className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Личные данные</h2>

        <label className="block text-sm text-gray-400 mb-2">Никнейм</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Как тебя называть?"
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-purple-500 outline-none text-white placeholder-gray-500 mb-4"
          required
        />

        <label className="block text-sm text-gray-400 mb-2">О себе</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Пара слов о тебе и твоих читательских вкусах..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-purple-500 outline-none text-white placeholder-gray-500 mb-4"
        />

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-semibold"
          >
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            Отмена
          </button>
        </div>
      </form>

      {message && (
        <p className="mt-4 text-sm text-yellow-400 break-words">{message}</p>
      )}
    </div>
  )
}