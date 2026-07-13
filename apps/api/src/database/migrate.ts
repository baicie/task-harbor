import postgres from 'postgres'
import { readFile } from 'node:fs/promises'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')
const sql = postgres(url, { max: 1 })
await sql.unsafe(await readFile(new URL('./migrations/0001_init.sql', import.meta.url), 'utf8'))
await sql.end()
console.log('Database migrated')
