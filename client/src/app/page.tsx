'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import {
  Accessibility, AlertTriangle, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft,
  ArrowUpRight, AudioLines, Bell, Camera, Check, ChevronRight, CircleAlert,
  Compass, Construction, Crosshair, Eye, Footprints, LocateFixed, MapPin,
  Menu, MessageSquarePlus, Mic2, Minus, Navigation, Plus, Route, Search,
  ShieldAlert, ShieldCheck, Sparkles, ThumbsUp, Upload, Volume2, X,
} from 'lucide-react'
import { analyzeScene, createReport, getReports, markHelpful } from '@/lib/api'
import type { Report, ReportCategory, RouteStep, TactilePavingStatus } from '@/lib/types'

type Page = 'guide' | 'reports' | 'vision'
type UserMode = 'simple' | 'guardian'

interface RouteProfile {
  destination: string
  duration: number
  distance: number
  tactileCoverage: number
  audibleSignals: number
  crosswalks: number
  cautionCount: number
  cautionSummary: string
  verified: string
  recommendation: string
  reportCount: number
  shortest: { duration: number; tactileCoverage: number; cautionCount: number }
  map: {
    path: string
    start: { left: string; top: string }
    end: { left: string; top: string }
    landmark: { name: string; left: string; top: string }
  }
  steps: RouteStep[]
}

const routeProfiles: Record<string, RouteProfile> = {
  광화문광장: {
    destination: '광화문광장', duration: 8, distance: 440, tactileCoverage: 82,
    audibleSignals: 1, crosswalks: 2, cautionCount: 2, cautionSummary: '단절 1 · 공사 1',
    verified: '최근 확인 1시간 전', reportCount: 2,
    recommendation: '최단 경로보다 약 3분 더 걸리지만, 점자블록 연결 구간이 길고 음향신호기가 있는 횡단보도를 이용합니다.',
    shortest: { duration: 5, tactileCoverage: 35, cautionCount: 5 },
    map: {
      path: 'M 155 330 C 225 300, 255 275, 305 240 S 365 190, 405 155',
      start: { left: '17%', top: '79%' }, end: { left: '56%', top: '32%' },
      landmark: { name: '세종대로 사거리', left: '39%', top: '56%' },
    },
    steps: [
      { id: 1, type: 'straight', instruction: '세종대로를 따라 직진하세요', detail: '오른쪽 점자블록을 따라 180m 이동하세요.', distance: '180m', tactilePaving: '연속', accessibilityNotes: ['점자블록 연속 구간', '보도 폭 3m 이상'] },
      { id: 2, type: 'crosswalk', instruction: '세종대로 횡단보도를 건너세요', detail: '음향 신호기가 있는 횡단보도입니다. 버튼을 누르고 신호를 들으세요.', distance: '30m', tactilePaving: '일부 단절', accessibilityNotes: ['횡단보도 앞 4m 단절', '음향신호기 있음'] },
      { id: 3, type: 'left', instruction: '왼쪽 10시 방향 광장 진입로로 이동하세요', detail: '보행 공간이 넓은 광장 남측 진입로입니다. 공사 가림막을 주의하세요.', distance: '220m', tactilePaving: '연속', accessibilityNotes: ['선형 점자블록 있음', '공사 제보 1건'] },
      { id: 4, type: 'arrival', instruction: '광화문광장에 도착합니다', detail: '오른쪽 2시 방향 10m 앞에 광장 안내소가 있습니다.', distance: '10m', tactilePaving: '미확인', accessibilityNotes: ['안내소 앞 상태 미확인'] },
    ],
  },
  서울역: {
    destination: '서울역', duration: 18, distance: 1050, tactileCoverage: 68,
    audibleSignals: 2, crosswalks: 3, cautionCount: 3, cautionSummary: '단절 1 · 혼잡 2',
    verified: '최근 확인 3시간 전', reportCount: 3,
    recommendation: '서울역 고가 하부의 복잡한 교차로를 피하고, 점자블록이 확인된 세종대로 보행로와 3번 출구 접근로를 이용합니다.',
    shortest: { duration: 14, tactileCoverage: 41, cautionCount: 6 },
    map: {
      path: 'M 520 75 C 470 125, 430 175, 380 205 S 285 265, 205 320',
      start: { left: '72%', top: '13%' }, end: { left: '25%', top: '76%' },
      landmark: { name: '숭례문', left: '49%', top: '48%' },
    },
    steps: [
      { id: 1, type: 'straight', instruction: '세종대로 남쪽 방향으로 직진하세요', detail: '왼쪽 점자블록을 따라 420m 곧게 이동하세요.', distance: '420m', tactilePaving: '연속', accessibilityNotes: ['유도형 점자블록 있음', '보도 폭 2.5m 이상'] },
      { id: 2, type: 'crosswalk', instruction: '숭례문 앞 횡단보도를 건너세요', detail: '음향 신호 버튼은 횡단보도 오른쪽에 있습니다.', distance: '45m', tactilePaving: '일부 단절', accessibilityNotes: ['진입부 3m 단절', '음향신호기 있음'] },
      { id: 3, type: 'right', instruction: '오른쪽 2시 방향 서울역 진입로로 이동하세요', detail: '버스 정류장 혼잡 구간을 왼쪽으로 피해 이동하세요.', distance: '560m', tactilePaving: '연속', accessibilityNotes: ['점자블록 연속 구간', '혼잡 제보 2건'] },
      { id: 4, type: 'arrival', instruction: '서울역 3번 출구 앞에 도착합니다', detail: '정면 5m 앞에 자동문과 점자 안내판이 있습니다.', distance: '25m', tactilePaving: '미확인', accessibilityNotes: ['자동문 앞 점자블록 상태 미확인'] },
    ],
  },
  종로구청: {
    destination: '종로구청', duration: 12, distance: 690, tactileCoverage: 76,
    audibleSignals: 1, crosswalks: 2, cautionCount: 2, cautionSummary: '단절 1 · 장애물 1',
    verified: '최근 확인 2시간 전', reportCount: 2,
    recommendation: '차량 진출입이 많은 골목 대신, 점자블록이 이어지는 종로 보행로와 구청 정문 접근로를 이용합니다.',
    shortest: { duration: 9, tactileCoverage: 38, cautionCount: 4 },
    map: {
      path: 'M 145 315 C 215 270, 285 245, 340 205 S 430 145, 520 105',
      start: { left: '16%', top: '76%' }, end: { left: '72%', top: '19%' },
      landmark: { name: '종각역', left: '43%', top: '52%' },
    },
    steps: [
      { id: 1, type: 'straight', instruction: '무교로를 따라 북쪽으로 직진하세요', detail: '오른쪽 점자블록을 따라 260m 이동하세요.', distance: '260m', tactilePaving: '연속', accessibilityNotes: ['점자블록 연속 구간', '가로수 주의'] },
      { id: 2, type: 'right', instruction: '종각역 앞에서 오른쪽 2시 방향으로 이동하세요', detail: '횡단보도 음향 신호를 확인하고 건너세요.', distance: '35m', tactilePaving: '일부 단절', accessibilityNotes: ['횡단보도 앞 2m 단절', '음향신호기 있음'] },
      { id: 3, type: 'straight', instruction: '종로구청 정문 방향으로 직진하세요', detail: '보도 오른쪽 임시 적치물을 피해 왼쪽으로 이동하세요.', distance: '380m', tactilePaving: '연속', accessibilityNotes: ['선형 점자블록 있음', '장애물 제보 1건'] },
      { id: 4, type: 'arrival', instruction: '종로구청 정문에 도착합니다', detail: '오른쪽 1시 방향 4m 앞에 출입문이 있습니다.', distance: '15m', tactilePaving: '연속', accessibilityNotes: ['경고형 점자블록 있음'] },
    ],
  },
}

