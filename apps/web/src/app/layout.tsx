import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'LifeOS - Principle-Based Planning',
  description: 'A principle-based planning and execution system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="default">
      <body>{children}</body>
    </html>
  )
}