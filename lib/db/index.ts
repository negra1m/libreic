import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

const isServerless = process.env.VERCEL === '1'

const globalForDb = globalThis as unknown as { conn: postgres.Sql }
const conn = globalForDb.conn ?? postgres(connectionString, {
  max: isServerless ? 1 : 10,
  ssl: 'require',
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
})
if (!isServerless) globalForDb.conn = conn

export const db = drizzle(conn, { schema })
export type DB = typeof db
