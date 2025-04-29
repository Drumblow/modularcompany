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
  let status = searchParams.get('status');
  
  // Se não fornecidos, usar o mês atual
  const today = new Date();
  const defaultStartDate = startOfMonth(today);
  const defaultEndDate = endOfMonth(today);
  
  // Analisar datas fornecidas ou usar padrões
  let startDate = startDateParam ? parseISO(startDateParam) : defaultStartDate;
  let endDate = endDateParam ? parseISO(endDateParam) : defaultEndDate;
  
  try {
    // Construir filtro de consulta
    const where: any = {
      userId: auth.id,
      date: {
        gte: startDate,
        lte: endDate
      }
    };
    
    // Filtrar por status se fornecido
    if (status) {
      where.status = status;
    }
    
    // Buscar pagamentos do usuário
    const payments = await prisma.payment.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        timeEntries: {
          include: {
            timeEntry: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // Transformar as datas em strings para evitar problemas de serialização
    const formattedPayments = payments.map(payment => {
      // Calcular total de horas dos registros associados
      const totalHours = payment.timeEntries.reduce((sum, entry) => {
        return sum + entry.timeEntry.totalHours;
      }, 0);
      
      return {
        id: payment.id,
        amount: payment.amount,
        date: format(payment.date, 'yyyy-MM-dd'),
        description: payment.description,
        reference: payment.reference,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        periodStart: format(payment.periodStart, 'yyyy-MM-dd'),
        periodEnd: format(payment.periodEnd, 'yyyy-MM-dd'),
        totalHours: totalHours,
        createdBy: {
          id: payment.creator?.id || null,
          name: payment.creator?.name || 'Usuário não informado'
        },
        timeEntries: payment.timeEntries.map(entry => ({
          id: entry.timeEntry.id,
          date: format(entry.timeEntry.date, 'yyyy-MM-dd'),
          totalHours: entry.timeEntry.totalHours,
          observation: entry.timeEntry.observation,
          project: entry.timeEntry.project,
          amount: entry.amount
        })),
        createdAt: format(payment.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        updatedAt: format(payment.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')
      };
    });
    
    // Log de sucesso
    console.log('Mobile - Pagamentos acessados:', { 
      userId: auth.id,
      count: payments.length,
      period: `${format(startDate, 'yyyy-MM-dd')} até ${format(endDate, 'yyyy-MM-dd')}`
    });
    
    // Retornar dados
    return createCorsResponse({ 
      payments: formattedPayments,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return createCorsResponse({ error: 'Erro ao buscar pagamentos' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 