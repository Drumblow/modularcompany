import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { devLog, devWarn, devError } from "@/lib/logger";

// Funções de log do lado do servidor
const serverLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      devLog(message, data);
    } else {
      devLog(message);
    }
  }
};

const serverWarn = (message: string, data?: any) => {
  if (data !== undefined) {
    devWarn(message, data);
  } else {
    devWarn(message);
  }
};

const serverError = (message: string, data?: any) => {
  if (data !== undefined) {
    devError(message, data);
  } else {
    devError(message);
  }
};

// Schema de validação para atualização de time entry
const timeEntryUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora de início deve estar no formato HH:MM").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fim deve estar no formato HH:MM").optional(),
  totalHours: z.number().positive("Total de horas deve ser positivo").optional(),
  observation: z.string().optional(),
  project: z.string().optional(),
});

// GET - Buscar um registro de horas específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hourlyRate: true,
            companyId: true,
          }
        }
      }
    });

    if (!timeEntry) {
      return NextResponse.json(
        { message: "Registro não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canAccess = 
      session.user.id === timeEntry.userId || // Próprio usuário
      session.user.role === "DEVELOPER" || // Desenvolvedor pode tudo
      session.user.role === "ADMIN" || // Admin pode tudo
      (session.user.role === "MANAGER" && session.user.companyId === timeEntry.user.companyId); // Gerente da mesma empresa

    if (!canAccess) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Formatar os dados para o cliente
    const formattedEntry = {
      id: timeEntry.id,
      date: timeEntry.date.toISOString().split('T')[0],
      startTime: timeEntry.startTime.getHours().toString().padStart(2, '0') + ':' + 
                timeEntry.startTime.getMinutes().toString().padStart(2, '0'),
      endTime: timeEntry.endTime.getHours().toString().padStart(2, '0') + ':' + 
              timeEntry.endTime.getMinutes().toString().padStart(2, '0'),
      totalHours: timeEntry.totalHours,
      observation: timeEntry.observation,
      userId: timeEntry.userId,
      userName: timeEntry.user.name,
      userEmail: timeEntry.user.email,
      hourlyRate: timeEntry.user.hourlyRate,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
      // @ts-ignore - esses campos existem no modelo extendido
      approved: timeEntry.approved !== undefined ? timeEntry.approved : null,
      // @ts-ignore - esses campos existem no modelo extendido
      rejected: timeEntry.rejected !== undefined ? timeEntry.rejected : null,
      // @ts-ignore - esses campos existem no modelo extendido
      rejectionReason: timeEntry.rejectionReason || null,
      // @ts-ignore - esses campos existem no modelo extendido
      project: timeEntry.project || null,
    };

    return NextResponse.json(formattedEntry);
  } catch (error: any) {
    serverError("Erro ao buscar registro de horas:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um registro de horas
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Verificar se o registro existe
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            companyId: true,
          }
        }
      }
    });

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Registro não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissões
    const canEdit = 
      session.user.id === existingEntry.userId || // Próprio usuário
      session.user.role === "DEVELOPER" || // Desenvolvedor pode tudo
      session.user.role === "ADMIN" || // Admin pode tudo
      (session.user.role === "MANAGER" && session.user.companyId === existingEntry.user.companyId); // Gerente da mesma empresa

    if (!canEdit) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Validar dados
    const result = timeEntryUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, startTime, endTime, totalHours, observation, project } = result.data;

    // Preparar dados para atualização e verificar conflitos
    const updateData: any = {};
    
    const dateToUse = date || existingEntry.date.toISOString().split('T')[0];
    const startTimeToUse = startTime || existingEntry.startTime.getHours().toString().padStart(2, '0') + ':' + 
                          existingEntry.startTime.getMinutes().toString().padStart(2, '0');
    const endTimeToUse = endTime || existingEntry.endTime.getHours().toString().padStart(2, '0') + ':' + 
                        existingEntry.endTime.getMinutes().toString().padStart(2, '0');
    
    // Criar objetos Date para os novos horários
    const startDateTime = new Date(`${dateToUse}T${startTimeToUse}:00`);
    const endDateTime = new Date(`${dateToUse}T${endTimeToUse}:00`);
    
    // Buscar registros existentes para este usuário na mesma data
    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: existingEntry.userId,
        date: new Date(`${dateToUse}T00:00:00`),
        id: { not: params.id }, // Excluir o registro atual
      }
    });
    
    serverLog(`[ATUALIZAÇÃO - DETECÇÃO DE CONFLITO] Encontrados ${existingEntries.length} registros existentes para verificação`);
    existingEntries.forEach((entry, index) => {
      serverLog(`[ATUALIZAÇÃO - DETECÇÃO DE CONFLITO] Registro ${index + 1}: data=${entry.date.toISOString().split('T')[0]}, startTime=${entry.startTime.getHours().toString().padStart(2, '0')}:${entry.startTime.getMinutes().toString().padStart(2, '0')}, endTime=${entry.endTime.getHours().toString().padStart(2, '0')}:${entry.endTime.getMinutes().toString().padStart(2, '0')}, approved=${entry.approved}, rejected=${entry.rejected}`);
    });
    
    // Verificar sobreposições
    const conflictingEntries = existingEntries.filter(entry => {
      // Não contar o registro que está sendo editado
      if (entry.id === params.id) return false;
      
      // Se o registro for rejeitado, não precisa incluir na verificação
      if (entry.rejected === true) {
        serverLog(`[DETECÇÃO DE CONFLITO] Ignorando registro ${entry.id} pois foi rejeitado`);
        return false;
      }
      
      // Extrair apenas horas e minutos para comparação
      const entryStartHour = entry.startTime.getHours();
      const entryStartMinute = entry.startTime.getMinutes();
      const entryEndHour = entry.endTime.getHours();
      const entryEndMinute = entry.endTime.getMinutes();
      
      const newStartHour = startDateTime.getHours();
      const newStartMinute = startDateTime.getMinutes();
      const newEndHour = endDateTime.getHours();
      const newEndMinute = endDateTime.getMinutes();
      
      // Converter para minutos desde o início do dia para facilitar a comparação
      const entryStartMinutes = entryStartHour * 60 + entryStartMinute;
      const entryEndMinutes = entryEndHour * 60 + entryEndMinute;
      const newStartMinutes = newStartHour * 60 + newStartMinute;
      const newEndMinutes = newEndHour * 60 + newEndMinute;
      
      serverLog(`[DETECÇÃO DE CONFLITO] Comparando registro editado ${newStartHour}:${newStartMinute}-${newEndHour}:${newEndMinute} com existente ${entryStartHour}:${entryStartMinute}-${entryEndHour}:${entryEndMinute}`);
      serverLog(`[DETECÇÃO DE CONFLITO] Em minutos: Editado [${newStartMinutes}-${newEndMinutes}], Existente [${entryStartMinutes}-${entryEndMinutes}]`);
      serverLog(`[DETECÇÃO DE CONFLITO] Status do registro existente: approved=${entry.approved}, rejected=${entry.rejected}`);
      
      // Caso 1: Novo horário começa durante um registro existente
      const case1 = newStartMinutes >= entryStartMinutes && newStartMinutes < entryEndMinutes;
      // Caso 2: Novo horário termina durante um registro existente
      const case2 = newEndMinutes > entryStartMinutes && newEndMinutes <= entryEndMinutes;
      // Caso 3: Novo horário engloba completamente um registro existente
      const case3 = newStartMinutes <= entryStartMinutes && newEndMinutes >= entryEndMinutes;
      // Caso 4: Registro existente engloba completamente o novo horário
      const case4 = entryStartMinutes <= newStartMinutes && entryEndMinutes >= newEndMinutes;
      
      const hasOverlap = case1 || case2 || case3 || case4;
      
      if (hasOverlap) {
        serverLog(`[DETECÇÃO DE CONFLITO] CONFLITO DETECTADO entre [${newStartMinutes}-${newEndMinutes}] e [${entryStartMinutes}-${entryEndMinutes}]`);
        serverLog(`[DETECÇÃO DE CONFLITO] Status do registro em conflito: approved=${entry.approved}, rejected=${entry.rejected}`);
        
        if (case1) serverLog(`[DETECÇÃO DE CONFLITO] Motivo: Novo horário começa durante um registro existente`);
        if (case2) serverLog(`[DETECÇÃO DE CONFLITO] Motivo: Novo horário termina durante um registro existente`);
        if (case3) serverLog(`[DETECÇÃO DE CONFLITO] Motivo: Novo horário engloba um registro existente`);
        if (case4) serverLog(`[DETECÇÃO DE CONFLITO] Motivo: Registro existente engloba completamente o novo horário`);
      } else {
        serverLog(`[DETECÇÃO DE CONFLITO] Sem sobreposição entre os horários`);
      }
      
      return hasOverlap;
    });
    
    // Se houver conflitos, retornar erro com os detalhes
    if (conflictingEntries.length > 0) {
      serverLog(`[DETECÇÃO DE CONFLITO] ======== BLOQUEANDO ATUALIZAÇÃO DE REGISTRO ========`);
      serverLog(`[DETECÇÃO DE CONFLITO] Motivo: ${conflictingEntries.length} conflitos de horário detectados`);
      serverLog(`[DETECÇÃO DE CONFLITO] Horário solicitado: ${dateToUse} ${startTimeToUse}-${endTimeToUse}`);
      
      const conflicts = conflictingEntries.map(entry => {
        const entryStartHour = entry.startTime.getHours();
        const entryStartMinute = entry.startTime.getMinutes();
        const entryEndHour = entry.endTime.getHours();
        const entryEndMinute = entry.endTime.getMinutes();
        
        const newStartHour = startDateTime.getHours();
        const newStartMinute = startDateTime.getMinutes();
        const newEndHour = endDateTime.getHours();
        const newEndMinute = endDateTime.getMinutes();
        
        // Converter para minutos desde o início do dia
        const entryStartMinutes = entryStartHour * 60 + entryStartMinute;
        const entryEndMinutes = entryEndHour * 60 + entryEndMinute;
        const newStartMinutes = newStartHour * 60 + newStartMinute;
        const newEndMinutes = newEndHour * 60 + newEndMinute;
        
        // Calcular a sobreposição em minutos
        const overlapStart = Math.max(newStartMinutes, entryStartMinutes);
        const overlapEnd = Math.min(newEndMinutes, entryEndMinutes);
        const overlapMinutes = overlapEnd - overlapStart;
        
        // Formatar os horários de sobreposição para exibição
        const overlapStartHour = Math.floor(overlapStart / 60);
        const overlapStartMinute = overlapStart % 60;
        const overlapEndHour = Math.floor(overlapEnd / 60);
        const overlapEndMinute = overlapEnd % 60;
        
        const overlapStartFormatted = `${overlapStartHour.toString().padStart(2, '0')}:${overlapStartMinute.toString().padStart(2, '0')}`;
        const overlapEndFormatted = `${overlapEndHour.toString().padStart(2, '0')}:${overlapEndMinute.toString().padStart(2, '0')}`;
        
        const conflictInfo = {
          id: entry.id,
          date: entry.date.toISOString().split('T')[0],
          startTime: `${entry.startTime.getHours().toString().padStart(2, '0')}:${entry.startTime.getMinutes().toString().padStart(2, '0')}`,
          endTime: `${entry.endTime.getHours().toString().padStart(2, '0')}:${entry.endTime.getMinutes().toString().padStart(2, '0')}`,
          project: entry.project,
          approved: entry.approved,
          rejected: entry.rejected,
          overlapMinutes,
          overlapPeriod: `${overlapStartFormatted} - ${overlapEndFormatted}`
        };
        
        serverLog(`[DETECÇÃO DE CONFLITO] Detalhe do conflito:`, conflictInfo);
        return conflictInfo;
      });
      
      return NextResponse.json({
        message: "Conflito de horários detectado. Você já possui registros neste período.",
        details: "O sistema não permite registrar horas em períodos sobrepostos. Por favor, ajuste o horário.",
        conflicts
      }, { status: 409 }); // 409 Conflict
    }
    
    if (date) updateData.date = new Date(`${date}T12:00:00`); // Meio-dia para evitar problemas
    if (startTime && date) updateData.startTime = new Date(`${date}T${startTime}:00`);
    else if (startTime) updateData.startTime = new Date(`${existingEntry.date.toISOString().split('T')[0]}T${startTime}:00`);
    if (endTime && date) updateData.endTime = new Date(`${date}T${endTime}:00`);
    else if (endTime) updateData.endTime = new Date(`${existingEntry.date.toISOString().split('T')[0]}T${endTime}:00`);
    if (totalHours !== undefined) updateData.totalHours = totalHours;
    if (observation !== undefined) updateData.observation = observation;
    if (project !== undefined) updateData.project = project;

    // Atualizar o registro
    const updatedEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            name: true,
          }
        }
      }
    });

    // Formatar os dados para o cliente
    const formattedEntry = {
      id: updatedEntry.id,
      date: updatedEntry.date.toISOString().split('T')[0],
      startTime: updatedEntry.startTime.getHours().toString().padStart(2, '0') + ':' + 
                updatedEntry.startTime.getMinutes().toString().padStart(2, '0'),
      endTime: updatedEntry.endTime.getHours().toString().padStart(2, '0') + ':' + 
              updatedEntry.endTime.getMinutes().toString().padStart(2, '0'),
      totalHours: updatedEntry.totalHours,
      observation: updatedEntry.observation,
      userId: updatedEntry.userId,
      userName: updatedEntry.user.name,
      createdAt: updatedEntry.createdAt,
      updatedAt: updatedEntry.updatedAt,
      // @ts-ignore - esses campos existem no modelo extendido
      approved: updatedEntry.approved !== undefined ? updatedEntry.approved : null,
      // @ts-ignore - esses campos existem no modelo extendido
      rejected: updatedEntry.rejected !== undefined ? updatedEntry.rejected : null,
      // @ts-ignore - esses campos existem no modelo extendido
      rejectionReason: updatedEntry.rejectionReason || null,
      // @ts-ignore - esses campos existem no modelo extendido
      project: updatedEntry.project || null,
    };

    return NextResponse.json(formattedEntry);
  } catch (error: any) {
    serverError("Erro ao atualizar registro de horas:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um registro de horas
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    serverLog(`[API DELETE time-entry] Iniciando exclusão para ID: ${params.id}`);
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      serverLog(`[API DELETE time-entry] Sessão não encontrada, não autorizado`);
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    serverLog(`[API DELETE time-entry] Sessão do usuário:`, {
      id: session.user.id,
      role: session.user.role,
      companyId: session.user.companyId
    });

    // Verificar se o registro existe
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            companyId: true,
          }
        }
      }
    });

    if (!existingEntry) {
      serverLog(`[API DELETE time-entry] Registro não encontrado para ID: ${params.id}`);
      return NextResponse.json(
        { message: "Registro não encontrado" },
        { status: 404 }
      );
    }

    serverLog(`[API DELETE time-entry] Registro encontrado:`, {
      id: existingEntry.id,
      userId: existingEntry.userId,
      userCompanyId: existingEntry.user.companyId,
      date: existingEntry.date,
      startTime: existingEntry.startTime,
      endTime: existingEntry.endTime,
    });

    // Verificar permissões
    const canDelete = 
      session.user.id === existingEntry.userId || // Próprio usuário
      session.user.role === "DEVELOPER" || // Desenvolvedor pode tudo
      session.user.role === "ADMIN" || // Admin pode tudo
      (session.user.role === "MANAGER" && session.user.companyId === existingEntry.user.companyId); // Gerente da mesma empresa

    serverLog(`[API DELETE time-entry] Verificação de permissões:`, {
      isOwnEntry: session.user.id === existingEntry.userId,
      isDeveloper: session.user.role === "DEVELOPER",
      isAdmin: session.user.role === "ADMIN",
      isManagerOfSameCompany: session.user.role === "MANAGER" && session.user.companyId === existingEntry.user.companyId,
      canDelete
    });

    if (!canDelete) {
      serverLog(`[API DELETE time-entry] Acesso negado para usuário ${session.user.id} com papel ${session.user.role}`);
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Verificar se o registro está em algum pagamento
    const paymentTimeEntry = await prisma.paymentTimeEntry.findFirst({
      where: { timeEntryId: params.id }
    });

    if (paymentTimeEntry) {
      serverLog(`[API DELETE time-entry] Registro já está associado a um pagamento, ID: ${paymentTimeEntry.paymentId}`);
      return NextResponse.json(
        { message: "Não é possível excluir um registro que já está em um pagamento" },
        { status: 400 }
      );
    }

    // Excluir o registro
    await prisma.timeEntry.delete({
      where: { id: params.id }
    });

    serverLog(`[API DELETE time-entry] Registro excluído com sucesso: ${params.id}`);
    return NextResponse.json(
      { message: "Registro excluído com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    serverError(`[API DELETE time-entry] Erro ao excluir registro: ${error.message}`, error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
} 