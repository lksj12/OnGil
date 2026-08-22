import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '온길 — 시각장애인을 위한 고시인성 안전 보행 길 안내',
  description: '도로 표지판 표준 고대비 배색과 초대형 방향 지시, 점자블록 및 음향신호기 안내를 제공하는 보행 내비게이션',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E1210',
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

