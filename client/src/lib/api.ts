import type { Report, ReportCategory } from './types'

export async function getReports(): Promise<Report[]> {
  const response = await fetch('/api/reports')
  if (!response.ok) throw new Error('제보를 불러오지 못했습니다.')
  return response.json()
}

export async function createReport(payload: {
  category: ReportCategory
  title: string
  description: string
  location: string
}): Promise<Report> {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error('제보를 등록하지 못했습니다.')
  return response.json()
}

export async function markHelpful(id: number): Promise<Report> {
  const response = await fetch(`/api/reports/${id}/helpful`, { method: 'POST' })
  if (!response.ok) throw new Error('반영하지 못했습니다.')
  return response.json()
}

export async function analyzeScene(file: File): Promise<{
  summary: string
  details: string[]
  caution: string
}> {
  const body = new FormData()
  body.append('image', file)
  const response = await fetch('/api/vision/analyze', { method: 'POST', body })
  if (!response.ok) throw new Error('이미지를 분석하지 못했습니다.')
  return response.json()
}
