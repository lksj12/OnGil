export type ReportCategory = '공사' | '장애물' | '점자블록' | '보도 불편' | '기타'
export type TactilePavingStatus = '연속' | '일부 단절' | '없음' | '미확인'

export interface Report {
  id: number
  category: ReportCategory
  title: string
  description: string
  location: string
  latitude: number | null
  longitude: number | null
  createdAt: string
  helpfulCount: number
  status: 'active' | 'resolved'
}

export interface RouteStep {
  id: number
  type: 'straight' | 'left' | 'right' | 'crosswalk' | 'arrival'
  instruction: string
  detail: string
  distance: string
  tactilePaving: TactilePavingStatus
  accessibilityNotes: string[]
}
