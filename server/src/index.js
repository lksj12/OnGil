import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { all, get, initializeDatabase, reportSelect, run } from './database.js'

const app = express()
const port = Number(process.env.PORT) || 4000
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('image/')),
})

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_request, response) => response.json({ ok: true, service: 'ongil-api' }))

app.get('/api/reports', async (request, response, next) => {
  try {
    const reports = request.query.category
      ? await all(`${reportSelect} WHERE category=? AND status='active' ORDER BY datetime(created_at) DESC`, [request.query.category])
      : await all(`${reportSelect} WHERE status='active' ORDER BY datetime(created_at) DESC`)
    response.json(reports)
  } catch (error) { next(error) }
})

app.post('/api/reports', async (request, response, next) => {
  try {
    const { category, title, description, location, latitude = null, longitude = null } = request.body
    if (!['공사','장애물','점자블록','보도 불편','기타'].includes(category) || !title?.trim() || !description?.trim() || !location?.trim()) {
      return response.status(400).json({ message: '제보 유형, 제목, 설명, 위치를 모두 입력해 주세요.' })
    }
    const result = await run(
      'INSERT INTO reports (category,title,description,location,latitude,longitude) VALUES (?,?,?,?,?,?)',
      [category, title.trim().slice(0,50), description.trim().slice(0,240), location.trim().slice(0,100), latitude, longitude],
    )
    response.status(201).json(await get(`${reportSelect} WHERE id=?`, [result.id]))
  } catch (error) { next(error) }
})

app.post('/api/reports/:id/helpful', async (request, response, next) => {
  try {
    const id = Number(request.params.id)
    if (!Number.isInteger(id)) return response.status(400).json({ message: '올바르지 않은 제보 번호입니다.' })
    const result = await run('UPDATE reports SET helpful_count=helpful_count+1 WHERE id=?', [id])
    if (result.changes === 0) return response.status(404).json({ message: '제보를 찾을 수 없습니다.' })
    response.json(await get(`${reportSelect} WHERE id=?`, [id]))
  } catch (error) { next(error) }
})

app.post('/api/vision/analyze', upload.single('image'), async (request, response) => {
  if (!request.file) return response.status(400).json({ message: '분석할 이미지가 필요합니다.' })
  await new Promise((resolve) => setTimeout(resolve, 900))
  response.json({
    summary: '앞쪽 보행로는 대체로 평탄하며, 오른쪽 가장자리에 주의가 필요합니다.',
    details: ['약 3m 앞 오른쪽에 세워진 자전거가 있습니다.','왼쪽 점자블록은 계속 이어져 있습니다.','정면에 횡단보도 진입부가 보입니다.'],
    caution: '사진 한 장을 바탕으로 한 데모 설명입니다. 실제 보행 안전을 보장하지 않습니다.',
    model: 'prototype-scene-v1',
  })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ message: '이미지 크기는 10MB 이하여야 합니다.' })
  response.status(500).json({ message: '서버에서 요청을 처리하지 못했습니다.' })
})

initializeDatabase()
  .then(() =>
    app.listen(port, '0.0.0.0', () => {
      console.log(`온길 API: http://0.0.0.0:${port}`)
    })
  )
  .catch((error) => {
    console.error('데이터베이스 초기화 실패:', error)
    process.exit(1)
  })