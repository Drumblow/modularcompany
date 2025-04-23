// Script para verificar notificações no banco de dados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Verificando notificações no banco de dados...');
  
  // Buscar todas as notificações
  const notifications = await prisma.notification.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  console.log(`Total de notificações: ${notifications.length}`);
  
  if (notifications.length === 0) {
    console.log('Não há notificações no banco de dados.');
  } else {
    notifications.forEach((notification, index) => {
      console.log(`\nNotificação #${index + 1}:`);
      console.log(`  ID: ${notification.id}`);
      console.log(`  Título: ${notification.title}`);
      console.log(`  Mensagem: ${notification.message}`);
      console.log(`  Tipo: ${notification.type}`);
      console.log(`  Lida: ${notification.read ? 'Sim' : 'Não'}`);
      console.log(`  Data: ${notification.createdAt}`);
      console.log(`  Usuário: ${notification.user.name} (${notification.user.role})`);
      console.log(`  Email: ${notification.user.email}`);
      if (notification.relatedId) {
        console.log(`  ID Relacionado: ${notification.relatedId} (${notification.relatedType})`);
      }
    });
  }

  // Buscar usuários administradores
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN"
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  console.log('\nAdministradores no sistema:');
  admins.forEach(admin => {
    console.log(`  ${admin.name} (${admin.email}) - ID: ${admin.id}`);
  });
  
  // Buscar registros de horas pendentes
  const pendingEntries = await prisma.timeEntry.findMany({
    where: {
      approved: null,
      rejected: null
    },
    include: {
      user: {
        select: {
          name: true,
          companyId: true
        }
      }
    }
  });

  console.log(`\nRegistros de horas pendentes: ${pendingEntries.length}`);
  pendingEntries.forEach((entry, index) => {
    console.log(`  Registro #${index + 1}:`);
    console.log(`    Funcionário: ${entry.user.name}`);
    console.log(`    Data: ${entry.date}`);
    console.log(`    Horas: ${entry.totalHours}`);
    console.log(`    CompanyId: ${entry.user.companyId}`);
  });
}

main()
  .catch(e => {
    console.error('Erro ao verificar notificações:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 