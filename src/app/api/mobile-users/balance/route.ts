import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export async function GET(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }

  // Obter parâmetros de consulta
  const { searchParams } = new URL(req.url);
  let startDateParam = searchParams.get('startDate');
  let endDateParam = searchParams.get('endDate');
  
  // Se não fornecidos, usar o mês atual
  const today = new Date();
  const defaultStartDate = startOfMonth(today);
  const defaultEndDate = endOfMonth(today);
  
  // Analisar datas fornecidas ou usar padrões
  let startDate = startDateParam ? parseISO(startDateParam) : defaultStartDate;
  let endDate = endDateParam ? parseISO(endDateParam) : defaultEndDate;
  
  try {
    // Construir filtro de data
    const dateFilter: any = {};
    
    if (startDate) {
      dateFilter.gte = startDate;
    }
    
    if (endDate) {
      dateFilter.lte = endDate;
    }
    
    // Buscar usuário com taxa horária
    const user = await prisma.user.findUnique({
      where: { id: auth.id }
    });
    
    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado' }, 404);
    }
    
    // Buscar registros de horas aprovados do usuário
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: auth.id,
        approved: true,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      }
    });

    // Buscar pagamentos para o usuário
    const payments = await (prisma as any).payment.findMany({
      where: {
        userId: auth.id,
        status: 'completed',
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: {
        timeEntries: {
          include: {
            timeEntry: true
          }
        }
      }
    });

    // Calcular total de horas aprovadas
    const totalApprovedHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    
    // Calcular valor total devido (com base na taxa horária)
    const hourlyRate = user.hourlyRate || 0;
    const totalAmountDue = totalApprovedHours * hourlyRate;
    
    // Calcular total já pago
    const totalPaid = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    
    // Calcular horas já pagas
    const paidTimeEntryIds = new Set<string>();
    payments.forEach((payment: any) => {
      payment.timeEntries.forEach((entry: any) => {
        paidTimeEntryIds.add(entry.timeEntryId);
      });
    });
    
    const paidTimeEntries = timeEntries.filter(entry => paidTimeEntryIds.has(entry.id));
    const paidHours = paidTimeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    
    // Calcular horas não pagas
    const unpaidTimeEntries = timeEntries.filter(entry => !paidTimeEntryIds.has(entry.id));
    const unpaidHours = unpaidTimeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    
    // Calcular saldo devedor
    const balance = totalAmountDue - totalPaid;
    
    // Log de sucesso
    console.log('Mobile - Saldo verificado:', { 
      userId: auth.id,
      totalHours: totalApprovedHours,
      paidHours,
      unpaidHours,
      balance
    });
    
    // Formatar resposta
    return createCorsResponse({ 
      balance: {
        totalApprovedHours,
        paidHours,
        unpaidHours,
        hourlyRate,
        totalAmountDue,
        totalPaid,
        balance,
        currency: 'BRL'
      },
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      }
    });
    
  } catch (error) {
    console.error('Erro ao calcular saldo:', error);
    return createCorsResponse({ error: 'Erro ao calcular saldo' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 