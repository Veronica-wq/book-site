import './globals.css'
import { Suspense } from 'react'
import Nav from './Nav'

export const metadata = {
  title: 'BookHub',
  description: 'Твоя библиотека книг',
  verification: {
    yandex: '032ed387ca6bd465',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <Suspense fallback={<div className="h-14 bg-gray-900 border-b border-gray-800" />}>
          <Nav />
        </Suspense>
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  )
}