const supportedDestinations = Object.keys(routeProfiles)

const fallbackReports: Report[] = [
  { id: 1, category: '공사', title: '보도 정비 공사 중', description: '점자블록 일부가 가림막으로 막혀 있어 왼쪽으로 우회해야 합니다.', location: '세종대로 사거리 북측', latitude: 37.5692, longitude: 126.9777, createdAt: new Date().toISOString(), helpfulCount: 12, status: 'active' },
  { id: 2, category: '장애물', title: '점자블록 위 공유 자전거', description: '통행로 가운데 자전거 두 대가 세워져 있습니다.', location: '광화문역 7번 출구 앞', latitude: 37.5711, longitude: 126.9769, createdAt: new Date(Date.now() - 86400000).toISOString(), helpfulCount: 8, status: 'active' },
  { id: 3, category: '점자블록', title: '횡단보도 앞 점자블록 단절', description: '횡단보도 진입 약 4m 전부터 점자블록이 끊겨 있습니다.', location: '세종대로 횡단보도 남측', latitude: 37.5702, longitude: 126.9772, createdAt: new Date(Date.now() - 3600000).toISOString(), helpfulCount: 5, status: 'active' },
]

function speak(text: string) {
  if (!('speechSynthesis' in window)) return alert('이 브라우저는 음성 안내를 지원하지 않습니다.')
  window.speechSynthesis.cancel()
  const message = new SpeechSynthesisUtterance(text)
  message.lang = 'ko-KR'
  message.rate = 0.95
  window.speechSynthesis.speak(message)
}

function tactilePavingSpeech(status: TactilePavingStatus) {
  if (status === '연속') return '점자블록이 연속으로 잘 이어져 있습니다.'
  if (status === '일부 단절') return '주의. 점자블록이 일부 단절되어 있으니 발밑을 주의하세요.'
  if (status === '없음') return '주의. 이 구간에는 점자블록이 없습니다.'
  return '주의. 이 구간의 점자블록 정보는 아직 확인되지 않았습니다.'
}

function routeStepSpeech(step: RouteStep, index: number) {
  return `${index + 1}단계 안내. ${step.distance}. ${step.instruction}. ${step.detail}. 점자블록 상태는 ${tactilePavingSpeech(step.tactilePaving)} 추가 안전 정보: ${step.accessibilityNotes.join('. ')}.`
}

function getStepDirectionInfo(step: RouteStep) {
  if (step.type === 'left') {
    return {
      clockText: '10시 방향',
      angle: -60,
      icon: <ArrowUpLeft size={44} />,
      label: '좌회전',
    }
  }
  if (step.type === 'right') {
    return {
      clockText: '2시 방향',
      angle: 60,
      icon: <ArrowUpRight size={44} />,
      label: '우회전',
    }
  }
  if (step.type === 'crosswalk') {
    return {
      clockText: '12시 횡단',
      angle: 0,
      icon: <Footprints size={44} />,
      label: '횡단보도',
    }
  }
  if (step.type === 'arrival') {
    return {
      clockText: '목적지 도착',
      angle: 0,
      icon: <MapPin size={44} />,
      label: '도착',
    }
  }
  return {
    clockText: '12시 직진',
    angle: 0,
    icon: <ArrowUp size={44} />,
    label: '직진',
  }
}

function StepIcon({ type }: { type: RouteStep['type'] }) {
  if (type === 'left') return <ArrowUpLeft size={28} aria-hidden="true" />
  if (type === 'right') return <ArrowUpRight size={28} aria-hidden="true" />
  if (type === 'arrival') return <MapPin size={28} aria-hidden="true" />
  if (type === 'crosswalk') return <Footprints size={28} aria-hidden="true" />
  return <ArrowUp size={28} aria-hidden="true" />
}

function TactileStatusBadge({ status }: { status: TactilePavingStatus }) {
  const isGood = status === '연속'
  const isDanger = status === '일부 단절' || status === '없음'
  const label = status === '연속' ? '점자블록 연속' : status === '일부 단절' ? '점자블록 단절 주의' : status === '없음' ? '점자블록 없음' : '점자블록 미확인'

  return (
    <div className={`tactile-strip-badge tactile-strip-${status.replace(' ', '-')}`} role="status">
      {isGood && <Check size={22} />}
      {isDanger && <AlertTriangle size={22} />}
      {!isGood && !isDanger && <CircleAlert size={22} />}
      <span>{label}</span>
    </div>
  )
}

