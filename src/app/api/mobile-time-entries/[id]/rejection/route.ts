import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format } from 'date-fns';

// GET - Endpoint para obter detalhes de rejeição de um registro
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
            email: true
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
    
    // Verificar se o registro foi rejeitado
    if (timeEntry.rejected !== true) {
      return createCorsResponse({ error: 'Este registro não foi rejeitado' }, 400);
    }
    
    // Buscar histórico de aprovações/rejeições se disponível
    // Neste caso, estamos simulando que existe um histórico,
    // mas você pode adaptar para o modelo real do seu banco de dados
    const approvalHistory = await prisma.notification.findMany({
      where: {
        relatedId: id,
        relatedType: 'timeEntry',
        type: 'error' // Assumindo que notificações de rejeição são do tipo 'error'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    // Formatar as datas para o cliente
    const formattedTimeEntry = {
      id: timeEntry.id,
      date: format(timeEntry.date, 'yyyy-MM-dd'),
      startTime: format(timeEntry.startTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      endTime: format(timeEntry.endTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      totalHours: timeEntry.totalHours,
      observation: timeEntry.observation,
      project: timeEntry.project,
      rejected: timeEntry.rejected,
      rejectionReason: timeEntry.rejectionReason || 'Nenhum motivo especificado',
      rejectedAt: approvalHistory.length > 0 ? format(approvalHistory[0].createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss') : null,
      history: approvalHistory.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        createdAt: format(notification.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss')
      }))
    };
    
    // Log de sucesso
    console.log('Mobile - Detalhes de rejeição visualizados:', { userId: auth.id, entryId: id });
    
    // Retornar o registro
    return createCorsResponse({ 
      timeEntry: formattedTimeEntry
    });
    
  } catch (error) {
    console.error('Erro ao buscar detalhes de rejeição:', error);
    return createCorsResponse({ error: 'Erro ao buscar detalhes de rejeição' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 