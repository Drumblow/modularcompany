import { PrismaClient } from '@prisma/client';

// Evita múltiplas instâncias do Prisma Client em desenvolvimento
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Gerencia conexões em ambientes serverless (como a Vercel)
// para evitar atingir o limite de conexões do PostgreSQL
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} else {
  // Em produção, vamos registrar um handler para o evento 'beforeExit'
  // para fechar conexões abertas antes do processo terminar
  process.on('beforeExit', () => {
    prisma.$disconnect();
  });
}

export default prisma; 