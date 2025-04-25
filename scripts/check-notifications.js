import { devLog, devWarn, devError } from '@/lib/logger';
// Script para verificar notificações no banco de dados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  devLog('Verificando notificações no banco de dados...');
  
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

  devLog(`Total de notificações: ${notifications.length}`);
  
  if (notifications.length === 0) {
    devLog('Não há notificações no banco de dados.');
  } else {
    notifications.forEach((notification, index) => {
      devLog(`\nNotificação #${index + 1}:`);
      devLog(`  ID: ${notification.id}`);
      devLog(`  Título: ${notification.title}`);
      devLog(`  Mensagem: ${notification.message}`);
      devLog(`  Tipo: ${notification.type}`);
      devLog(`  Lida: ${notification.read ? 'Sim' : 'Não'}`);
      devLog(`  Data: ${notification.createdAt}`);
      devLog(`  Usuário: ${notification.user.name} (${notification.user.role})`);
      devLog(`  Email: ${notification.user.email}`);
      if (notification.relatedId) {
        devLog(`  ID Relacionado: ${notification.relatedId} (${notification.relatedType})`);
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

  devLog('\nAdministradores no sistema:');
  admins.forEach(admin => {
    devLog(`  ${admin.name} (${admin.email}) - ID: ${admin.id}`);
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

  devLog(`\nRegistros de horas pendentes: ${pendingEntries.length}`);
  pendingEntries.forEach((entry, index) => {
    devLog(`  Registro #${index + 1}:`);
    devLog(`    Funcionário: ${entry.user.name}`);
    devLog(`    Data: ${entry.date}`);
    devLog(`    Horas: ${entry.totalHours}`);
    devLog(`    CompanyId: ${entry.user.companyId}`);
  });
}

main()
  .catch(e => {
    devError('Erro ao verificar notificações:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 