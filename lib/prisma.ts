import { PrismaClient } from '@prisma/client';

// PrismaClient는 전역 변수로 선언하여 앱 실행 중 단일 인스턴스만 생성되도록 합니다.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 