function DirectionSignCard({ step, stepIndex, totalSteps }: { step?: RouteStep; stepIndex: number; totalSteps: number }) {
  const safeStep: RouteStep = step || {
    id: 0,
    type: 'straight',
    instruction: '안내에 따라 이동하세요',
    detail: '점자블록을 따라 안전하게 이동하세요.',
    distance: '100m',
    tactilePaving: '연속',
    accessibilityNotes: ['점자블록 유도 구간'],
  }
  const dirInfo = getStepDirectionInfo(safeStep)

  return (
    <div className="direction-sign-card" aria-label={`현재 안내: ${stepIndex + 1}단계, ${dirInfo.clockText}, ${safeStep.instruction}`}>
      <div className="direction-sign-header">
        <div className="sign-title">
          <Compass size={24} />
          <span>보행 방향 지시 표지판</span>
        </div>
        <span className="step-badge">{stepIndex + 1} / {Math.max(1, totalSteps)} 단계</span>
      </div>

      <div className="direction-main-row">
        <div className="compass-dial-box" aria-hidden="true">
          <div className="compass-clock-labels">
            <span className="clock-mark clock-12">12</span>
            <span className="clock-mark clock-3">3</span>
            <span className="clock-mark clock-6">6</span>
            <span className="clock-mark clock-9">9</span>
          </div>
          <div className="compass-needle" style={{ transform: `rotate(${dirInfo.angle}deg)` }}>
            {dirInfo.icon}
          </div>
        </div>

        <div className="direction-text-box">
          <div className="direction-distance-badge">
            <span>{dirInfo.clockText}</span>
            <span>·</span>
            <strong>{safeStep.distance}</strong>
          </div>
          <h2 className="direction-instruction">{safeStep.instruction}</h2>
          <p className="direction-detail">{safeStep.detail}</p>
        </div>
      </div>

      <TactileStatusBadge status={safeStep.tactilePaving} />
    </div>
  )
}

function MapPreview({ profile }: { profile?: RouteProfile }) {
  const safeProfile = profile || routeProfiles['광화문광장']
  const [zoom, setZoom] = useState(1)
  useEffect(() => { setZoom(1) }, [safeProfile?.destination])

  const steps = safeProfile?.steps || []
  const continuousCount = steps.filter((step) => step.tactilePaving === '연속').length
  const partialCount = steps.filter((step) => step.tactilePaving === '일부 단절').length
  const unknownCount = steps.filter((step) => step.tactilePaving === '미확인').length
  const destinationName = safeProfile?.destination || '목적지'
  const mapDescription = `서울시청에서 ${destinationName}까지의 고대비 경로 지도. 점자블록 연속 구간 ${continuousCount}개, 일부 단절 구간 ${partialCount}개, 미확인 구간 ${unknownCount}개`

  const landmark = safeProfile?.map?.landmark || { name: '세종대로 사거리', left: '39%', top: '56%' }
  const start = safeProfile?.map?.start || { left: '17%', top: '79%' }
  const end = safeProfile?.map?.end || { left: '56%', top: '32%' }
  const path = safeProfile?.map?.path || 'M 155 330 C 225 300, 255 275, 305 240 S 365 190, 405 155'
  const tactileCoverage = safeProfile?.tactileCoverage ?? 80
  const cautionCount = safeProfile?.cautionCount ?? 1

  return (
    <div className="map-preview" role="group" aria-label="확대와 축소가 가능한 경로 지도">
      <div className="map-canvas" role="img" aria-label={mapDescription} style={{ transform: `scale(${zoom})` }}>
        <div className="map-label" style={{ left: landmark.left, top: landmark.top }}>{landmark.name}</div>
        <div className="map-label map-destination-label" style={{ left: end.left, top: `calc(${end.top} - 38px)` }}>{destinationName}</div>
        <div className="map-label map-start-label" style={{ left: start.left, top: `calc(${start.top} + 40px)` }}>서울시청</div>
        <div className="map-road road-one" /><div className="map-road road-two" />
        <svg className="route-line" viewBox="0 0 700 390" aria-hidden="true"><path d={path} /></svg>
        <div className="map-marker marker-start" style={{ left: start.left, top: start.top, bottom: 'auto' }}><span>출발</span></div>
        <div className="map-marker marker-end" style={{ left: end.left, top: end.top }}><MapPin size={22} /><span>도착</span></div>
        <div className="hazard-dot hazard-one" title="공사 제보"><Construction size={22} /></div>
        <div className="hazard-dot hazard-two" title="장애물 제보"><AlertTriangle size={22} /></div>
        <div className="tactile-map-marker tactile-map-one"><Check size={16} /><span>점자블록 {tactileCoverage}%</span></div>
        <div className="tactile-map-marker tactile-map-two is-warning"><AlertTriangle size={16} /><span>주의 {cautionCount}구간</span></div>
      </div>
      <div className="map-controls" role="group" aria-label="지도 확대 및 축소">
        <ReleasePressButton onActivate={() => setZoom((value) => Math.min(1.8, Number((value + 0.2).toFixed(1))))} ariaLabel="지도 확대" disabled={zoom >= 1.8}><Plus size={26} /></ReleasePressButton>
        <span className="zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <ReleasePressButton onActivate={() => setZoom((value) => Math.max(1, Number((value - 0.2).toFixed(1))))} ariaLabel="지도 축소" disabled={zoom <= 1}><Minus size={26} /></ReleasePressButton>
      </div>
      <div className="map-legend" aria-hidden="true"><span><i className="legend-line is-continuous" />점자블록 연속</span><span><i className="legend-line is-partial" />일부 단절</span><span><i className="legend-line is-unknown" />미확인</span></div>
    </div>
  )
}

