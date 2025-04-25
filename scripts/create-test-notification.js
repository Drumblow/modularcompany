import { devLog, devWarn, devError } from '@/lib/logger';
// Script para criar uma notificação de teste
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar ID do admin
  const admin = await prisma.user.findFirst({
    where: {
      role: "ADMIN"
    }
  });

  if (!admin) {
    devLog('Nenhum administrador encontrado no sistema.');
    return;
  }

  devLog(`Criando notificação de teste para o administrador: ${admin.name} (${admin.id})`);
  
  // Criar notificação
  const notification = await prisma.notification.create({
    data: {
      title: "Teste de Notificação",
      message: "Esta é uma notificação de teste para verificar o funcionamento do sistema.",
      type: "info",
      userId: admin.id,
      relatedType: "test"
    }
  });

  devLog('Notificação criada com sucesso:');
  devLog(notification);
}

main()
  .catch(e => {
    devError('Erro ao criar notificação de teste:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 