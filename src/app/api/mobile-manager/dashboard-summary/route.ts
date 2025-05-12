import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  // Verificar autenticação e permissões (MANAGER)
  const { auth, response } = await verifyMobileAuth(req);
  
  if (!auth || response) return response;
  if (auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Managers podem acessar este resumo.' }, 403);
  }
  if (!auth.companyId) {
    return createCorsResponse({ error: 'Manager não associado a uma empresa.' }, 400);
  }

  const managerId = auth.id;
  const companyId = auth.companyId;
  const today = new Date();
  const thirtyDaysAgo = startOfDay(subDays(today, 30)); // Início do dia 30 dias atrás
  const endOfToday = endOfDay(today); // Fim do dia de hoje

  try {
    // Buscar dados do manager (incluindo taxa horária)
    const managerUser = await prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, name: true, hourlyRate: true },
    });

    if (!managerUser) {
      return createCorsResponse({ error: 'Dados do manager não encontrados.' }, 404);
    }
    const managerHourlyRate = managerUser.hourlyRate || 0;

    // --- Dados da Equipe --- 

    // 1. Contar time entries da equipe pendentes de aprovação
    const teamPendingApprovalCount = await prisma.timeEntry.count({
      where: {
        user: { managerId: managerId }, // Usuários gerenciados por este manager
        approved: null,
        rejected: null,
      },
    });

    // 2. Calcular horas totais (aprovadas) da equipe nos últimos 30 dias
    const teamApprovedEntriesLast30Days = await prisma.timeEntry.findMany({
      where: {
        user: { managerId: managerId },
        approved: true,
        date: {
          gte: thirtyDaysAgo,
          lte: endOfToday,
        },
      },
      select: { totalHours: true },
    });
    const teamTotalHoursLast30Days = teamApprovedEntriesLast30Days.reduce((sum, entry) => sum + entry.totalHours, 0);

    // 3. Contar membros da equipe (EMPLOYEE ou MANAGER gerenciados por ele)
    const teamMemberCount = await prisma.user.count({
      where: {
        managerId: managerId,
        // Se precisar excluir outros managers, adicione: role: 'EMPLOYEE' 
      },
    });

    // --- Dados Pessoais do Manager --- 

    // IDs de time entries do manager que já foram pagos
    const paidManagerEntryLinks = await prisma.paymentTimeEntry.findMany({
      where: { payment: { userId: managerId } }, // Pagamentos PARA o manager
      select: { timeEntryId: true },
    });
    const paidManagerEntryIds = new Set(paidManagerEntryLinks.map(link => link.timeEntryId));

    // 4. Estatísticas das horas do próprio manager nos últimos 30 dias
    const managerEntriesLast30Days = await prisma.timeEntry.findMany({
      where: {
        userId: managerId,
        date: {
          gte: thirtyDaysAgo,
          lte: endOfToday,
        },
      },
      select: { id: true, totalHours: true, approved: true },
    });

    let myTotalHoursRegisteredLast30Days = 0;
    let myPendingPaymentHoursLast30Days = 0;

    for (const entry of managerEntriesLast30Days) {
      myTotalHoursRegisteredLast30Days += entry.totalHours;
      // Verificar se está aprovado e NÃO está na lista de pagos
      if (entry.approved === true && !paidManagerEntryIds.has(entry.id)) {
        myPendingPaymentHoursLast30Days += entry.totalHours;
      }
    }
    const myPendingPaymentValueLast30Days = myPendingPaymentHoursLast30Days * managerHourlyRate;

    // 5. Valor total de pagamentos PENDENTES para o manager (todos os tempos)
    const managerPendingPayments = await prisma.payment.findMany({
        where: {
            userId: managerId,
            status: { in: ['pending', 'awaiting_confirmation'] },
        },
        select: { amount: true },
    });
    const myPendingPaymentsTotalValue = managerPendingPayments.reduce((sum, p) => sum + p.amount, 0);

    // 6. Valor total de pagamentos RECEBIDOS pelo manager nos últimos 30 dias
    const managerReceivedPaymentsLast30Days = await prisma.payment.findMany({
        where: {
            userId: managerId,
            status: 'completed',
            date: { // Data do pagamento
                gte: thirtyDaysAgo,
                lte: endOfToday,
            }
        },
        select: { amount: true },
    });
    const myReceivedPaymentsLast30Days = managerReceivedPaymentsLast30Days.reduce((sum, p) => sum + p.amount, 0);


    // --- Montar Resposta --- 
    const summaryData = {
      summary: {
        pendingApprovalCount: teamPendingApprovalCount,
        teamTotalHoursLast30Days,
        teamMemberCount,
        myStatsLast30Days: {
          totalHoursRegistered: myTotalHoursRegisteredLast30Days,
          pendingPaymentHours: myPendingPaymentHoursLast30Days,
          pendingPaymentValue: myPendingPaymentValueLast30Days,
        },
        myPendingPaymentsTotalValue,
        myReceivedPaymentsLast30Days,
      },
      managerInfo: {
        id: managerUser.id,
        name: managerUser.name || 'Manager',
        hourlyRate: managerHourlyRate,
      },
    };

    return createCorsResponse(summaryData);

  } catch (error) {
    console.error('Erro ao gerar resumo do dashboard para manager:', error);
    return createCorsResponse({ error: 'Erro ao gerar resumo do dashboard' }, 500);
  }
}

export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 