function ReleasePressButton({
  children, className = '', onActivate, ariaLabel, disabled = false,
}: {
  children: ReactNode
  className?: string
  onActivate: () => void
  ariaLabel?: string
  disabled?: boolean
}) {
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const ignoreNextClick = useRef(false)

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      startPoint.current = { x: event.clientX, y: event.clientY }
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!startPoint.current || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return
    const moved = Math.hypot(event.clientX - startPoint.current.x, event.clientY - startPoint.current.y)
    startPoint.current = null
    if (moved > 18) return
    ignoreNextClick.current = true
    onActivate()
    window.setTimeout(() => { ignoreNextClick.current = false }, 700)
  }

  return (
    <button
      type="button"
      className={`release-press ${className}`}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={pointerDown}
      onPointerUp={pointerUp}
      onPointerCancel={() => { startPoint.current = null }}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        if (ignoreNextClick.current) {
          ignoreNextClick.current = false
          return
        }
        onActivate()
      }}
    >
      {children}
    </button>
  )
}

function SimpleGuide({
  destination, profile, currentLocation, isDetectingLocation, isListening,
  onDestinationChange, onSelectPlace, onStart, onGuardianMode, onRefreshLocation, onStartVoiceInput,
}: {
  destination: string
  profile?: RouteProfile
  currentLocation: string
  isDetectingLocation: boolean
  isListening: boolean
  onDestinationChange: (value: string) => void
  onSelectPlace: (place: string) => void
  onStart: () => void
  onGuardianMode: () => void
  onRefreshLocation: () => void
  onStartVoiceInput: () => void
}) {
  const safeProfile = profile || routeProfiles['광화문광장']

  return (
    <div className="simple-app">
      <header className="simple-header">
        <div className="simple-brand">
          <span className="brand-mark"><Route size={34} /></span>
          <div><strong>온길</strong><span>시각장애인 고시인성 보행안내</span></div>
        </div>
        <ReleasePressButton className="guardian-mode-button" onActivate={onGuardianMode} ariaLabel="보호자 및 상세 모드로 전환">
          <Eye size={26} /><span>보호자 모드</span>
        </ReleasePressButton>
      </header>

      <main id="main" className="simple-main">
        <section className="simple-search" aria-labelledby="simple-search-title">
          <div className="simple-section-label">
            <MapPin size={30} />
            <h1 id="simple-search-title">출발지 및 목적지 설정</h1>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); onStart() }} className="simple-search-container">
            {/* 출발 위치 카드 */}
            <div className="simple-search-card" aria-label="출발 위치 정보">
              <div className="simple-card-info">
                <span className="simple-card-label">출발 위치</span>
                <strong className="simple-card-value">
                  {isDetectingLocation ? '현재 위치 감지 중...' : (currentLocation || '서울시청')}
                </strong>
              </div>
              <button
                type="button"
                className="gps-refresh-button"
                onClick={onRefreshLocation}
                aria-label="현재 위치 다시 감지하기"
                title="현재 위치 갱신"
              >
                <LocateFixed size={32} />
              </button>
            </div>

            {/* 카드 사이 세로 연결선 */}
            <div className="simple-card-connector" aria-hidden="true" />

            {/* 도착지 입력 카드 + 대형 원형 마이크 버튼 */}
            <div className={`simple-search-card ${destination ? 'active' : ''}`} aria-label="도착지 입력 및 음성 검색">
              <div className="simple-card-info">
                <label htmlFor="destination-input" className="simple-card-label">도착지</label>
                <input
                  id="destination-input"
                  className="simple-card-input"
                  value={destination}
                  onChange={(event) => onDestinationChange(event.target.value)}
                  aria-label="도착지 입력"
                  placeholder="장소를 입력하거나 마이크를 누르세요"
                />
              </div>
              <button
                type="button"
                className={`mic-large-button ${isListening ? 'is-listening' : ''}`}
                onClick={onStartVoiceInput}
                aria-label="음성으로 목적지 검색하기"
                title="음성 검색"
              >
                <Mic2 size={36} />
              </button>
            </div>

            {/* 하단 마이크 안내 문구 */}
            <div className="mic-notice-text">
              <Mic2 size={24} />
              <span>{isListening ? '음성을 듣고 있습니다... 목적지를 말씀해 주세요' : '입력창 오른쪽 마이크를 누르고 장소를 말해 주세요.'}</span>
            </div>
          </form>

          <div className="simple-quick-places" aria-label="자주 가는 목적지 선택">
            {supportedDestinations.map((place) => (
              <ReleasePressButton key={place} className={safeProfile.destination === place ? 'is-selected' : ''} onActivate={() => onSelectPlace(place)}>
                <MapPin size={24} />{place}
              </ReleasePressButton>
            ))}
          </div>
        </section>

        {/* 첫 번째 단계 방향 지시 초대형 카드 표시 */}
        <section aria-label="보행 방향 및 안전 안내">
          <DirectionSignCard step={safeProfile.steps[0]} stepIndex={0} totalSteps={safeProfile.steps.length} />
        </section>

        <section className="simple-map-block" aria-label={`${safeProfile.destination} 경로 및 지도`}>
          <div className="simple-route-card" aria-live="polite">
            <div>
              <span>도착지 표지</span>
              <strong>{safeProfile.destination}</strong>
            </div>
            <dl>
              <div><dt>예상 시간</dt><dd className="highlight">약 {safeProfile.duration}분</dd></div>
              <div><dt>보행 거리</dt><dd>{safeProfile.distance.toLocaleString()}m</dd></div>
              <div><dt>점자블록</dt><dd className="highlight">{safeProfile.tactileCoverage}%</dd></div>
            </dl>
          </div>
          <div className="simple-map-area" aria-label={`${safeProfile.destination} 고시인성 지도`}>
            <MapPreview profile={safeProfile} />
          </div>
        </section>

        <section className="simple-action-area">
          <p><Volume2 size={28} /> 버튼을 누르면 음성 길 안내가 바로 시작됩니다.</p>
          <ReleasePressButton className="simple-start-button" onActivate={onStart} ariaLabel={`${safeProfile.destination}까지 음성 길안내 시작`}>
            <Navigation size={38} />
            <span>
              <small>{safeProfile.destination}까지</small>
              음성 길안내 시작
            </span>
            <ChevronRight size={36} />
          </ReleasePressButton>
        </section>
      </main>
    </div>
  )
}

