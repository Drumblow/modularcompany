import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format } from 'date-fns';

// PUT - Endpoint para aprovar ou rejeitar um registro de horas
export async function PUT(
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
    
    // Verificar permissões - apenas ADMIN e MANAGER podem aprovar
    if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER' && auth.role !== 'DEVELOPER') {
      return createCorsResponse({ 
        error: 'Você não tem permissão para aprovar ou rejeitar registros de horas'
      }, 403);
    }
    
    // Obter dados do corpo da requisição
    const body = await req.json();
    const { approved, rejectionReason } = body;
    
    // Validar entradas
    if (approved === undefined) {
      return createCorsResponse({ 
        error: 'É necessário informar se o registro está sendo aprovado ou rejeitado'
      }, 400);
    }
    
    // Se rejeitando, verificar se há motivo
    if (approved === false && !rejectionReason) {
      return createCorsResponse({ 
        error: 'É necessário informar o motivo da rejeição'
      }, 400);
    }
    
    // Buscar o registro e verificar se existe
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyId: true
          }
        }
      }
    });
    
    if (!timeEntry) {
      return createCorsResponse({ error: 'Registro não encontrado' }, 404);
    }
    
    // Verificar se o registro pertence a um usuário da mesma empresa
    if (timeEntry.user.companyId !== auth.companyId && auth.role !== 'DEVELOPER') {
      return createCorsResponse({ 
        error: 'Você não tem permissão para aprovar registros de usuários de outras empresas'
      }, 403);
    }
    
    // Preparar dados para atualização
    const updateData: any = {};
    
    if (approved) {
      updateData.approved = true;
      updateData.rejected = false;
      updateData.rejectionReason = null;
    } else {
      updateData.approved = false;
      updateData.rejected = true;
      updateData.rejectionReason = rejectionReason;
    }
    
    // Atualizar o registro
    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: updateData
    });
    
    // Criar notificação para o usuário
    try {
      // Configuração da notificação
      const notificationType = approved ? 'success' : 'error';
      const notificationTitle = approved 
        ? 'Registro de horas aprovado' 
        : 'Registro de horas rejeitado';
      
      const entryDate = format(timeEntry.date, 'dd/MM/yyyy');
      const notificationMessage = approved 
        ? `Seu registro de horas do dia ${entryDate} foi aprovado.` 
        : `Seu registro de horas do dia ${entryDate} foi rejeitado: ${rejectionReason}`;
      
      // Criar a notificação no banco de dados
      await prisma.notification.create({
        data: {
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          userId: timeEntry.userId,
          relatedId: id,
          relatedType: 'timeEntry'
        }
      });
      
      console.log('Mobile - Notificação criada para aprovação/rejeição:', {
        userId: timeEntry.userId,
        timeEntryId: id,
        approved
      });
      
    } catch (notificationError) {
      // Log do erro mas não impede o fluxo principal
      console.error('Erro ao criar notificação:', notificationError);
    }
    
    // Formatar resposta
    const response = {
      id: updatedTimeEntry.id,
      approved: updatedTimeEntry.approved,
      rejected: updatedTimeEntry.rejected,
      rejectionReason: updatedTimeEntry.rejectionReason,
      message: approved 
        ? 'Registro aprovado com sucesso' 
        : 'Registro rejeitado com sucesso'
    };
    
    // Log de sucesso
    console.log('Mobile - Registro de horas ' + (approved ? 'aprovado' : 'rejeitado') + ':', {
      approverUserId: auth.id,
      approverRole: auth.role,
      timeEntryId: id,
      timeEntryUserId: timeEntry.userId
    });
    
    return createCorsResponse(response);
    
  } catch (error) {
    console.error('Erro ao aprovar/rejeitar registro de horas:', error);
    return createCorsResponse({ error: 'Erro ao processar a solicitação' }, 500);
  }
}

// OPTIONS - Para suporte a CORS
export async function OPTIONS() {
  return createCorsResponse({});
} 