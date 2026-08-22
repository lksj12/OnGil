'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import {
  Accessibility, AlertTriangle, ArrowLeft, ArrowRight, AudioLines, Bell, Camera,
  Check, ChevronRight, CircleAlert, Construction, Crosshair, Eye, Footprints,
  LocateFixed, MapPin, Menu, MessageSquarePlus, Mic2, Minus, Navigation, Plus,
  Route, Search, ShieldCheck, Sparkles, ThumbsUp, Upload, Volume2, X,
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
      { id: 1, type: 'straight', instruction: '세종대로를 따라 직진하세요', detail: '오른쪽 점자블록을 따라 이동하세요.', distance: '180m', tactilePaving: '연속', accessibilityNotes: ['점자블록 연속 구간', '보도 폭 3m 이상'] },
      { id: 2, type: 'crosswalk', instruction: '세종대로 횡단보도를 건너세요', detail: '음향 신호기가 있는 횡단보도입니다.', distance: '30m', tactilePaving: '일부 단절', accessibilityNotes: ['횡단보도 앞 4m 단절', '음향신호기 있음'] },
      { id: 3, type: 'left', instruction: '왼쪽 10시 방향 광장 진입로로 이동하세요', detail: '보행 공간이 넓은 광장 남측 진입로입니다.', distance: '220m', tactilePaving: '연속', accessibilityNotes: ['선형 점자블록 있음', '공사 제보 1건'] },
      { id: 4, type: 'arrival', instruction: '광화문광장에 도착합니다', detail: '오른쪽 2시 방향에 광장 안내소가 있습니다.', distance: '10m', tactilePaving: '미확인', accessibilityNotes: ['안내소 앞 상태 미확인'] },
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
      { id: 1, type: 'straight', instruction: '세종대로 남쪽 방향으로 직진하세요', detail: '왼쪽 점자블록을 따라 이동하세요.', distance: '420m', tactilePaving: '연속', accessibilityNotes: ['유도형 점자블록 있음', '보도 폭 2.5m 이상'] },
      { id: 2, type: 'crosswalk', instruction: '숭례문 앞 횡단보도를 건너세요', detail: '음향 신호 버튼은 횡단보도 오른쪽에 있습니다.', distance: '45m', tactilePaving: '일부 단절', accessibilityNotes: ['진입부 3m 단절', '음향신호기 있음'] },
      { id: 3, type: 'right', instruction: '오른쪽 2시 방향 서울역 진입로로 이동하세요', detail: '버스 정류장 혼잡 구간을 왼쪽으로 피해 이동하세요.', distance: '560m', tactilePaving: '연속', accessibilityNotes: ['점자블록 연속 구간', '혼잡 제보 2건'] },
      { id: 4, type: 'arrival', instruction: '서울역 3번 출구 앞에 도착합니다', detail: '정면 5m 앞에 자동문이 있습니다.', distance: '25m', tactilePaving: '미확인', accessibilityNotes: ['자동문 앞 점자블록 상태 미확인'] },
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
      { id: 1, type: 'straight', instruction: '무교로를 따라 북쪽으로 직진하세요', detail: '오른쪽 점자블록을 따라 이동하세요.', distance: '260m', tactilePaving: '연속', accessibilityNotes: ['점자블록 연속 구간', '가로수 주의'] },
      { id: 2, type: 'right', instruction: '종각역 앞에서 오른쪽 2시 방향으로 이동하세요', detail: '횡단보도 음향 신호를 확인하세요.', distance: '35m', tactilePaving: '일부 단절', accessibilityNotes: ['횡단보도 앞 2m 단절', '음향신호기 있음'] },
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
  message.rate = .95
  window.speechSynthesis.speak(message)
}

function tactilePavingSpeech(status: TactilePavingStatus) {
  if (status === '연속') return '점자블록이 연속으로 이어져 있습니다.'
  if (status === '일부 단절') return '주의. 점자블록이 일부 단절되어 있습니다.'
  if (status === '없음') return '주의. 이 구간에는 점자블록이 없습니다.'
  return '주의. 이 구간의 점자블록 정보는 아직 확인되지 않았습니다.'
}

