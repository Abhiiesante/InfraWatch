import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.xvknafvqfxuklxzdyhyq:Abh!r%40mJe!!a%40345@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5';

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function ensureTables() {
  console.log('🔧 Updating reports table columns on Supabase...');

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;`);

    console.log('✅ public.reports columns verified/added.');
  } catch (err: any) {
    console.error('❌ Error updating reports table:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

ensureTables();
