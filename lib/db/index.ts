import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

const globalForDb = globalThis as unknown as { conn: postgres.Sql }
const conn = globalForDb.conn ?? postgres(connectionString, {
  max: 10,
  ssl: 'require',         // Supabase exige SSL
  prepare: false,         // Necessário para connection pooler do Supabase
})
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn

export const db = drizzle(conn, { schema })
export type DB = typeof db