export default function Home() {
  const [mode, setMode] = useState<UserMode>('simple')
  const [page, setPage] = useState<Page>('guide')
  const [fontScale, setFontScale] = useState(1)
  const [lightMode, setLightMode] = useState(false)
  const [destination, setDestination] = useState('광화문광장')
  const [searchedDestination, setSearchedDestination] = useState('광화문광장')
  const [currentLocation, setCurrentLocation] = useState('서울시청')
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [reports, setReports] = useState<Report[]>(fallbackReports)
  const [reportOpen, setReportOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const fallbackProfile = routeProfiles['광화문광장']
  const routeProfile = routeProfiles[searchedDestination] || fallbackProfile
  const routeSteps = routeProfile?.steps || fallbackProfile.steps

  // 현재 GPS 위치 자동 감지
  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      setCurrentLocation('현재 위치 · 서울시청')
      return
    }
    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingLocation(false)
        const lat = pos.coords.latitude.toFixed(4)
        const lng = pos.coords.longitude.toFixed(4)
        setCurrentLocation(`현재 위치 (GPS ${lat}, ${lng}) · 서울시청`)
        setToast('현재 위치 감지가 완료되었습니다.')
      },
      () => {
        setIsDetectingLocation(false)
        setCurrentLocation('현재 위치 · 서울시청')
      },
      { timeout: 5000 }
    )
  }

  useEffect(() => {
    detectLocation()
    getReports().then(setReports).catch(() => setReports(fallbackReports))
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale))
    document.documentElement.classList.toggle('light-mode', lightMode)
  }, [fontScale, lightMode])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  function changePage(nextPage: Page) {
    setPage(nextPage)
    setMobileMenu(false)
    window.setTimeout(() => mainRef.current?.focus(), 0)
  }

  function searchRoute(event: FormEvent) {
    event.preventDefault()
    findRoute()
  }

  function findRoute() {
    if (!destination.trim()) return setToast('목적지를 입력해 주세요.')
    const nextDestination = destination.trim()
    if (!routeProfiles[nextDestination]) {
      return setToast(`현재 프로토타입은 ${supportedDestinations.join(', ')} 경로를 지원합니다.`)
    }
    setSearchedDestination(nextDestination)
    setActiveStep(0)
    setToast(`${nextDestination}까지 안전 경로를 찾았습니다.`)
  }

  // 지정 목적지로 즉시 음성 길안내 자동 시작
  function startSimpleGuideWithTarget(targetPlace: string) {
    const nextDestination = targetPlace.trim()
    if (!routeProfiles[nextDestination]) {
      setToast(`현재 프로토타입은 ${supportedDestinations.join(', ')} 길안내를 지원합니다.`)
      return
    }
    setDestination(nextDestination)
    setSearchedDestination(nextDestination)
    setActiveStep(0)

    const nextProfile = routeProfiles[nextDestination]
    speak(`${nextDestination}까지 안전 길안내를 시작합니다. 약 ${nextProfile.duration}분, 거리 ${nextProfile.distance}미터입니다. ${routeStepSpeech(nextProfile.steps[0], 0)}`)
    setToast(`${nextDestination} 길안내를 시작합니다.`)
  }

  function startSimpleGuide() {
    startSimpleGuideWithTarget(destination)
  }

  // 목적지 빠른 선택 시 자동으로 길안내 시작
  function selectQuickPlace(place: string) {
    startSimpleGuideWithTarget(place)
  }

  // 브라우저 음성 인식 (STT) 마이크 동작
  function startVoiceInput() {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
      || (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      speak('이 브라우저는 마이크 음성 인식을 지원하지 않습니다. 키보드로 입력하시거나 빠른 선택 버튼을 이용해 주세요.')
      setToast('이 브라우저는 음성 인식을 지원하지 않습니다.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'ko-KR'
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      setIsListening(true)
      speak('음성 인식을 시작합니다. 목적지를 말씀해 주세요.')

      recognition.onresult = (event: any) => {
        setIsListening(false)
        const speechResult = event.results[0][0].transcript.replace(/\s+/g, '')
        setToast(`인식된 목적지: ${speechResult}`)

        // 매칭되는 지원 목적지 찾기
        const matched = supportedDestinations.find((p) => speechResult.includes(p) || p.includes(speechResult))
        if (matched) {
          startSimpleGuideWithTarget(matched)
        } else {
          setDestination(speechResult)
          setToast(`'${speechResult}' 인식됨. 지원 목적지(${supportedDestinations.join(', ')}) 중 선택해 주세요.`)
        }
      }

      recognition.onerror = () => {
        setIsListening(false)
        setToast('음성을 인식하지 못했습니다. 다시 마이크를 누르고 말씀해 주세요.')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch {
      setIsListening(false)
      setToast('마이크 연결 오류가 발생했습니다.')
    }
  }

  if (mode === 'simple') {
    return (
      <>
        <SimpleGuide
          destination={destination}
          profile={routeProfile}
          currentLocation={currentLocation}
          isDetectingLocation={isDetectingLocation}
          isListening={isListening}
          onDestinationChange={setDestination}
          onSelectPlace={selectQuickPlace}
          onStart={startSimpleGuide}
          onGuardianMode={() => setMode('guardian')}
          onRefreshLocation={detectLocation}
          onStartVoiceInput={startVoiceInput}
        />
        {toast && <div className="toast" role="status"><Check size={26} />{toast}</div>}
      </>
    )
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => changePage('guide')} aria-label="온길 홈">
            <span className="brand-mark"><Route size={32} aria-hidden="true" /></span>
            <span className="brand-copy"><strong>온길</strong><small>시각장애인 고시인성 보행안내</small></span>
          </button>
          <nav className={`main-nav ${mobileMenu ? 'is-open' : ''}`} aria-label="주요 메뉴">
            <button className={page === 'guide' ? 'active' : ''} onClick={() => changePage('guide')}><Navigation size={22} /> 길 안내</button>
            <button className={page === 'reports' ? 'active' : ''} onClick={() => changePage('reports')}><AlertTriangle size={22} /> 주변 제보 <span className="count-badge">{reports.length}</span></button>
            <button className={page === 'vision' ? 'active' : ''} onClick={() => changePage('vision')}><Camera size={22} /> AI 주변 설명</button>
          </nav>
          <div className="access-tools" aria-label="화면 보기 설정">
            <button onClick={() => setMode('simple')}><Navigation size={22} /><span>간편 모드</span></button>
            <button className={lightMode ? 'selected' : ''} onClick={() => setLightMode((value) => !value)} aria-pressed={lightMode}><Eye size={22} /><span>밝은 고대비</span></button>
            <div className="font-controls"><button onClick={() => setFontScale((v) => Math.max(0.9, v - 0.1))} aria-label="글자 작게">가−</button><button onClick={() => setFontScale((v) => Math.min(1.3, v + 0.1))} aria-label="글자 크게">가+</button></div>
          </div>
          <button className="menu-button" onClick={() => setMobileMenu((v) => !v)} aria-expanded={mobileMenu} aria-label="메뉴 열기">{mobileMenu ? <X size={30} /> : <Menu size={30} />}</button>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1}>
        {page === 'guide' && (
          <>
            <section className="hero">
              <div className="hero-inner">
                <div className="hero-copy">
                  <span className="eyebrow"><ShieldCheck size={22} /> 점자블록 & 음향신호기 우선 안전 경로</span>
                  <h1>선명하게 보고, 안전하게 걸어요.</h1>
                  <p>도로 표지판 표준 고대비 배색과 초대형 방향 안내로 길을 찾습니다.</p>
                </div>
                <form className="route-search" onSubmit={searchRoute}>
                  <div className="search-fields">
                    <label className="location-field">
                      <span className="field-icon start-dot" aria-hidden="true" />
                      <span className="field-copy"><small>출발지</small><input value="현재 위치 · 서울시청" readOnly aria-label="출발지" /></span>
                      <button type="button" className="locate-button" aria-label="현재 위치 다시 찾기" onClick={() => setToast('현재 위치를 서울시청으로 확인했습니다.')}><Crosshair size={26} /></button>
                    </label>
                    <label className="location-field">
                      <MapPin className="field-icon" size={26} aria-hidden="true" />
                      <span className="field-copy"><small>목적지</small><input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="어디로 갈까요?" /></span>
                      {destination && <button type="button" className="clear-button" onClick={() => setDestination('')} aria-label="목적지 지우기"><X size={24} /></button>}
                    </label>
                  </div>
                  <button className="primary-button search-button" type="submit"><Search size={26} /> 안전 경로 찾기</button>
                  <div className="quick-places">
                    <span>빠른 선택</span>
                    {supportedDestinations.map((place) => (
                      <button key={place} type="button" aria-pressed={searchedDestination === place} onClick={() => selectQuickPlace(place)}>{place}</button>
                    ))}
                  </div>
                </form>
              </div>
            </section>

            <section className="route-section content-width" aria-labelledby="route-title">
              <div className="section-heading">
                <div><span className="section-kicker">추천 안전 표지</span><h2 id="route-title">{searchedDestination}까지 안전 경로</h2></div>
                <div className="route-summary"><span><strong>약 {routeProfile.duration}분</strong> 소요</span><span><strong>{routeProfile.distance.toLocaleString()}m</strong> 거리</span><span className="safe-score"><ShieldCheck size={22} /><strong>안전 경로</strong></span></div>
              </div>

              {/* 현재 선택된 단계의 초대형 방향 지시 표지판 */}
              <div style={{ marginBottom: '24px' }}>
                <DirectionSignCard step={routeSteps[activeStep]} stepIndex={activeStep} totalSteps={routeSteps.length} />
              </div>

              <div className="accessibility-summary" aria-label="경로 접근성 요약">
                <div className="access-summary-intro"><span><Accessibility size={28} /></span><div><strong>보행 접근성 요약</strong><small>점자블록 및 음향신호기 정보</small></div></div>
                <dl>
                  <div><dt>점자블록 연결률</dt><dd><strong>{routeProfile.tactileCoverage}%</strong><span className="coverage-bar" aria-hidden="true"><i style={{ width: `${routeProfile.tactileCoverage}%` }} /></span></dd></div>
                  <div><dt>음향 신호기</dt><dd><strong>{routeProfile.audibleSignals}개</strong><small>횡단보도 {routeProfile.crosswalks}개 중</small></dd></div>
                  <div><dt>주의 구간</dt><dd><strong>{routeProfile.cautionCount}개</strong><small>{routeProfile.cautionSummary}</small></dd></div>
                  <div><dt>정보 신뢰도</dt><dd><strong>검증 완료</strong><small>{routeProfile.verified}</small></dd></div>
                </dl>
              </div>

              <div className="recommendation-reason">
                <ShieldCheck size={26} />
                <p><strong>추천 이유:</strong> {routeProfile.recommendation}</p>
              </div>

              <div className="route-grid">
                <div className="map-card">
                  <MapPreview profile={routeProfile} />
                  <div className="map-notice">
                    <AlertTriangle size={26} />
                    <span>경로 주변에 <strong>{routeProfile.reportCount}건의 제보</strong>가 등록되어 있습니다.</span>
                    <button onClick={() => changePage('reports')}>제보 확인 <ChevronRight size={20} /></button>
                  </div>
                </div>

                <aside className="guide-card" aria-label="단계별 길 안내">
                  <div className="guide-header">
                    <div><span className="live-dot">단계별 안내</span><h3>보행 순서 목록</h3></div>
                    <button className="voice-all" onClick={() => speak(`전체 경로 음성 안내를 시작합니다. ${routeSteps.map(routeStepSpeech).join(' 다음, ')}`)}>
                      <Volume2 size={22} /> 전체 듣기
                    </button>
                  </div>
                  <ol className="steps-list">
                    {routeSteps.map((step, index) => (
                      <li key={step.id} className={activeStep === index ? 'active' : ''}>
                        <button onClick={() => { setActiveStep(index); speak(routeStepSpeech(step, index)) }}>
                          <span className="step-icon"><StepIcon type={step.type} /></span>
                          <span className="step-copy">
                            <small>{index + 1}단계 · {step.distance}</small>
                            <strong>{step.instruction}</strong>
                            <span>{step.detail}</span>
                            <span className="accessibility-notes">{step.accessibilityNotes.join(' · ')}</span>
                          </span>
                          <Volume2 className="step-sound" size={24} aria-label="이 단계 음성 듣기" />
                        </button>
                      </li>
                    ))}
                  </ol>
                  <button className="primary-button start-guide" onClick={() => speak(`길안내를 시작합니다. ${routeStepSpeech(routeSteps[0], 0)}`)}>
                    <Navigation size={26} /> 1단계부터 음성 안내 시작
                  </button>
                </aside>
              </div>

              <div className="route-comparison">
                <div><span className="section-kicker">안전도 비교</span><h3>점자블록이 확인된 안전 경로를 최우선으로 안내합니다.</h3></div>
                <div className="comparison-table-wrap">
                  <table>
                    <caption className="sr-only">{searchedDestination} 추천 안전 경로와 최단 경로 비교</caption>
                    <thead><tr><th scope="col">경로 구분</th><th scope="col">예상 시간</th><th scope="col">점자블록 연결률</th><th scope="col">주의 구간</th></tr></thead>
                    <tbody>
                      <tr className="recommended">
                        <th scope="row"><ShieldCheck size={22} /> 추천 안전 경로</th>
                        <td>{routeProfile.duration}분</td>
                        <td><strong>{routeProfile.tactileCoverage}%</strong></td>
                        <td>{routeProfile.cautionCount}개</td>
                      </tr>
                      <tr>
                        <th scope="row"><Route size={22} /> 일반 최단 경로</th>
                        <td>{routeProfile.shortest.duration}분</td>
                        <td>{routeProfile.shortest.tactileCoverage}%</td>
                        <td>{routeProfile.shortest.cautionCount}개</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="support-strip">
              <div className="content-width support-inner">
                <div className="support-copy">
                  <span className="support-icon"><MessageSquarePlus size={32} /></span>
                  <div>
                    <h2>보행 장애물이나 공사를 발견하셨나요?</h2>
                    <p>여러분의 제보가 시각장애인 보행자의 안전한 길이 됩니다.</p>
                  </div>
                </div>
                <button onClick={() => setReportOpen(true)}>주변 상황 제보하기 <ChevronRight size={24} /></button>
              </div>
            </section>
          </>
        )}

        {page === 'reports' && (
          <ReportsPage
            reports={reports}
            onHelpful={async (id) => {
              try {
                const updated = await markHelpful(id)
                setReports((current) => current.map((report) => report.id === id ? updated : report))
              } catch {
                setReports((current) => current.map((report) => report.id === id ? { ...report, helpfulCount: report.helpfulCount + 1 } : report))
              }
              setToast('도움이 되었다는 의견을 반영했습니다.')
            }}
            onOpenReport={() => setReportOpen(true)}
          />
        )}

        {page === 'vision' && <VisionPage onToast={setToast} />}
      </main>

      <footer>
        <div className="content-width footer-inner">
          <div className="footer-brand"><span className="brand-mark"><Route size={26} /></span><strong>온길</strong></div>
          <p>시각장애인을 위한 고시인성 보행 길 안내 서비스</p>
          <span>방향 검증용 프로토타입 · 실제 보행 시 흰지팡이 등 기존 보조 수단을 함께 사용하세요.</span>
        </div>
      </footer>

      {reportOpen && (
        <ReportDialog
          onClose={() => setReportOpen(false)}
          onCreated={(report) => {
            setReports((current) => [report, ...current])
            setReportOpen(false)
            setToast('새로운 제보가 등록되었습니다. 감사합니다.')
          }}
        />
      )}
      {toast && <div className="toast" role="status"><Check size={26} />{toast}</div>}
    </div>
  )
}

