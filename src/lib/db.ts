import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')

  if (isPostgres) {
    const pool = new Pool({ connectionString: databaseUrl })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
