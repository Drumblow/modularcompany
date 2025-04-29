import { PrismaClient } from '@prisma/client';

// Evita múltiplas instâncias do Prisma Client em desenvolvimento
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Verificar se já existe uma instância do Prisma Client para reutilizá-la
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  // Em desenvolvimento, reutiliza a instância se já existir
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = globalForPrisma.prisma;
}

// Gerencia conexões em ambientes serverless (como a Vercel)
if (process.env.NODE_ENV === 'production') {
  // Em produção, vamos registrar um handler para o evento 'beforeExit'
  // para fechar conexões abertas antes do processo terminar
  process.on('beforeExit', () => {
    prisma.$disconnect();
  });
}

export default prisma; 