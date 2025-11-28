import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

process.on('beforeExit', async () => {
  logger.info('Disconnecting from database...');
  await db.$disconnect();
});
