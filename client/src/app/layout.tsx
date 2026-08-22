import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '온길 — 모두의 안전한 길',
  description: '시각장애인을 위한 접근성 중심 보행 길 안내 서비스',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f7f2',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main">본문으로 바로가기</a>
        {children}
      </body>
    </html>
  )
}
