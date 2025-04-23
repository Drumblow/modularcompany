// Script para limpar todas as notificações do banco de dados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Contar notificações antes
  const countBefore = await prisma.notification.count();
  console.log(`Existem ${countBefore} notificações no banco de dados.`);

  if (countBefore === 0) {
    console.log('Nenhuma notificação para excluir.');
    return;
  }

  // Confirmação para continuar
  console.log('ATENÇÃO: Todas as notificações serão excluídas. Este processo não pode ser desfeito.');
  console.log('Executando exclusão...');

  // Excluir todas as notificações
  await prisma.notification.deleteMany({});

  // Verificar se foram excluídas
  const countAfter = await prisma.notification.count();
  console.log(`Processo concluído. ${countBefore} notificações foram excluídas.`);
  console.log(`Restam ${countAfter} notificações no banco de dados.`);
}

main()
  .catch(e => {
    console.error('Erro ao limpar notificações:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 