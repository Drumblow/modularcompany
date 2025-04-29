import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format, parseISO } from 'date-fns';

// Visualizar um registro específico
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
    
    // Verificar se o usuário tem permissão para visualizar
    if (timeEntry.userId !== auth.id) {
      return createCorsResponse({ error: 'Você não tem permissão para visualizar este registro' }, 403);
    }
    
    // Buscar informações de pagamento se houver
    const paymentEntry = await prisma.paymentTimeEntry.findFirst({
      where: { timeEntryId: id },
      include: {
        payment: true
      }
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
      userId: timeEntry.userId,
      userName: timeEntry.user.name,
      approved: timeEntry.approved,
      rejected: timeEntry.rejected,
      rejectionReason: timeEntry.rejectionReason,
      createdAt: format(timeEntry.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      updatedAt: format(timeEntry.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      payment: paymentEntry ? {
        id: paymentEntry.payment.id,
        amount: paymentEntry.payment.amount,
        date: format(paymentEntry.payment.date, 'yyyy-MM-dd'),
        reference: paymentEntry.payment.reference,
        description: paymentEntry.payment.description,
        status: paymentEntry.payment.status
      } : null
    };
    
    // Log de sucesso
    console.log('Mobile - Registro de horas visualizado:', { userId: auth.id, entryId: id });
    
    // Retornar o registro
    return createCorsResponse({ 
      timeEntry: formattedTimeEntry
    });
    
  } catch (error) {
    console.error('Erro ao buscar registro de horas:', error);
    return createCorsResponse({ error: 'Erro ao buscar registro de horas' }, 500);
  }
}

// Editar um registro de horas
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
    
    // Verificar se o registro existe
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id }
    });
    
    if (!existingEntry) {
      return createCorsResponse({ error: 'Registro não encontrado' }, 404);
    }
    
    // Verificar se o usuário é o dono do registro
    if (existingEntry.userId !== auth.id) {
      return createCorsResponse({ error: 'Você não tem permissão para editar este registro' }, 403);
    }
    
    // Verificar se já foi aprovado ou rejeitado
    if (existingEntry.approved === true) {
      return createCorsResponse({ error: 'Não é possível editar um registro já aprovado' }, 400);
    }
    
    // Verificar se está associado a algum pagamento
    const paymentEntry = await prisma.paymentTimeEntry.findFirst({
      where: { timeEntryId: id }
    });
    
    if (paymentEntry) {
      return createCorsResponse({ 
        error: 'Este registro já está associado a um pagamento e não pode ser editado' 
      }, 400);
    }
    
    // Obter dados do corpo da requisição
    const body = await req.json();
    const { date, startTime, endTime, observation, project } = body;
    
    // Validação básica
    if (!date || !startTime || !endTime) {
      return createCorsResponse({ error: 'Data, hora inicial e hora final são obrigatórios' }, 400);
    }
    
    // Converter strings para Date
    const dateObj = new Date(date);
    const startTimeObj = new Date(startTime);
    const endTimeObj = new Date(endTime);
    
    // Calcular total de horas
    const diffMs = endTimeObj.getTime() - startTimeObj.getTime();
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    
    if (totalHours <= 0) {
      return createCorsResponse({ error: 'A hora final deve ser posterior à hora inicial' }, 400);
    }
    
    // Verificar conflitos de horário (excluindo o registro atual)
    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: auth.id,
        date: { equals: dateObj },
        id: { not: id }
      }
    });
    
    // Filtrar apenas entradas não rejeitadas
    const nonRejectedEntries = existingEntries.filter(entry => entry.rejected !== true);
    
    // Verificar sobreposições
    for (const entry of nonRejectedEntries) {
      const entryStart = entry.startTime;
      const entryEnd = entry.endTime;
      
      // Verificar todos os casos de sobreposição
      const hasOverlap = 
        (startTimeObj >= entryStart && startTimeObj < entryEnd) || // Caso 1: Novo horário começa durante um registro existente
        (endTimeObj > entryStart && endTimeObj <= entryEnd) ||     // Caso 2: Novo horário termina durante um registro existente
        (startTimeObj <= entryStart && endTimeObj >= entryEnd) ||  // Caso 3: Novo horário engloba um registro existente
        (startTimeObj >= entryStart && endTimeObj <= entryEnd);    // Caso 4: Registro existente engloba o novo horário
      
      if (hasOverlap) {
        return createCorsResponse({
          error: 'Existe um conflito de horário com um registro existente',
          conflictingEntry: {
            id: entry.id,
            date: format(entry.date, 'yyyy-MM-dd'),
            startTime: format(entry.startTime, 'HH:mm'),
            endTime: format(entry.endTime, 'HH:mm')
          }
        }, 409);
      }
    }
    
    // Atualizar registro
    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        date: dateObj,
        startTime: startTimeObj,
        endTime: endTimeObj,
        totalHours,
        observation,
        project,
        // Se estava rejeitado, volta para o estado pendente
        rejected: existingEntry.rejected === true ? null : existingEntry.rejected,
        rejectionReason: existingEntry.rejected === true ? null : existingEntry.rejectionReason
      }
    });
    
    // Log de sucesso
    console.log('Mobile - Registro de horas atualizado:', { 
      userId: auth.id,
      entryId: id,
      date: format(dateObj, 'yyyy-MM-dd'),
      hours: totalHours
    });
    
    // Retornar registro atualizado
    return createCorsResponse({ 
      timeEntry: {
        ...updatedEntry,
        date: format(updatedEntry.date, 'yyyy-MM-dd'),
        startTime: format(updatedEntry.startTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endTime: format(updatedEntry.endTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        createdAt: format(updatedEntry.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        updatedAt: format(updatedEntry.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')
      }
    });
    
  } catch (error) {
    console.error('Erro ao atualizar registro de horas:', error);
    return createCorsResponse({ error: 'Erro ao atualizar registro de horas' }, 500);
  }
}

// Excluir um registro de horas
export async function DELETE(
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
    
    // Verificar se o registro existe
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id }
    });
    
    if (!existingEntry) {
      return createCorsResponse({ error: 'Registro não encontrado' }, 404);
    }
    
    // Verificar se o usuário é o dono do registro
    if (existingEntry.userId !== auth.id) {
      return createCorsResponse({ error: 'Você não tem permissão para excluir este registro' }, 403);
    }
    
    // Verificar se já foi aprovado ou rejeitado
    if (existingEntry.approved === true) {
      return createCorsResponse({ error: 'Não é possível excluir um registro já aprovado' }, 400);
    }
    
    // Verificar se está associado a algum pagamento
    const paymentEntry = await prisma.paymentTimeEntry.findFirst({
      where: { timeEntryId: id }
    });
    
    if (paymentEntry) {
      return createCorsResponse({ 
        error: 'Este registro já está associado a um pagamento e não pode ser excluído' 
      }, 400);
    }
    
    // Excluir o registro
    await prisma.timeEntry.delete({
      where: { id }
    });
    
    // Log de sucesso
    console.log('Mobile - Registro de horas excluído:', { userId: auth.id, entryId: id });
    
    // Retornar confirmação
    return createCorsResponse({ 
      message: 'Registro excluído com sucesso',
      id
    });
    
  } catch (error) {
    console.error('Erro ao excluir registro de horas:', error);
    return createCorsResponse({ error: 'Erro ao excluir registro de horas' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 