function routeStepSpeech(step: RouteStep, index: number) {
  return `${index + 1}단계, ${step.distance}. ${tactilePavingSpeech(step.tactilePaving)} ${step.instruction}. ${step.detail}. 추가 접근성 정보. ${step.accessibilityNotes.join('. ')}.`
}

function StepIcon({ type }: { type: RouteStep['type'] }) {
  if (type === 'left') return <ArrowLeft aria-hidden="true" />
  if (type === 'right') return <ArrowRight aria-hidden="true" />
  if (type === 'arrival') return <MapPin aria-hidden="true" />
  if (type === 'crosswalk') return <Footprints aria-hidden="true" />
  return <Navigation aria-hidden="true" />
}

function TactileStatus({ status }: { status: TactilePavingStatus }) {
  const label = status === '연속' ? '점자블록 있음' : status === '일부 단절' ? '점자블록 일부 단절' : status === '없음' ? '점자블록 없음' : '점자블록 정보 미확인'
  return <span className={`tactile-status tactile-${status.replace(' ', '-')}`}>{status === '연속' ? <Check size={14} /> : <CircleAlert size={14} />} {label}</span>
}

function MapPreview({ profile }: { profile: RouteProfile }) {
  const [zoom, setZoom] = useState(1)
  useEffect(() => { setZoom(1) }, [profile.destination])
  const continuousCount = profile.steps.filter((step) => step.tactilePaving === '연속').length
  const partialCount = profile.steps.filter((step) => step.tactilePaving === '일부 단절').length
  const unknownCount = profile.steps.filter((step) => step.tactilePaving === '미확인').length
  const mapDescription = `서울시청에서 ${profile.destination}까지의 예시 경로 지도. 점자블록 연속 구간 ${continuousCount}개, 일부 단절 구간 ${partialCount}개, 미확인 구간 ${unknownCount}개`
  return (
    <div className="map-preview" role="group" aria-label="확대와 축소가 가능한 경로 지도">
      <div className="map-canvas" role="img" aria-label={mapDescription} style={{ transform: `scale(${zoom})` }}>
        <div className="map-label" style={{ left: profile.map.landmark.left, top: profile.map.landmark.top }}>{profile.map.landmark.name}</div>
        <div className="map-label map-destination-label" style={{ left: profile.map.end.left, top: `calc(${profile.map.end.top} - 30px)` }}>{profile.destination}</div>
        <div className="map-label map-start-label" style={{ left: profile.map.start.left, top: `calc(${profile.map.start.top} + 34px)` }}>서울시청</div>
        <div className="map-road road-one" /><div className="map-road road-two" />
        <svg className="route-line" viewBox="0 0 700 390" aria-hidden="true"><path d={profile.map.path} /></svg>
        <div className="map-marker marker-start" style={{ left: profile.map.start.left, top: profile.map.start.top, bottom: 'auto' }}><span>출발</span></div>
        <div className="map-marker marker-end" style={{ left: profile.map.end.left, top: profile.map.end.top }}><MapPin size={18} /><span>도착</span></div>
        <div className="hazard-dot hazard-one" title="공사 제보"><Construction size={16} /></div>
        <div className="hazard-dot hazard-two" title="장애물 제보"><AlertTriangle size={16} /></div>
        <div className="tactile-map-marker tactile-map-one"><Check size={13} /><span>점자블록 {profile.tactileCoverage}%</span></div>
        <div className="tactile-map-marker tactile-map-two is-warning"><CircleAlert size={13} /><span>주의 {profile.cautionCount}구간</span></div>
      </div>
      <div className="map-controls" role="group" aria-label="지도 확대 및 축소">
        <ReleasePressButton onActivate={() => setZoom((value) => Math.min(1.8, Number((value + .2).toFixed(1))))} ariaLabel="지도 확대" disabled={zoom >= 1.8}><Plus size={22} /></ReleasePressButton>
        <span className="zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <ReleasePressButton onActivate={() => setZoom((value) => Math.max(1, Number((value - .2).toFixed(1))))} ariaLabel="지도 축소" disabled={zoom <= 1}><Minus size={22} /></ReleasePressButton>
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
  destination, profile, onDestinationChange, onSelectPlace, onStart, onGuardianMode,
}: {
  destination: string
  profile: RouteProfile
  onDestinationChange: (value: string) => void
  onSelectPlace: (place: string) => void
  onStart: () => void
  onGuardianMode: () => void
}) {
  return (
    <div className="simple-app">
      <header className="simple-header">
        <div className="simple-brand"><span className="brand-mark"><Route size={29} /></span><div><strong>온길</strong><span>쉬운 길안내</span></div></div>
        <ReleasePressButton className="guardian-mode-button" onActivate={onGuardianMode} ariaLabel="보호자 모드로 전환">
          <Eye size={23} /><span>보호자용</span>
        </ReleasePressButton>
      </header>

      <main id="main" className="simple-main">
        <section className="simple-search" aria-labelledby="simple-search-title">
          <div className="simple-section-label"><MapPin size={24} /><h1 id="simple-search-title">어디로 갈까요?</h1></div>
          <form onSubmit={(event) => { event.preventDefault(); onStart() }}>
            <label className="simple-current-location"><span>출발</span><strong>현재 위치 · 서울시청</strong><LocateFixed size={25} /></label>
            <label className="simple-destination"><span>도착</span><input value={destination} onChange={(event) => onDestinationChange(event.target.value)} aria-label="목적지" placeholder="목적지를 입력하세요" /></label>
          </form>
          <div className="simple-quick-places" aria-label="빠른 목적지 선택">
            {supportedDestinations.map((place) => (
              <ReleasePressButton key={place} className={profile.destination === place ? 'is-selected' : ''} onActivate={() => onSelectPlace(place)}>
                <MapPin size={20} />{place}
              </ReleasePressButton>
            ))}
          </div>
        </section>

        <section className="simple-map-block" aria-label={`${profile.destination} 경로 정보`}>
          <div className="simple-route-card" aria-live="polite">
            <div><span>도착지</span><strong>{profile.destination}</strong></div>
            <dl><div><dt>시간</dt><dd>약 {profile.duration}분</dd></div><div><dt>거리</dt><dd>{profile.distance.toLocaleString()}m</dd></div><div><dt>점자블록</dt><dd>{profile.tactileCoverage}%</dd></div></dl>
          </div>
          <div className="simple-map-area" aria-label={`${profile.destination} 길안내 지도`}>
            <MapPreview profile={profile} />
          </div>
        </section>

        <section className="simple-action-area">
          <p><Volume2 size={24} /> 누르면 점자블록 상태부터 음성으로 안내합니다.</p>
          <ReleasePressButton className="simple-start-button" onActivate={onStart} ariaLabel={`${profile.destination}까지 길안내 시작`}>
            <Navigation size={32} /><span><small>{profile.destination}까지</small>길안내 시작</span><ChevronRight size={31} />
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
  const [highContrast, setHighContrast] = useState(false)
  const [destination, setDestination] = useState('광화문광장')
  const [searchedDestination, setSearchedDestination] = useState('광화문광장')
  const [activeStep, setActiveStep] = useState(0)
  const [reports, setReports] = useState<Report[]>(fallbackReports)
  const [reportOpen, setReportOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const routeProfile = routeProfiles[searchedDestination]
  const routeSteps = routeProfile.steps

  useEffect(() => { getReports().then(setReports).catch(() => setReports(fallbackReports)) }, [])
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale))
    document.documentElement.classList.toggle('high-contrast', highContrast)
  }, [fontScale, highContrast])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3000)
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

  function startSimpleGuide() {
    const nextDestination = destination.trim()
    if (!routeProfiles[nextDestination]) {
      setToast(`현재는 ${supportedDestinations.join(', ')} 길안내를 이용할 수 있습니다.`)
      return
    }
    if (searchedDestination !== nextDestination) {
      setSearchedDestination(nextDestination)
      setActiveStep(0)
    }
    const nextProfile = routeProfiles[nextDestination]
    speak(`${nextDestination}까지 길안내를 시작합니다. 약 ${nextProfile.duration}분, ${nextProfile.distance}미터입니다. ${routeStepSpeech(nextProfile.steps[0], 0)}`)
    setToast(`${nextDestination} 길안내를 시작합니다.`)
  }

  function selectQuickPlace(place: string) {
    setDestination(place)
    setSearchedDestination(place)
    setActiveStep(0)
    setToast(`${place}까지 안전 경로를 표시했습니다.`)
  }

  if (mode === 'simple') {
    return <>
      <SimpleGuide
        destination={destination}
        profile={routeProfile}
        onDestinationChange={setDestination}
        onSelectPlace={selectQuickPlace}
        onStart={startSimpleGuide}
        onGuardianMode={() => setMode('guardian')}
      />
      {toast && <div className="toast" role="status"><Check size={19} />{toast}</div>}
    </>
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => changePage('guide')} aria-label="온길 홈">
            <span className="brand-mark"><Route size={25} aria-hidden="true" /></span>
            <span className="brand-copy"><strong>온길</strong><small>모두의 안전한 길</small></span>
          </button>
          <nav className={`main-nav ${mobileMenu ? 'is-open' : ''}`} aria-label="주요 메뉴">
            <button className={page === 'guide' ? 'active' : ''} onClick={() => changePage('guide')}><Navigation size={18} /> 길 안내</button>
            <button className={page === 'reports' ? 'active' : ''} onClick={() => changePage('reports')}><CircleAlert size={18} /> 주변 제보 <span className="count-badge">{reports.length}</span></button>
            <button className={page === 'vision' ? 'active' : ''} onClick={() => changePage('vision')}><Camera size={18} /> AI 주변 설명</button>
          </nav>
          <div className="access-tools" aria-label="화면 보기 설정">
            <button onClick={() => setMode('simple')}><Navigation size={19} /><span>간편 모드</span></button>
            <button className={highContrast ? 'selected' : ''} onClick={() => setHighContrast((value) => !value)} aria-pressed={highContrast}><Eye size={19} /><span>고대비</span></button>
            <div className="font-controls"><button onClick={() => setFontScale((v) => Math.max(.9, v - .1))} aria-label="글자 작게">가−</button><button onClick={() => setFontScale((v) => Math.min(1.25, v + .1))} aria-label="글자 크게">가+</button></div>
          </div>
          <button className="menu-button" onClick={() => setMobileMenu((v) => !v)} aria-expanded={mobileMenu} aria-label="메뉴 열기">{mobileMenu ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1}>
        {page === 'guide' && <>
          <section className="hero">
            <div className="hero-inner">
              <div className="hero-copy"><span className="eyebrow"><ShieldCheck size={17} /> 접근성 우선 안전 경로</span><h1>오늘도, 안심하고 걸어요.</h1><p>목적지만 알려주세요. 더 안전하고 편안한 길을 함께 찾을게요.</p></div>
              <form className="route-search" onSubmit={searchRoute}>
                <div className="search-fields">
                  <label className="location-field"><span className="field-icon start-dot" aria-hidden="true" /><span className="field-copy"><small>출발지</small><input value="현재 위치 · 서울시청" readOnly aria-label="출발지" /></span><button type="button" className="locate-button" aria-label="현재 위치 다시 찾기" onClick={() => setToast('현재 위치를 서울시청으로 확인했습니다.')}><Crosshair size={20} /></button></label>
                  <label className="location-field"><MapPin className="field-icon" size={20} aria-hidden="true" /><span className="field-copy"><small>목적지</small><input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="어디로 갈까요?" /></span>{destination && <button type="button" className="clear-button" onClick={() => setDestination('')} aria-label="목적지 지우기"><X size={18} /></button>}</label>
                </div>
                <button className="primary-button search-button" type="submit"><Search size={21} /> 안전한 길 찾기</button>
                <div className="quick-places"><span>빠른 선택</span>{supportedDestinations.map((place) => <button key={place} type="button" aria-pressed={searchedDestination === place} onClick={() => selectQuickPlace(place)}>{place}</button>)}</div>
              </form>
            </div>
          </section>

          <section className="route-section content-width" aria-labelledby="route-title">
            <div className="section-heading">
              <div><span className="section-kicker">추천 경로</span><h2 id="route-title">{searchedDestination}까지 안전 경로</h2></div>
              <div className="route-summary"><span><strong>약 {routeProfile.duration}분</strong> 예상</span><span><strong>{routeProfile.distance.toLocaleString()}m</strong> 거리</span><span className="safe-score"><ShieldCheck size={17} /><strong>안전도 높음</strong></span></div>
            </div>
            <div className="accessibility-summary" aria-label="경로 접근성 요약">
              <div className="access-summary-intro"><span><Accessibility size={20} /></span><div><strong>접근성 경로 정보</strong><small>사용자 제보와 예시 데이터를 반영했어요.</small></div></div>
              <dl>
                <div><dt>점자블록 연결률</dt><dd><strong>{routeProfile.tactileCoverage}%</strong><span className="coverage-bar" aria-hidden="true"><i style={{ width: `${routeProfile.tactileCoverage}%` }} /></span></dd></div>
                <div><dt>음향신호기</dt><dd><strong>{routeProfile.audibleSignals}개</strong><small>횡단보도 {routeProfile.crosswalks}개 중</small></dd></div>
                <div><dt>주의 구간</dt><dd><strong>{routeProfile.cautionCount}개</strong><small>{routeProfile.cautionSummary}</small></dd></div>
                <div><dt>정보 신뢰도</dt><dd><strong>제보 기반</strong><small>{routeProfile.verified}</small></dd></div>
              </dl>
            </div>
            <div className="recommendation-reason"><ShieldCheck size={20} /><p><strong>이 경로를 추천하는 이유</strong> {routeProfile.recommendation}</p></div>
            <div className="route-grid">
              <div className="map-card">
                <MapPreview profile={routeProfile} />
                <div className="map-notice"><AlertTriangle size={18} /><span>경로 주변에 <strong>{routeProfile.reportCount}건의 제보</strong>가 있어요.</span><button onClick={() => changePage('reports')}>확인하기 <ChevronRight size={16} /></button></div>
              </div>
              <aside className="guide-card" aria-label="단계별 길 안내">
                <div className="guide-header"><div><span className="live-dot">안내 준비</span><h3>단계별 음성 안내</h3></div><button className="voice-all" onClick={() => speak(`전체 경로 안내를 시작합니다. ${routeSteps.map(routeStepSpeech).join(' 다음, ')}`)}><Volume2 size={18} /> 전체 듣기</button></div>
                <ol className="steps-list">{routeSteps.map((step, index) => <li key={step.id} className={activeStep === index ? 'active' : ''}><button onClick={() => { setActiveStep(index); speak(routeStepSpeech(step, index)) }}><span className="step-icon"><StepIcon type={step.type} /></span><span className="step-copy"><small>{index + 1}단계 · {step.distance}</small><strong>{step.instruction}</strong><span>{step.detail}</span><TactileStatus status={step.tactilePaving} /><span className="accessibility-notes">{step.accessibilityNotes.join(' · ')}</span></span><Volume2 className="step-sound" size={18} aria-label="이 단계 듣기" /></button></li>)}</ol>
                <button className="primary-button start-guide" onClick={() => speak(`음성 안내를 시작합니다. ${routeStepSpeech(routeSteps[0], 0)}`)}><Navigation size={20} /> 음성 안내 시작</button>
              </aside>
            </div>
            <div className="route-comparison">
              <div><span className="section-kicker">경로 비교</span><h3>빠른 길보다 확인 가능한 안전 정보를 우선했어요.</h3></div>
              <div className="comparison-table-wrap"><table><caption className="sr-only">{searchedDestination} 추천 안전 경로와 최단 경로 비교</caption><thead><tr><th scope="col">경로</th><th scope="col">예상 시간</th><th scope="col">점자블록 연결률</th><th scope="col">주의 구간</th></tr></thead><tbody><tr className="recommended"><th scope="row"><ShieldCheck size={17} /> 추천 안전 경로</th><td>{routeProfile.duration}분</td><td><strong>{routeProfile.tactileCoverage}%</strong></td><td>{routeProfile.cautionCount}개</td></tr><tr><th scope="row"><Route size={17} /> 최단 경로</th><td>{routeProfile.shortest.duration}분</td><td>{routeProfile.shortest.tactileCoverage}%</td><td>{routeProfile.shortest.cautionCount}개</td></tr></tbody></table></div>
            </div>
          </section>
          <section className="support-strip"><div className="content-width support-inner"><div className="support-copy"><span className="support-icon"><MessageSquarePlus /></span><div><h2>길 위의 변화를 발견하셨나요?</h2><p>작은 제보 하나가 누군가의 안전한 한 걸음이 됩니다.</p></div></div><button onClick={() => setReportOpen(true)}>주변 상황 제보하기 <ChevronRight size={18} /></button></div></section>
        </>}

        {page === 'reports' && <ReportsPage reports={reports} onHelpful={async (id) => {
          try {
            const updated = await markHelpful(id)
            setReports((current) => current.map((report) => report.id === id ? updated : report))
          } catch {
            setReports((current) => current.map((report) => report.id === id ? { ...report, helpfulCount: report.helpfulCount + 1 } : report))
          }
          setToast('도움이 됐다는 의견을 반영했어요.')
        }} onOpenReport={() => setReportOpen(true)} />}
        {page === 'vision' && <VisionPage onToast={setToast} />}
      </main>

      <footer><div className="content-width footer-inner"><div className="footer-brand"><span className="brand-mark"><Route size={22} /></span><strong>온길</strong></div><p>누구나 안심하고 이동할 수 있는 길을 만듭니다.</p><span>방향 검증용 프로토타입 · 실제 보행 시 기존 보조 수단을 함께 사용하세요.</span></div></footer>
      {reportOpen && <ReportDialog onClose={() => setReportOpen(false)} onCreated={(report) => { setReports((current) => [report, ...current]); setReportOpen(false); setToast('제보가 등록되었습니다. 소중한 정보 고맙습니다.') }} />}
      {toast && <div className="toast" role="status"><Check size={19} />{toast}</div>}
    </div>
  )
}

