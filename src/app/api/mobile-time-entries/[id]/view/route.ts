import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format } from 'date-fns';

// GET - Endpoint para obter um registro específico
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
    
    // Buscar o registro de horas específico
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hourlyRate: true
          }
        }
      }
    });
    
    // Verificar se o registro foi encontrado
    if (!timeEntry) {
      return createCorsResponse({ error: 'Registro não encontrado' }, 404);
    }
    
    // Verificar se o usuário tem permissão para visualizar (só pode ver seus próprios registros)
    if (timeEntry.userId !== auth.id) {
      return createCorsResponse({ error: 'Você não tem permissão para visualizar este registro' }, 403);
    }
    
    // Verificar se o registro está associado a algum pagamento
    const paymentTimeEntry = await prisma.paymentTimeEntry.findFirst({
      where: { timeEntryId: id },
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            date: true,
            reference: true,
            description: true,
            status: true
          }
        }
      }
    });
    
    // Formatar o resultado para o cliente
    const formattedEntry = {
      id: timeEntry.id,
      date: format(timeEntry.date, 'yyyy-MM-dd'),
      startTime: format(timeEntry.startTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      endTime: format(timeEntry.endTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      totalHours: timeEntry.totalHours,
      observation: timeEntry.observation,
      project: timeEntry.project,
      userId: timeEntry.userId,
      userName: timeEntry.user.name,
      approved: timeEntry.approved,
      rejected: timeEntry.rejected,
      rejectionReason: timeEntry.rejectionReason,
      createdAt: format(timeEntry.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      updatedAt: format(timeEntry.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      payment: paymentTimeEntry ? {
        id: paymentTimeEntry.payment.id,
        amount: paymentTimeEntry.payment.amount,
        date: format(paymentTimeEntry.payment.date, 'yyyy-MM-dd'),
        reference: paymentTimeEntry.payment.reference,
        description: paymentTimeEntry.payment.description,
        status: paymentTimeEntry.payment.status
      } : null
    };
    
    // Log de sucesso
    console.log('Mobile - Registro de horas visualizado:', { 
      userId: auth.id,
      entryId: id
    });
    
    // Retornar o registro
    return createCorsResponse({ timeEntry: formattedEntry });
    
  } catch (error) {
    console.error('Erro ao buscar registro de horas:', error);
    return createCorsResponse({ error: 'Erro ao buscar registro de horas' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 