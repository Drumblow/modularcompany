import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format } from 'date-fns';

// GET - Endpoint para obter detalhes de um pagamento específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }
  
  try {
    const { id } = params;
    
    // Buscar o pagamento específico
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
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
      }
    });
    
    // Verificar se o pagamento foi encontrado
    if (!payment) {
      return createCorsResponse({ error: 'Pagamento não encontrado' }, 404);
    }
    
    // Verificar se o usuário tem permissão para visualizar (só pode ver seus próprios pagamentos)
    if (payment.userId !== auth.id) {
      return createCorsResponse({ error: 'Você não tem permissão para visualizar este pagamento' }, 403);
    }
    
    // Calcular total de horas dos registros associados
    const totalHours = payment.timeEntries.reduce((sum, entry) => {
      return sum + entry.timeEntry.totalHours;
    }, 0);
    
    // Formatar o resultado para o cliente
    const formattedPayment = {
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
        name: payment.creator?.name || 'Usuário não informado',
        email: payment.creator?.email || null
      },
      user: {
        id: payment.user.id,
        name: payment.user.name
      },
      timeEntries: payment.timeEntries.map(entry => ({
        id: entry.timeEntry.id,
        date: format(entry.timeEntry.date, 'yyyy-MM-dd'),
        startTime: format(entry.timeEntry.startTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endTime: format(entry.timeEntry.endTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        totalHours: entry.timeEntry.totalHours,
        observation: entry.timeEntry.observation,
        project: entry.timeEntry.project,
        amount: entry.amount
      })),
      createdAt: format(payment.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      updatedAt: format(payment.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')
    };
    
    // Log de sucesso
    console.log('Mobile - Pagamento visualizado:', { 
      userId: auth.id,
      paymentId: id
    });
    
    // Retornar o pagamento
    return createCorsResponse({ payment: formattedPayment });
    
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    return createCorsResponse({ error: 'Erro ao buscar pagamento' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 