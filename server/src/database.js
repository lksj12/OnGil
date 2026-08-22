import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const directory = path.dirname(fileURLToPath(import.meta.url))
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(directory, '../data/ongil-local.db')
const db = new sqlite3.Database(databasePath)

export function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (error) {
    if (error) reject(error)
    else resolve({ id: this.lastID, changes: this.changes })
  }))
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)))
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)))
}

export const reportSelect = `SELECT id, category, title, description, location, latitude, longitude,
  created_at AS createdAt, helpful_count AS helpfulCount, status FROM reports`

const reportsSchema = (table = 'reports') => `CREATE TABLE IF NOT EXISTS ${table} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('공사','장애물','점자블록','보도 불편','기타')),
  title TEXT NOT NULL, description TEXT NOT NULL, location TEXT NOT NULL,
  latitude REAL, longitude REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  helpful_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','resolved'))
)`

async function migrateReportCategories() {
  const table = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'")
  if (!table?.sql || table.sql.includes("'점자블록'")) return
  await run('BEGIN IMMEDIATE')
  try {
    await run('DROP TABLE IF EXISTS reports_migrated')
    await run(reportsSchema('reports_migrated'))
    await run(`INSERT INTO reports_migrated
      (id,category,title,description,location,latitude,longitude,created_at,helpful_count,status)
      SELECT id,category,title,description,location,latitude,longitude,created_at,helpful_count,status FROM reports`)
    await run('DROP TABLE reports')
    await run('ALTER TABLE reports_migrated RENAME TO reports')
    await run('COMMIT')
  } catch (error) {
    await run('ROLLBACK')
    throw error
  }
}

export async function initializeDatabase() {
  await run(reportsSchema())
  await migrateReportCategories()
  const { count } = await get('SELECT COUNT(*) AS count FROM reports')
  if (count === 0) {
    const seeds = [
      ['공사','보도 정비 공사 중','점자블록 일부가 가림막으로 막혀 있어 왼쪽으로 우회해야 합니다.','세종대로 사거리 북측',37.5692,126.9777,12],
      ['장애물','점자블록 위 공유 자전거','통행로 가운데 자전거 두 대가 세워져 있습니다.','광화문역 7번 출구 앞',37.5711,126.9769,8],
      ['점자블록','횡단보도 앞 점자블록 단절','횡단보도 진입 약 4m 전부터 점자블록이 끊겨 있습니다.','세종대로 횡단보도 남측',37.5702,126.9772,5],
      ['보도 불편','보도블록 일부 파손','오른쪽 보도 가장자리가 깨져 있어 점자블록 왼쪽으로 이동하는 것이 안전합니다.','세종문화회관 정문 앞',37.5721,126.9759,5],
    ]
    for (const seed of seeds) {
      await run(`INSERT INTO reports (category,title,description,location,latitude,longitude,helpful_count) VALUES (?,?,?,?,?,?,?)`, seed)
    }
  }
  const { count: tactileReportCount } = await get("SELECT COUNT(*) AS count FROM reports WHERE category='점자블록'")
  if (tactileReportCount === 0) {
    await run(
      `INSERT INTO reports (category,title,description,location,latitude,longitude,helpful_count) VALUES (?,?,?,?,?,?,?)`,
      ['점자블록','횡단보도 앞 점자블록 단절','횡단보도 진입 약 4m 전부터 점자블록이 끊겨 있습니다.','세종대로 횡단보도 남측',37.5702,126.9772,5],
    )
  }
}
