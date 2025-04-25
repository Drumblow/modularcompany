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

// Schema de validação para criação de time entry
const timeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora de início deve estar no formato HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fim deve estar no formato HH:MM"),
  totalHours: z.number().positive("Total de horas deve ser positivo"),
  observation: z.string().optional(),
  project: z.string().optional(),
});

// GET - Listar registros de horas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    serverLog("[API time-entries GET] Session user:", {
      id: session.user.id,
      role: session.user.role,
      companyId: session.user.companyId
    });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const unpaid = searchParams.get("unpaid") === "true";
    const approvedParam = searchParams.get("approved");

    serverLog("[API time-entries GET] Search params:", {
      userId,
      startDate,
      endDate,
      unpaid, 
      approved: approvedParam
    });

    // Construir filtro baseado nos parâmetros
    const filter: any = {};
    
    serverLog("[API time-entries GET] Configurando filtros com parâmetros:", {
      userId,
      startDate,
      endDate,
      unpaid,
      approved: approvedParam,
      userRole: session.user.role,
      userCompanyId: session.user.companyId,
      userSessionId: session.user.id
    });

    // Se um userId específico foi solicitado
    if (userId) {
      serverLog(`[API time-entries GET] Foi solicitado um userId específico: ${userId}`);
      // Verificar se o usuário está buscando suas próprias entradas
      if (userId === session.user.id) {
        serverLog(`[API time-entries GET] Usuário buscando suas próprias entradas`);
        // Sempre permitir que um usuário veja suas próprias entradas, independente do papel
        filter.userId = userId;
      } 
      // Para gerentes, verificar se o usuário solicitado é da mesma empresa
      else if (session.user.role === "MANAGER" && session.user.companyId) {
        filter.userId = userId;
        filter.user = {
          companyId: session.user.companyId
        };
        serverLog("[API time-entries GET] MANAGER filtrando entradas de um usuário específico da mesma empresa:", filter);
      }
      // Para admins, verificar se o usuário solicitado é da mesma empresa
      else if (session.user.role === "ADMIN" && session.user.companyId) {
        filter.userId = userId;
        filter.user = {
          companyId: session.user.companyId
        };
        serverLog("[API time-entries GET] ADMIN filtrando entradas de um usuário específico da mesma empresa:", filter);
      }
      // Desenvolvedores podem ver tudo
      else if (session.user.role === "DEVELOPER") {
        filter.userId = userId;
        serverLog("[API time-entries GET] DEVELOPER filtrando entradas de um usuário específico:", filter);
      }
      // Funcionários só podem ver suas próprias entradas
      else if (session.user.role === "EMPLOYEE") {
        // Verificar se está tentando acessar entradas de outro usuário
        if (userId !== session.user.id) {
          serverLog("[API time-entries GET] EMPLOYEE tentando acessar entradas de outro usuário - negado");
          return NextResponse.json(
            { message: "Acesso negado. Você só pode ver suas próprias entradas." },
            { status: 403 }
          );
        }
        filter.userId = session.user.id;
        serverLog("[API time-entries GET] EMPLOYEE filtrando suas próprias entradas:", filter);
      }
    } 
    // Se nenhum userId específico foi solicitado
    else {
      // Se for funcionário, mostrar apenas seus próprios registros
      if (session.user.role === "EMPLOYEE") {
        filter.userId = session.user.id;
        serverLog("[API time-entries GET] EMPLOYEE - mostrando apenas entradas próprias:", filter);
      } 
      // Se for gerente, mostrar apenas usuários da mesma empresa
      else if (session.user.role === "MANAGER" && session.user.companyId) {
        filter.user = {
          companyId: session.user.companyId
        };
        serverLog("[API time-entries GET] MANAGER - mostrando todas as entradas da empresa:", filter);
      }
      // Se for admin, mostrar apenas usuários da mesma empresa
      else if (session.user.role === "ADMIN" && session.user.companyId) {
        filter.user = {
          companyId: session.user.companyId
        };
        serverLog("[API time-entries GET] ADMIN - mostrando todas as entradas da empresa:", filter);
      }
      // Se for desenvolvedor, pode ver todos
      else if (session.user.role === "DEVELOPER") {
        serverLog("[API time-entries GET] DEVELOPER - mostrando todas as entradas:", filter);
      }
      else {
        // Caso padrão: mostrar apenas seus próprios registros
        filter.userId = session.user.id;
        serverLog("[API time-entries GET] Caso padrão - mostrando apenas entradas próprias:", filter);
      }
    }

    // Filtro para aprovados - só aplicar se for explicitamente solicitado
    if (approvedParam !== null) {
      filter.approved = approvedParam === "true";
      serverLog(`[API time-entries GET] Applying explicit approved filter: ${filter.approved}`);
    } else {
      serverLog(`[API time-entries GET] No approved filter applied`);
    }

    // Filtros de data
    if (startDate) {
      filter.date = {
        ...filter.date,
        gte: new Date(`${startDate}T00:00:00`)  // Sem 'Z' para evitar conversão UTC
      };
    }
    
    if (endDate) {
      filter.date = {
        ...filter.date,
        lte: new Date(`${endDate}T23:59:59`)  // Sem 'Z' para evitar conversão UTC
      };
    }

    // Buscar entradas de tempo, com base no papel do usuário
    let timeEntries;
    
    if (unpaid) {
      // Se o filtro unpaid estiver ativo, buscar apenas entradas que NÃO estão associadas a um pagamento
      serverLog("[API time-entries GET] Filtering for unpaid entries with filter:", filter);
      timeEntries = await prisma.$transaction(async (tx) => {
        // Primeiro, buscar todas as entradas que estão em pagamentos
        const paidEntries = await tx.paymentTimeEntry.findMany({
          select: {
            timeEntryId: true
          }
        });
        
        const paidEntryIds = paidEntries.map(entry => entry.timeEntryId);
        serverLog(`[API time-entries GET] Found ${paidEntryIds.length} paid entries`);
        
        // Depois, buscar todas as entradas que não estão nessa lista
        return tx.timeEntry.findMany({
          where: {
            ...filter,
            id: {
              notIn: paidEntryIds.length > 0 ? paidEntryIds : ['none'] // Evita erro se a lista estiver vazia
            }
          },
          orderBy: {
            date: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                hourlyRate: true,
                companyId: true,
                company: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });
      });
    } else {
      // Busca normal sem filtro de pagamento
      serverLog("[API time-entries GET] Regular search with filter:", filter);
      timeEntries = await prisma.timeEntry.findMany({
        where: filter,
        orderBy: {
          date: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              hourlyRate: true,
              companyId: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });
    }

    serverLog(`[API time-entries GET] Found ${timeEntries.length} entries before formatting`);

    // Formatar os dados para o cliente
    const formattedEntries = timeEntries.map(entry => {
      // Extrair data correta, ajustando para compensar qualquer diferença de fuso horário
      const dateStr = entry.date.toISOString().split('T')[0];
      
      // Extrair horas e minutos diretamente do objeto Date
      const startTimeHours = entry.startTime.getHours().toString().padStart(2, '0');
      const startTimeMinutes = entry.startTime.getMinutes().toString().padStart(2, '0');
      const endTimeHours = entry.endTime.getHours().toString().padStart(2, '0');
      const endTimeMinutes = entry.endTime.getMinutes().toString().padStart(2, '0');
      
      // Tratamento seguro para propriedades que podem não existir no modelo Prisma
      // @ts-ignore - esses campos existem no modelo extendido
      const approved = entry.approved !== undefined ? entry.approved : null;
      // @ts-ignore - esses campos existem no modelo extendido
      const rejected = entry.rejected !== undefined ? entry.rejected : null;
      // @ts-ignore - esses campos existem no modelo extendido
      const rejectionReason = entry.rejectionReason || null;
      // @ts-ignore - esses campos existem no modelo extendido
      const project = entry.project || null;
      
      return {
        id: entry.id,
        date: dateStr,
        startTime: `${startTimeHours}:${startTimeMinutes}`,
        endTime: `${endTimeHours}:${endTimeMinutes}`,
        totalHours: entry.totalHours,
        observation: entry.observation,
        userId: entry.userId,
        userName: entry.user.name,
        userEmail: entry.user.email,
        hourlyRate: entry.user.hourlyRate,
        companyId: entry.user.companyId,
        companyName: entry.user.company?.name || 'Empresa não especificada',
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        approved,
        rejected,
        rejectionReason,
        project,
      };
    });

    serverLog(`[API time-entries GET] Returning ${formattedEntries.length} formatted entries`);
    return NextResponse.json(formattedEntries);
  } catch (error: any) {
    serverError("Erro ao buscar registros de horas:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// POST - Criar um novo registro de horas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    
    // Validar dados
    const result = timeEntrySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, startTime, endTime, totalHours, observation, project } = result.data;

    // Verificar se já existem registros conflitantes
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);
    
    // Buscar registros existentes para este usuário na mesma data
    serverLog(`[DETECÇÃO DE CONFLITO] Buscando registros existentes para userId=${session.user.id} na data=${date}`);
    
    // CORREÇÃO: Simplificar a lógica para buscar TODOS os registros na mesma data,
    // independente do status de aprovação ou rejeição
    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id as string,
        date: new Date(`${date}T00:00:00`),
        // Removemos todos os filtros relacionados a status
      }
    });
    
    serverLog(`[DETECÇÃO DE CONFLITO] Encontrados ${existingEntries.length} registros existentes para verificação`);
    serverLog(`[DETECÇÃO DE CONFLITO] Detalhes do novo registro: data=${date}, startTime=${startTime}, endTime=${endTime}, project=${project || 'Sem projeto'}`);
    
    for (const entry of existingEntries) {
      serverLog(`[DETECÇÃO DE CONFLITO] Verificando registro: id=${entry.id}, data=${entry.date.toISOString().split('T')[0]}, startTime=${entry.startTime.getHours().toString().padStart(2, '0')}:${entry.startTime.getMinutes().toString().padStart(2, '0')}, endTime=${entry.endTime.getHours().toString().padStart(2, '0')}:${entry.endTime.getMinutes().toString().padStart(2, '0')}, approved=${entry.approved}, rejected=${entry.rejected}, project=${entry.project || 'Sem projeto'}`);
    }
    
    // Verificar sobreposições
    const conflictingEntries = existingEntries.filter(entry => {
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
      
      serverLog(`[DETECÇÃO DE CONFLITO] Comparando novo registro ${newStartHour}:${newStartMinute}-${newEndHour}:${newEndMinute} com existente ${entryStartHour}:${entryStartMinute}-${entryEndHour}:${entryEndMinute}`);
      serverLog(`[DETECÇÃO DE CONFLITO] Em minutos: Novo [${newStartMinutes}-${newEndMinutes}], Existente [${entryStartMinutes}-${entryEndMinutes}]`);
      serverLog(`[DETECÇÃO DE CONFLITO] Status do registro existente: approved=${entry.approved}, rejected=${entry.rejected}`);
      
      // Caso 1: Novo horário começa durante um registro existente
      const case1 = newStartMinutes >= entryStartMinutes && newStartMinutes < entryEndMinutes;
      // Caso 2: Novo horário termina durante um registro existente
      const case2 = newEndMinutes > entryStartMinutes && newEndMinutes <= entryEndMinutes;
      // Caso 3: Novo horário engloba completamente um registro existente
      const case3 = newStartMinutes <= entryStartMinutes && newEndMinutes >= entryEndMinutes;
      // Caso 4: Registro existente engloba completamente o novo horário
      const case4 = entryStartMinutes <= newStartMinutes && entryEndMinutes >= newEndMinutes;
      
      // Verificar se há sobreposição de horário
      const hasOverlap = case1 || case2 || case3 || case4;
      
      if (hasOverlap) {
        serverLog(`[DETECÇÃO DE CONFLITO] CONFLITO DETECTADO com registro ${entry.id}!`);
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

    // Se houver conflitos, FORÇAR este bloco a ser executado
    serverLog(`[DETECÇÃO DE CONFLITO] Registros conflitantes encontrados: ${conflictingEntries.length}`);
    
    // Se houver conflitos, retornar erro com os detalhes
    if (conflictingEntries.length > 0) {
      serverLog(`[DETECÇÃO DE CONFLITO] ======== BLOQUEANDO CRIAÇÃO DE NOVO REGISTRO ========`);
      serverLog(`[DETECÇÃO DE CONFLITO] Motivo: ${conflictingEntries.length} conflitos de horário detectados`);
      serverLog(`[DETECÇÃO DE CONFLITO] Horário solicitado: ${date} ${startTime}-${endTime}`);
      
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

    // Criar o registro de horas
    const timeEntry = await prisma.timeEntry.create({
      data: {
        date: new Date(`${date}T00:00:00`), // Converter para objeto Date com horário
        startTime: new Date(`${date}T${startTime}:00`), // Converter para objeto Date
        endTime: new Date(`${date}T${endTime}:00`), // Converter para objeto Date
        totalHours: totalHours,
        observation: observation,
        project: project,
        userId: session.user.id as string,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            companyId: true
          }
        }
      }
    });

    // Notificar gerentes sobre o novo registro
    try {
      // Obter gerentes e administradores da mesma empresa
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ["MANAGER", "ADMIN"] },
          companyId: timeEntry.user.companyId,
        }
      });

      // Criar notificação para cada gerente e administrador
      if (managers.length > 0) {
        try {
          const createNotificationsPromises = managers.map(manager => 
            prisma.notification.create({
              data: {
                title: "Novo registro de horas",
                message: `${timeEntry.user.name} registrou ${totalHours.toFixed(2)}h no dia ${new Date(date).toLocaleDateString('pt-BR')}.`,
                type: "info",
                userId: manager.id,
                relatedId: timeEntry.id,
                relatedType: "timeEntry",
              }
            }).catch(error => {
              serverError(`Erro ao criar notificação para gerente/admin ${manager.id}:`, error);
              return null; // Continuar mesmo se houver falha em uma notificação
            })
          );

          // Executar criação de notificações em paralelo
          await Promise.all(createNotificationsPromises);
        } catch (innerError) {
          serverError('Erro durante criação de notificações:', innerError);
          // Não interrompe o fluxo principal
        }
      }
    } catch (notificationError) {
      serverError('Erro ao buscar gerentes e administradores:', notificationError);
      // Não impede o fluxo principal se as notificações falharem
    }

    // Formatar os dados para o cliente
    const formattedEntry = {
      id: timeEntry.id,
      date: date,
      startTime: startTime,
      endTime: endTime,
      totalHours: timeEntry.totalHours,
      observation: timeEntry.observation,
      userId: timeEntry.userId,
      userName: timeEntry.user.name,
      createdAt: timeEntry.createdAt,
      updatedAt: timeEntry.updatedAt,
    };

    return NextResponse.json(formattedEntry, { status: 201 });
  } catch (error: any) {
    serverError("Erro ao criar registro de horas:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
} 