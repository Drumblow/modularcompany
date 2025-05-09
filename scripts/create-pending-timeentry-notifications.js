import { devLog, devWarn, devError } from '@/lib/logger';
// Script para criar notificações para registros de horas pendentes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar administradores
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN"
    }
  });

  if (admins.length === 0) {
    devLog('Nenhum administrador encontrado no sistema.');
    return;
  }

  // Buscar registros pendentes
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

  if (pendingEntries.length === 0) {
    devLog('Nenhum registro de horas pendente encontrado.');
    return;
  }

  devLog(`Encontrados ${pendingEntries.length} registros pendentes e ${admins.length} administradores.`);
  devLog('Criando notificações...');

  // Para cada administrador, criar notificações sobre registros pendentes
  // que pertencem à empresa do administrador (ou todos, se o administrador não estiver associado a uma empresa)
  for (const admin of admins) {
    devLog(`Processando administrador: ${admin.name}`);
    
    // Filtrar registros da mesma empresa do administrador (ou todos se o admin não tiver empresa)
    const relevantEntries = admin.companyId 
      ? pendingEntries.filter(entry => entry.user.companyId === admin.companyId)
      : pendingEntries;
    
    for (const entry of relevantEntries) {
      // Verificar se já existe uma notificação para este registro e este admin
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          relatedId: entry.id,
          relatedType: "timeEntry"
        }
      });

      if (existingNotification) {
        devLog(`  Notificação já existe para o registro ${entry.id} do funcionário ${entry.user.name}`);
        continue;
      }

      // Formatar data de forma legível
      const dateString = new Date(entry.date).toLocaleDateString('pt-BR');
      
      // Criar notificação
      await prisma.notification.create({
        data: {
          title: "Novo registro de horas pendente",
          message: `${entry.user.name} registrou ${entry.totalHours.toFixed(2)}h no dia ${dateString}. Aguardando aprovação.`,
          type: "info",
          userId: admin.id,
          relatedId: entry.id,
          relatedType: "timeEntry",
        }
      });

      devLog(`  Notificação criada para o registro ${entry.id} do funcionário ${entry.user.name}`);
    }
  }

  devLog('Processo concluído!');
}

main()
  .catch(e => {
    devError('Erro ao criar notificações:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 