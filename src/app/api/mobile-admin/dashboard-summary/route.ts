import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  // Verificar autenticação e permissões (Admin/Manager)
  const { auth, response } = await verifyMobileAuth(req);
  
  if (!auth || response) {
    return response;
  }
  
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins e Managers podem acessar este resumo.' }, 403);
  }
  
  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário não está associado a uma empresa.' }, 400);
  }
  
  try {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);
    
    const companyId = auth.companyId;
    
    // 1. Contar registros pendentes de aprovação na empresa
    const pendingApprovalCount = await prisma.timeEntry.count({
      where: {
        user: {
          companyId: companyId,
        },
        approved: null, // Não aprovado
        rejected: null, // Não rejeitado
      },
    });
    
    // 2. Contar usuários totais na empresa
    const totalUserCount = await prisma.user.count({
      where: {
        companyId: companyId,
      },
    });
    
    // 3. Contar notificações não lidas PARA O ADMIN/MANAGER LOGADO
    const unreadNotificationCount = await prisma.notification.count({
      where: {
        userId: auth.id, // Notificações do usuário autenticado
        read: false,
      },
    });
    
    // 4. Buscar nome da empresa usando o companyId
    let companyName = 'Empresa não encontrada';
    const companyInfo = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (companyInfo) {
      companyName = companyInfo.name;
    }
    
    // 5. Calcular informações financeiras de pagamentos da empresa no mês atual
    // 5.1. Contagem de Pagamentos Pendentes na empresa (status 'pending' ou 'awaiting_confirmation')
    const pendingPaymentCount = await prisma.payment.count({
      where: {
        user: { companyId: companyId },
        status: { in: ['pending', 'awaiting_confirmation'] },
        // Adicionar filtro de data se quisermos apenas pendentes CRIADOS no mês atual
        // date: {
        //   gte: currentMonthStart,
        //   lte: currentMonthEnd,
        // },
      },
    });
    
    // 5.2. Valor Total Pago no Mês Atual (status 'completed')
    const paymentsCompletedMonth = await prisma.payment.findMany({
      where: {
        user: { companyId: companyId },
        status: 'completed',
        date: { // Pagamentos realizados no mês atual
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      select: { amount: true },
    });
    const totalPaidAmountMonth = paymentsCompletedMonth.reduce((sum, p) => sum + p.amount, 0);
    
    // 5.3. Valor Total de Horas Aprovadas AINDA NÃO PAGAS no mês atual
    // Primeiro, buscar todas as time entries aprovadas da empresa no período
    const approvedTimeEntriesInMonth = await prisma.timeEntry.findMany({
        where: {
            user: { companyId },
            approved: true,
            date: { 
                gte: currentMonthStart,
                lte: currentMonthEnd,
            },
        },
        include: {
            user: { select: { hourlyRate: true, id: true } }, // Incluir ID do usuário para referência
        },
    });

    // Segundo, buscar os IDs de todas as time entries que JÁ foram pagas (estão em PaymentTimeEntry)
    const paidTimeEntryLinks = await prisma.paymentTimeEntry.findMany({
        where: {
            payment: { 
                user: { companyId } // Garante que são pagamentos da mesma empresa
            },
            // Poderia adicionar um filtro para timeEntryId in approvedTimeEntriesInMonth.map(te => te.id) se a lista não for muito grande
        },
        select: { timeEntryId: true },
    });
    const paidTimeEntryIds = new Set(paidTimeEntryLinks.map(link => link.timeEntryId));

    // Terceiro, filtrar as time entries aprovadas para encontrar as que não foram pagas
    let pendingPaymentAmountMonth = 0;
    const actuallyUnpaidEntries = []; // Para debug, se necessário

    for (const entry of approvedTimeEntriesInMonth) {
        if (!paidTimeEntryIds.has(entry.id)) {
            const rate = entry.user.hourlyRate || 0;
            pendingPaymentAmountMonth += entry.totalHours * rate;
            actuallyUnpaidEntries.push({id: entry.id, hours: entry.totalHours, rate, user: entry.user.id});
        }
    }
    // console.log('Horas aprovadas não pagas este mês:', actuallyUnpaidEntries);

    // Log de sucesso
    console.log(`Mobile - Admin/Manager ${auth.id} acessou dashboard summary da empresa ${companyId}`);
    
    // Montar resposta
    const summaryData = {
      summary: {
        pendingApprovalCount,
        totalUserCount,
        unreadNotificationCount,
        pendingPaymentCount,
        totalPaidAmountMonth,
        pendingPaymentAmountMonth,
      },
      user: { // Informações do Admin/Manager logado
        id: auth.id,
        name: auth.name || 'Nome não disponível',
        role: auth.role,
      },
      company: { // Informações da empresa
        id: companyId,
        name: companyName,
      },
    };
    
    return createCorsResponse({ dashboard: summaryData });
    
  } catch (error) {
    console.error('Erro ao gerar resumo do dashboard para admin/manager:', error);
    return createCorsResponse({ error: 'Erro ao gerar resumo do dashboard' }, 500);
  }
}

// OPTIONS Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 