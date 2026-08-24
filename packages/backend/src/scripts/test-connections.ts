import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const rawDbUrl = process.env.DATABASE_URL || '';
console.log('Using DATABASE_URL:', rawDbUrl.replace(/:[^:@]+@/, ':****@'));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: rawDbUrl.includes('connection_limit') ? rawDbUrl : `${rawDbUrl}&connection_limit=3&pool_timeout=20`,
    },
  },
});

async function run() {
  try {
    const t0 = Date.now();
    const org = await prisma.organization.findFirst({
      include: { users: true, assets: true },
    });
    console.log(`✅ Success in ${Date.now() - t0}ms! Org: ${org?.name}, Users: ${org?.users.length}, Assets: ${org?.assets.length}`);
  } catch (err: any) {
    console.error('❌ Query Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
