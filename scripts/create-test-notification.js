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
    console.log('Nenhum administrador encontrado no sistema.');
    return;
  }

  console.log(`Criando notificação de teste para o administrador: ${admin.name} (${admin.id})`);
  
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

  console.log('Notificação criada com sucesso:');
  console.log(notification);
}

main()
  .catch(e => {
    console.error('Erro ao criar notificação de teste:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 