function ReportsPage({ reports, onHelpful, onOpenReport }: { reports: Report[]; onHelpful: (id: number) => void; onOpenReport: () => void }) {
  const [filter, setFilter] = useState<'전체' | ReportCategory>('전체')
  const filtered = filter === '전체' ? reports : reports.filter((report) => report.category === filter)

  return (
    <section className="subpage content-width">
      <div className="subpage-header">
        <div>
          <span className="eyebrow"><Bell size={22} /> 실시간 안전 제보</span>
          <h1>주변 보행 환경 제보</h1>
          <p>공사 구역과 점자블록 단절, 장애물 정보를 확인하세요.</p>
        </div>
        <button className="primary-button" onClick={onOpenReport}><MessageSquarePlus size={24} /> 새 제보 등록하기</button>
      </div>

      <div className="report-layout">
        <div>
          <div className="filter-row">
            {(['전체', '공사', '장애물', '점자블록', '보도 불편'] as const).map((item) => (
              <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <div className="report-list">
            {filtered.map((report) => (
              <article className="report-card" key={report.id}>
                <div className="report-symbol"><ReportCategoryIcon category={report.category} /></div>
                <div className="report-body">
                  <div className="report-meta"><span>{report.category}</span><time>{formatRelative(report.createdAt)}</time></div>
                  <h2>{report.title}</h2>
                  <p>{report.description}</p>
                  <div className="report-location"><MapPin size={20} />{report.location}</div>
                </div>
                <button className="helpful-button" onClick={() => onHelpful(report.id)}>
                  <ThumbsUp size={22} />
                  <span>도움돼요</span>
                  <strong>{report.helpfulCount}</strong>
                </button>
              </article>
            ))}
          </div>
        </div>
        <aside className="report-side">
          <MapPreview profile={routeProfiles['광화문광장']} />
          <div className="community-stat">
            <strong>{reports.length}</strong>
            <span>건의 최신 제보가<br />안전 경로에 반영되고 있습니다.</span>
          </div>
        </aside>
      </div>
    </section>
  )
}

function ReportCategoryIcon({ category }: { category: ReportCategory }) {
  if (category === '공사') return <Construction size={28} />
  if (category === '장애물') return <AlertTriangle size={28} />
  if (category === '점자블록') return <Accessibility size={28} />
  if (category === '보도 불편') return <Footprints size={28} />
  return <CircleAlert size={28} />
}

function VisionPage({ onToast }: { onToast: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ summary: string; details: string[]; caution: string } | null>(null)

  function chooseFile(nextFile?: File) {
    if (!nextFile) return
    if (!nextFile.type.startsWith('image/')) return onToast('이미지 파일을 선택해 주세요.')
    if (preview) URL.revokeObjectURL(preview)
    setFile(nextFile)
    setResult(null)
    setPreview(URL.createObjectURL(nextFile))
  }

  async function runAnalysis() {
    if (!file) return
    setLoading(true)
    try {
      setResult(await analyzeScene(file))
    } catch {
      setResult({
        summary: '앞쪽 보행로는 대체로 평탄하며, 오른쪽 가장자리에 장애물이 있습니다.',
        details: [
          '약 3m 앞 오른쪽에 세워진 자전거가 있습니다.',
          '왼쪽 점자블록은 연속으로 이어져 있습니다.',
          '정면에 횡단보도 진입부가 보입니다.',
        ],
        caution: '사진 한 장을 바탕으로 한 데모 설명입니다. 실제 보행 안전을 보장하지 않습니다.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="subpage vision-page content-width">
      <div className="subpage-header">
        <div>
          <span className="eyebrow"><Sparkles size={22} /> AI 시각 보조 기능</span>
          <h1>AI 주변 상황 음성 설명</h1>
          <p>카메라로 촬영한 사진을 올리면 보행로 상태와 장애물을 큰 글자와 음성으로 설명합니다.</p>
        </div>
      </div>

      <div className="vision-grid">
        <div className="upload-card">
          <div className="upload-heading">
            <span><Camera size={30} /></span>
            <div><h2>주변 사진 올리기</h2><p>JPG, PNG · 최대 10MB</p></div>
          </div>
          <label className={`drop-zone ${preview ? 'has-preview' : ''}`}>
            {preview ? (
              <img src={preview} alt="분석할 주변 사진 미리보기" />
            ) : (
              <>
                <Upload size={52} />
                <strong>사진을 선택하거나 여기에 놓으세요</strong>
                <span>정면 보행로를 촬영한 사진이 좋습니다.</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={(e) => chooseFile(e.target.files?.[0])} />
          </label>
          {file && (
            <div className="file-row">
              <span><Check size={20} /> {file.name}</span>
              <button onClick={() => { URL.revokeObjectURL(preview); setFile(null); setPreview(''); setResult(null) }}>삭제</button>
            </div>
          )}
          <button className="primary-button analyze-button" disabled={!file || loading} onClick={runAnalysis}>
            {loading ? <><span className="spinner" /> 주변을 분석하는 중…</> : <><Sparkles size={24} /> 사진 설명 생성하기</>}
          </button>
        </div>

        <div className={`result-card ${result ? 'has-result' : ''}`} aria-live="polite">
          {result ? (
            <>
              <div className="result-heading">
                <span><AudioLines size={30} /></span>
                <div><small>AI 주변 설명 결과</small><h2>{result.summary}</h2></div>
              </div>
              <ul>
                {result.details.map((detail) => (
                  <li key={detail}><Check size={22} /><span>{detail}</span></li>
                ))}
              </ul>
              <div className="caution-box">
                <ShieldAlert size={26} />
                <span>{result.caution}</span>
              </div>
              <button className="listen-button" onClick={() => speak(`${result.summary}. ${result.details.join('. ')}. 주의. ${result.caution}`)}>
                <Volume2 size={26} /> 설명 음성으로 전체 듣기
              </button>
            </>
          ) : (
            <div className="result-placeholder">
              <span><Mic2 size={38} /></span>
              <h2>사진 설명이 여기에 표시됩니다</h2>
              <p>화면 낭독기와 큰 글자에 최적화된 구체적인 문장으로 안내합니다.</p>
            </div>
          )}
        </div>
      </div>

      <div className="scope-note">
        <Accessibility size={28} />
        <div>
          <strong>프로토타입 안내 사항</strong>
          <p>실시간 충돌 방지가 아닌, 촬영한 이미지 한 장을 분석하는 사용자 흐름 검증용 기능입니다.</p>
        </div>
      </div>
    </section>
  )
}

function ReportDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (report: Report) => void }) {
  const [category, setCategory] = useState<ReportCategory>('장애물')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('광화문광장 인근')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      onCreated(await createReport({ category, title, description, location }))
    } catch {
      onCreated({
        id: Date.now(), category, title, description, location,
        latitude: null, longitude: null, createdAt: new Date().toISOString(),
        helpfulCount: 0, status: 'active',
      })
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-header">
          <div><span>안전 정보 등록</span><h2 id="dialog-title">보행 장애물 / 공사 제보</h2></div>
          <button onClick={onClose} aria-label="제보 창 닫기"><X size={26} /></button>
        </div>
        <form onSubmit={submit}>
          <fieldset>
            <legend>어떤 상황인가요?</legend>
            <div className="category-grid">
              {(['장애물', '공사', '점자블록', '보도 불편', '기타'] as ReportCategory[]).map((item) => (
                <button className={category === item ? 'active' : ''} type="button" key={item} onClick={() => setCategory(item)}>
                  <ReportCategoryIcon category={item} />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            제목
            <input required value={title} maxLength={50} onChange={(e) => setTitle(e.target.value)} placeholder="예: 점자블록 위 공유 자전거 방치" />
          </label>
          <label>
            자세한 위치 및 설명
            <textarea required value={description} maxLength={240} onChange={(e) => setDescription(e.target.value)} placeholder="위치와 안전하게 우회하는 방법을 구체적으로 작성해 주세요." />
          </label>
          <label>
            위치 명칭
            <div className="input-with-icon">
              <LocateFixed size={24} />
              <input required value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </label>
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>취소</button>
            <button className="primary-button" disabled={saving} type="submit">{saving ? '등록 중…' : '제보 등록 완료'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function formatRelative(date: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3600000))
  if (hours < 1) return '방금 전'
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}
