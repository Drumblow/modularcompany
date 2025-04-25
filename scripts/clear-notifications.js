import { devLog, devWarn, devError } from '@/lib/logger';
// Script para limpar todas as notificações do banco de dados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Contar notificações antes
  const countBefore = await prisma.notification.count();
  devLog(`Existem ${countBefore} notificações no banco de dados.`);

  if (countBefore === 0) {
    devLog('Nenhuma notificação para excluir.');
    return;
  }

  // Confirmação para continuar
  devLog('ATENÇÃO: Todas as notificações serão excluídas. Este processo não pode ser desfeito.');
  devLog('Executando exclusão...');

  // Excluir todas as notificações
  await prisma.notification.deleteMany({});

  // Verificar se foram excluídas
  const countAfter = await prisma.notification.count();
  devLog(`Processo concluído. ${countBefore} notificações foram excluídas.`);
  devLog(`Restam ${countAfter} notificações no banco de dados.`);
}

main()
  .catch(e => {
    devError('Erro ao limpar notificações:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 