function ReportsPage({ reports, onHelpful, onOpenReport }: { reports: Report[]; onHelpful: (id: number) => void; onOpenReport: () => void }) {
  const [filter, setFilter] = useState<'전체' | ReportCategory>('전체')
  const filtered = filter === '전체' ? reports : reports.filter((report) => report.category === filter)
  return (
    <section className="subpage content-width">
      <div className="subpage-header"><div><span className="eyebrow"><Bell size={17} /> 함께 만드는 안전한 길</span><h1>주변 보행 제보</h1><p>최근 등록된 공사와 장애물을 확인하고 안전한 경로를 선택하세요.</p></div><button className="primary-button" onClick={onOpenReport}><MessageSquarePlus size={20} /> 새 제보 등록</button></div>
      <div className="report-layout">
        <div>
          <div className="filter-row">{(['전체', '공사', '장애물', '점자블록', '보도 불편'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <div className="report-list">{filtered.map((report) => <article className="report-card" key={report.id}>
            <div className={`report-symbol category-${report.category}`}><ReportCategoryIcon category={report.category} /></div>
            <div className="report-body"><div className="report-meta"><span>{report.category}</span><time>{formatRelative(report.createdAt)}</time></div><h2>{report.title}</h2><p>{report.description}</p><div className="report-location"><MapPin size={16} />{report.location}</div></div>
            <button className="helpful-button" onClick={() => onHelpful(report.id)}><ThumbsUp size={17} /><span>도움돼요</span><strong>{report.helpfulCount}</strong></button>
          </article>)}</div>
        </div>
        <aside className="report-side"><MapPreview profile={routeProfiles['광화문광장']} /><div className="community-stat"><strong>{reports.length}</strong><span>개의 최신 제보가<br />안전한 길 찾기에 반영됩니다.</span></div></aside>
      </div>
    </section>
  )
}

function ReportCategoryIcon({ category }: { category: ReportCategory }) {
  if (category === '공사') return <Construction />
  if (category === '장애물') return <AlertTriangle />
  if (category === '점자블록') return <Accessibility />
  if (category === '보도 불편') return <Footprints />
  return <CircleAlert />
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
    setFile(nextFile); setResult(null); setPreview(URL.createObjectURL(nextFile))
  }
  async function runAnalysis() {
    if (!file) return
    setLoading(true)
    try { setResult(await analyzeScene(file)) }
    catch { setResult({ summary: '앞쪽 보행로는 대체로 평탄하며, 오른쪽 가장자리에 장애물이 있습니다.', details: ['약 3m 앞 오른쪽에 세워진 자전거가 있습니다.', '왼쪽 점자블록은 이어져 있습니다.', '정면에 횡단보도 진입부가 보입니다.'], caution: '사진 한 장을 바탕으로 한 데모 설명입니다. 실제 보행 안전을 보장하지 않습니다.' }) }
    finally { setLoading(false) }
  }
  return (
    <section className="subpage vision-page content-width">
      <div className="subpage-header"><div><span className="eyebrow"><Sparkles size={17} /> MVP 데모 기능</span><h1>AI 주변 상황 설명</h1><p>주변 사진 한 장을 올리면 주요 사물과 주의할 점을 음성 친화적인 문장으로 설명합니다.</p></div></div>
      <div className="vision-grid">
        <div className="upload-card"><div className="upload-heading"><span><Camera /></span><div><h2>주변 사진 올리기</h2><p>JPG, PNG · 최대 10MB</p></div></div>
          <label className={`drop-zone ${preview ? 'has-preview' : ''}`}>{preview ? <img src={preview} alt="분석할 주변 사진 미리보기" /> : <><Upload size={38} /><strong>사진을 선택하거나 여기에 놓으세요</strong><span>카메라로 정면을 촬영한 사진이 좋아요.</span></>}<input type="file" accept="image/*" onChange={(e) => chooseFile(e.target.files?.[0])} /></label>
          {file && <div className="file-row"><span><Check size={16} /> {file.name}</span><button onClick={() => { URL.revokeObjectURL(preview); setFile(null); setPreview(''); setResult(null) }}>삭제</button></div>}
          <button className="primary-button analyze-button" disabled={!file || loading} onClick={runAnalysis}>{loading ? <><span className="spinner" /> 주변을 살펴보는 중…</> : <><Sparkles size={20} /> 사진 설명 만들기</>}</button>
        </div>
        <div className={`result-card ${result ? 'has-result' : ''}`} aria-live="polite">{result ? <>
          <div className="result-heading"><span><AudioLines /></span><div><small>AI가 이렇게 설명했어요</small><h2>{result.summary}</h2></div></div>
          <ul>{result.details.map((detail) => <li key={detail}><Check size={18} />{detail}</li>)}</ul>
          <div className="caution-box"><CircleAlert size={20} /><span>{result.caution}</span></div>
          <button className="listen-button" onClick={() => speak(`${result.summary}. ${result.details.join('. ')}. 주의. ${result.caution}`)}><Volume2 /> 설명 음성으로 듣기</button>
        </> : <div className="result-placeholder"><span><Mic2 /></span><h2>사진 설명이 여기에 표시돼요</h2><p>결과는 화면 낭독기가 읽기 좋은 짧고 구체적인 문장으로 제공됩니다.</p></div>}</div>
      </div>
      <div className="scope-note"><Accessibility /><div><strong>이 기능의 프로토타입 범위</strong><p>실시간 충돌 방지나 정확한 거리 측정이 아닌, 촬영한 이미지 한 장을 분석하는 사용자 흐름을 검증합니다. 실제 AI Vision API는 다음 단계에서 연결할 수 있습니다.</p></div></div>
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
    event.preventDefault(); setSaving(true)
    try { onCreated(await createReport({ category, title, description, location })) }
    catch { onCreated({ id: Date.now(), category, title, description, location, latitude: null, longitude: null, createdAt: new Date().toISOString(), helpfulCount: 0, status: 'active' }) }
  }
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-header"><div><span>안전 정보 나누기</span><h2 id="dialog-title">주변 상황 제보</h2></div><button onClick={onClose} aria-label="제보 창 닫기"><X /></button></div>
        <form onSubmit={submit}>
          <fieldset><legend>어떤 상황인가요?</legend><div className="category-grid">{(['장애물', '공사', '점자블록', '보도 불편', '기타'] as ReportCategory[]).map((item) => <button className={category === item ? 'active' : ''} type="button" key={item} onClick={() => setCategory(item)}><ReportCategoryIcon category={item} />{item}</button>)}</div></fieldset>
          <label>제목<input required value={title} maxLength={50} onChange={(e) => setTitle(e.target.value)} placeholder="예: 점자블록 위 공유 자전거" /></label>
          <label>자세한 설명<textarea required value={description} maxLength={240} onChange={(e) => setDescription(e.target.value)} placeholder="위치와 피하는 방법을 구체적으로 알려주세요." /></label>
          <label>위치<div className="input-with-icon"><LocateFixed size={19} /><input required value={location} onChange={(e) => setLocation(e.target.value)} /></div></label>
          <div className="dialog-actions"><button type="button" onClick={onClose}>취소</button><button className="primary-button" disabled={saving} type="submit">{saving ? '등록 중…' : '제보 등록하기'}</button></div>
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
