import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJsonStore } from './json-store.js'
import { createMysqlStore } from './mysql-store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 存储驱动：DB_DRIVER=json（默认，data/db.json）| mysql
export async function createStore() {
  const driver = String(process.env.DB_DRIVER || 'json').toLowerCase()
  if (driver === 'mysql' || driver === 'mariadb') {
    return createMysqlStore({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'leaf_shopping'
    })
  }
  return createJsonStore({ dbFile: process.env.DB_FILE || path.join(__dirname, '..', '..', 'data', 'db.json') })
}
