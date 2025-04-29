import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

export async function GET(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }

  try {
    // Definir períodos relevantes
    const today = new Date();
    const currentMonth = {
      start: startOfMonth(today),
      end: endOfMonth(today)
    };
    const lastMonth = {
      start: startOfMonth(subMonths(today, 1)),
      end: endOfMonth(subMonths(today, 1))
    };

    // 1. Buscar informações do usuário
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        email: true,
        hourlyRate: true,
        role: true,
        company: {
          select: {
            id: true,
            name: true,
            plan: true
          }
        }
      }
    });

    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado' }, 404);
    }

    // 2. Buscar estatísticas de registros de horas do mês atual
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: auth.id,
        date: {
          gte: currentMonth.start,
          lte: currentMonth.end
        }
      }
    });

    // 3. Buscar registros do mês anterior para comparação
    const lastMonthEntries = await prisma.timeEntry.findMany({
      where: {
        userId: auth.id,
        date: {
          gte: lastMonth.start,
          lte: lastMonth.end
        }
      }
    });

    // 4. Calcular estatísticas de horas
    const currentMonthStats = calculateTimeStats(timeEntries);
    const lastMonthStats = calculateTimeStats(lastMonthEntries);

    // 5. Buscar notificações não lidas
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: auth.id,
        read: false
      }
    });

    // 6. Buscar pagamentos recentes
    const recentPayments = await prisma.payment.findMany({
      where: {
        userId: auth.id
      },
      orderBy: {
        date: 'desc'
      },
      take: 3
    });

    // 7. Calcular saldo pendente
    const pendingBalance = await calculatePendingBalance(auth.id, user.hourlyRate || 0);

    // 8. Buscar registros com status pendente
    const pendingApprovalEntries = timeEntries.filter(entry => 
      entry.approved === null && entry.rejected === null
    ).length;

    // 9. Formatar dados de resposta
    const dashboardData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hourlyRate: user.hourlyRate,
        role: user.role,
        company: user.company
      },
      notifications: {
        unreadCount: unreadNotifications
      },
      currentMonth: {
        totalHours: currentMonthStats.totalHours,
        approvedHours: currentMonthStats.approvedHours,
        rejectedHours: currentMonthStats.rejectedHours,
        pendingHours: currentMonthStats.pendingHours,
        pendingEntries: pendingApprovalEntries,
        estimatedValue: (user.hourlyRate || 0) * currentMonthStats.approvedHours,
        period: {
          startDate: format(currentMonth.start, 'yyyy-MM-dd'),
          endDate: format(currentMonth.end, 'yyyy-MM-dd')
        }
      },
      comparison: {
        lastMonth: {
          totalHours: lastMonthStats.totalHours,
          approvedHours: lastMonthStats.approvedHours,
          rejectedHours: lastMonthStats.rejectedHours,
          pendingHours: lastMonthStats.pendingHours,
          estimatedValue: (user.hourlyRate || 0) * lastMonthStats.approvedHours
        },
        percentageChange: calculatePercentageChange(
          currentMonthStats.totalHours, 
          lastMonthStats.totalHours
        )
      },
      balance: {
        pendingAmount: pendingBalance,
        currency: 'BRL'
      },
      recentPayments: recentPayments.map(payment => ({
        id: payment.id,
        date: format(payment.date, 'yyyy-MM-dd'),
        amount: payment.amount,
        description: payment.description,
        status: payment.status
      }))
    };

    // Log de sucesso
    console.log('Mobile - Dashboard acessado:', { userId: auth.id });

    // Retornar dados do dashboard
    return createCorsResponse({ dashboard: dashboardData });

  } catch (error) {
    console.error('Erro ao gerar dashboard:', error);
    return createCorsResponse({ error: 'Erro ao gerar dashboard' }, 500);
  }
}

// Função para calcular estatísticas de horas
function calculateTimeStats(entries: any[]) {
  const approved = entries.filter(entry => entry.approved === true);
  const rejected = entries.filter(entry => entry.rejected === true);
  const pending = entries.filter(entry => entry.approved === null && entry.rejected === null);

  return {
    totalHours: entries.reduce((sum, entry) => sum + entry.totalHours, 0),
    approvedHours: approved.reduce((sum, entry) => sum + entry.totalHours, 0),
    rejectedHours: rejected.reduce((sum, entry) => sum + entry.totalHours, 0),
    pendingHours: pending.reduce((sum, entry) => sum + entry.totalHours, 0),
    entriesCount: entries.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    pendingCount: pending.length
  };
}

// Função para calcular variação percentual
function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) return 100; // Se o mês anterior for zero, consideramos 100% de aumento
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

// Função para calcular saldo pendente
async function calculatePendingBalance(userId: string, hourlyRate: number) {
  // Buscar horas aprovadas que ainda não foram pagas
  const approvedEntries = await prisma.timeEntry.findMany({
    where: {
      userId,
      approved: true,
      NOT: {
        id: {
          in: await prisma.paymentTimeEntry.findMany({
            select: { timeEntryId: true }
          }).then(entries => entries.map(e => e.timeEntryId))
        }
      }
    },
    select: {
      totalHours: true
    }
  });

  const totalUnpaidHours = approvedEntries.reduce(
    (sum, entry) => sum + entry.totalHours, 
    0
  );

  return totalUnpaidHours * hourlyRate;
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 