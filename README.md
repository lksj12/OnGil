# 온길 — 접근성 중심 보행 길 안내 프로토타입

시각장애인을 위한 통합 보행 내비게이션 아이디어를 3인 웹 팀 프로젝트 규모로 줄여, 사용자 흐름과 기술 가능성을 검증하는 프로토타입입니다.

## 기술 스택

- Frontend: Next.js App Router, React, TypeScript, Lucide React, Web Speech API
- Backend: Node.js, Express, SQLite3, Multer
- Database: `server/data/ongil-local.db` (최초 실행 시 자동 생성, `DATABASE_PATH`로 변경 가능)

## 구현 기능

- 현재 위치와 목적지를 이용한 안전 경로 검색 UI
- 단계별 Web Speech 음성 안내
- 키보드 탐색, 스킵 링크, ARIA, 고대비, 글자 크기 조절
- 공사·장애물·보도 불편 제보 조회·필터·등록·도움 표시
- 이미지 한 장 업로드 및 AI 주변 설명 데모
- 반응형 모바일·데스크톱 화면

지도와 AI 분석은 방향 검증용 mock입니다. 실제 서비스에서는 지도 SDK와 Vision API를 현재 UI/API 경계에 연결하면 됩니다.

## 실행

Node.js 20 이상을 권장합니다.

```bash
cd teamproject
npm run install:all
npm run dev
```

- Next.js: http://localhost:3000
- Express API: http://localhost:4000/api/health

Next.js의 `rewrites`가 브라우저의 `/api/*` 요청을 Express 서버로 전달합니다.

```bash
npm run build
npm run start
```

## 구조

```text
teamproject/
├── client/
│   ├── next.config.mjs
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       └── lib/
│           ├── api.ts
│           └── types.ts
├── server/
│   └── src/
│       ├── database.js
│       └── index.js
└── docs/
    └── TEAM_ROLES.md
```

## API

| Method | Endpoint | 설명 |
|---|---|---|
| `GET` | `/api/health` | 상태 확인 |
| `GET` | `/api/reports` | 활성 제보 조회 |
| `POST` | `/api/reports` | 제보 등록 |
| `POST` | `/api/reports/:id/helpful` | 도움 수 증가 |
| `POST` | `/api/vision/analyze` | 이미지 설명 데모 |

## MVP 다음 단계

1. 실제 보행 경로·장소 검색 API 연결
2. 시각장애 당사자 인터뷰와 스크린리더 테스트
3. 제보 위치 좌표 선택 및 만료·검증 정책
4. 서버의 이미지 분석 endpoint에 Vision API 연결
5. PWA 매니페스트·서비스 워커·오프라인 안내 추가

> 프로토타입의 음성 및 이미지 설명은 실제 보행 안전을 보장하지 않습니다.
