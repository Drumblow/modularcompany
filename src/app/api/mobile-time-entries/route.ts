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
  
  // Parâmetros de data
  let startDateParam = searchParams.get('startDate');
  let endDateParam = searchParams.get('endDate');
  
  // Parâmetros de filtro avançado
  const approvedParam = searchParams.get('approved');
  const rejectedParam = searchParams.get('rejected');
  const projectParam = searchParams.get('project');
  const minHoursParam = searchParams.get('minHours');
  const maxHoursParam = searchParams.get('maxHours');
  const unpaidParam = searchParams.get('unpaid');
  
  // Parâmetros de paginação e ordenação
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const sortBy = searchParams.get('sortBy') || 'date'; // Opções: date, hours, createdAt
  const sortOrder = searchParams.get('sortOrder') || 'desc'; // Opções: asc, desc
  
  // Se não fornecidos, usar o mês atual
  const today = new Date();
  const defaultStartDate = startOfMonth(today);
  const defaultEndDate = endOfMonth(today);
  
  // Analisar datas fornecidas ou usar padrões
  let startDate = startDateParam ? parseISO(startDateParam) : defaultStartDate;
  let endDate = endDateParam ? parseISO(endDateParam) : defaultEndDate;
  
  // Calcular offset para paginação
  const skip = (page - 1) * limit;
  
  try {
    // Construir filtro base
    const where: any = {
      userId: auth.id,
      date: {
        gte: startDate,
        lte: endDate
      }
    };
    
    // Adicionar filtros avançados se fornecidos
    if (approvedParam !== null) {
      where.approved = approvedParam === 'true';
    }
    
    if (rejectedParam !== null) {
      where.rejected = rejectedParam === 'true';
    }
    
    if (projectParam) {
      where.project = {
        contains: projectParam,
        mode: 'insensitive'
      };
    }
    
    if (minHoursParam) {
      where.totalHours = {
        ...(where.totalHours || {}),
        gte: parseFloat(minHoursParam)
      };
    }
    
    if (maxHoursParam) {
      where.totalHours = {
        ...(where.totalHours || {}),
        lte: parseFloat(maxHoursParam)
      };
    }
    
    // Processar filtro de registros não pagos
    let excludeTimeEntryIds: string[] = [];
    if (unpaidParam === 'true') {
      // Buscar IDs de registros associados a pagamentos
      const paymentTimeEntries = await prisma.paymentTimeEntry.findMany({
        where: {
          timeEntry: {
            userId: auth.id
          }
        },
        select: {
          timeEntryId: true
        }
      });
      
      excludeTimeEntryIds = paymentTimeEntries.map(pte => pte.timeEntryId);
      
      if (excludeTimeEntryIds.length > 0) {
        where.id = {
          notIn: excludeTimeEntryIds
        };
      }
    }
    
    // Definir ordenação
    const orderBy: any = {};
    orderBy[sortBy === 'hours' ? 'totalHours' : sortBy] = sortOrder;
    
    // Contar total para paginação
    const total = await prisma.timeEntry.count({
      where
    });
    
    // Buscar registros de horas com paginação
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      orderBy,
      skip,
      take: limit
    });
    
    // Buscar contagens por status para mostrar no frontend
    const [approved, pending, rejected] = await Promise.all([
      prisma.timeEntry.count({
        where: {
          userId: auth.id,
          date: {
            gte: startDate,
            lte: endDate
          },
          approved: true
        }
      }),
      prisma.timeEntry.count({
        where: {
          userId: auth.id,
          date: {
            gte: startDate,
            lte: endDate
          },
          approved: null,
          rejected: null
        }
      }),
      prisma.timeEntry.count({
        where: {
          userId: auth.id,
          date: {
            gte: startDate,
            lte: endDate
          },
          rejected: true
        }
      })
    ]);
    
    // Transformar as datas em strings para evitar problemas de serialização
    const formattedEntries = timeEntries.map(entry => ({
      id: entry.id,
      date: format(entry.date, 'yyyy-MM-dd'),
      startTime: format(entry.startTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      endTime: format(entry.endTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      totalHours: entry.totalHours,
      observation: entry.observation,
      project: entry.project,
      approved: entry.approved,
      rejected: entry.rejected,
      rejectionReason: entry.rejectionReason,
      createdAt: format(entry.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      updatedAt: format(entry.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')
    }));
    
    // Log de sucesso
    console.log('Mobile - Registros de horas acessados:', { 
      userId: auth.id,
      count: timeEntries.length,
      period: `${format(startDate, 'yyyy-MM-dd')} até ${format(endDate, 'yyyy-MM-dd')}`,
      filters: {
        approved: approvedParam,
        rejected: rejectedParam,
        project: projectParam,
        minHours: minHoursParam,
        maxHours: maxHoursParam,
        unpaid: unpaidParam
      },
      pagination: { page, limit }
    });
    
    // Retornar dados com informações de paginação e estatísticas
    return createCorsResponse({ 
      timeEntries: formattedEntries,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      stats: {
        approved,
        pending,
        rejected,
        total: approved + pending + rejected
      },
      appliedFilters: {
        approved: approvedParam,
        rejected: rejectedParam,
        project: projectParam,
        minHours: minHoursParam,
        maxHours: maxHoursParam,
        unpaid: unpaidParam,
        sortBy,
        sortOrder
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar registros de horas:', error);
    return createCorsResponse({ error: 'Erro ao buscar registros de horas' }, 500);
  }
}

// Endpoint para criar novo registro de horas
export async function POST(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }
  
  try {
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
    
    // Verificar conflitos de horário
    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: auth.id,
        date: {
          equals: dateObj
        }
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
    
    // Criar novo registro
    const newEntry = await prisma.timeEntry.create({
      data: {
        date: dateObj,
        startTime: startTimeObj,
        endTime: endTimeObj,
        totalHours,
        observation,
        project,
        approved: null,
        rejected: null,
        user: {
          connect: { id: auth.id }
        }
      }
    });
    
    // Log de sucesso
    console.log('Mobile - Registro de horas criado:', { 
      userId: auth.id,
      entryId: newEntry.id,
      date: format(dateObj, 'yyyy-MM-dd'),
      hours: totalHours
    });
    
    // Retornar nova entrada
    return createCorsResponse({ 
      timeEntry: {
        ...newEntry,
        date: format(newEntry.date, 'yyyy-MM-dd'),
        startTime: format(newEntry.startTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endTime: format(newEntry.endTime, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        createdAt: format(newEntry.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        updatedAt: format(newEntry.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')
      }
    }, 201);
    
  } catch (error) {
    console.error('Erro ao criar registro de horas:', error);
    return createCorsResponse({ error: 'Erro ao criar registro de horas' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 