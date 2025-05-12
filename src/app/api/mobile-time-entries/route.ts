import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { TimeEntry } from '@prisma/client';

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
  const userIdParam = searchParams.get('userId');
  // Novo parâmetro para incluir registros próprios do manager
  const includeOwnEntriesParam = searchParams.get('includeOwnEntries');
  const includeOwnEntries = includeOwnEntriesParam === 'true';
  // Novo parâmetro para buscar todos os registros ou por período específico
  const periodParam = searchParams.get('period'); // ex: 'all' para buscar todos
  
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
    // Log das informações de autenticação para diagnóstico
    console.log('Mobile GET time-entries - Auth info:', {
      id: auth.id,
      email: auth.email,
      role: auth.role,
      companyId: auth.companyId
    });
    
    // Definir ordenação
    const orderBy: any = {};
    orderBy[sortBy === 'hours' ? 'totalHours' : sortBy] = sortOrder;
    
    // Normalizar as datas para evitar problemas com fusos horários
    // Precisamos garantir que as datas sejam interpretadas corretamente
    if (startDateParam) {
      // Criar data no formato YYYY-MM-DD sem componente de hora/timezone
      startDate = new Date(startDateParam + 'T00:00:00.000Z');
    }
    
    if (endDateParam) {
      // Criar data no formato YYYY-MM-DD com final do dia
      endDate = new Date(endDateParam + 'T23:59:59.999Z');
    }
    
    console.log('Mobile GET time-entries - Período normalizado:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      rawStartDate: startDateParam,
      rawEndDate: endDateParam
    });
    
    // Criar o filtro base com as datas
    const baseFilter: any = {};
    
    // Adicionar filtro de data apenas se periodParam não for 'all'
    if (periodParam !== 'all') {
      // Verificar se as datas são iguais para usar equals em vez de range
      const isSameDay = startDateParam && endDateParam && startDateParam === endDateParam;
      
      if (isSameDay) {
        // Se for o mesmo dia, usar uma estratégia diferente para garantir precisão
        // Extrair apenas a parte da data (YYYY-MM-DD)
        const dateOnly = startDateParam;
        console.log(`Mobile GET time-entries - Usando filtro de data única: ${dateOnly}`);
        
        // Usar estratégia que funcionará independente de como a data está armazenada
        baseFilter.date = {
          gte: new Date(`${dateOnly}T00:00:00.000Z`),
          lt: new Date(`${dateOnly}T23:59:59.999Z`)
        };
      } else {
        // Para intervalos de data, usar o range normal
        baseFilter.date = {
          gte: startDate,
          lte: endDate
        };
      }
      console.log('Mobile GET time-entries - Filtro base de data aplicado:', JSON.stringify(baseFilter.date));
    } else {
      console.log('Mobile GET time-entries - Buscando todos os registros (period=all)');
    }
    
    // Log do filtro base para depuração
    console.log('Mobile GET time-entries - Filtro base:', JSON.stringify(baseFilter));
    
    // Adicionar filtros por status se fornecidos
    if (approvedParam !== null && approvedParam !== undefined) {
      baseFilter.approved = approvedParam === 'true';
    }
    
    if (rejectedParam !== null && rejectedParam !== undefined) {
      baseFilter.rejected = rejectedParam === 'true';
    }
    
    // Adicionar filtros por projeto
    if (projectParam) {
      baseFilter.project = {
        contains: projectParam,
        mode: 'insensitive'
      };
    }
    
    // Adicionar filtros por horas
    if (minHoursParam) {
      baseFilter.totalHours = {
        ...(baseFilter.totalHours || {}),
        gte: parseFloat(minHoursParam)
      };
    }
    
    if (maxHoursParam) {
      baseFilter.totalHours = {
        ...(baseFilter.totalHours || {}),
        lte: parseFloat(maxHoursParam)
      };
    }
    
    // Filtro final para a consulta
    let where: any = {};
    
    // Aplicar filtros diferentes com base no papel do usuário
    if (auth.role === 'DEVELOPER') {
      // Desenvolvedor pode ver tudo, sem filtros adicionais
      where = baseFilter;
      
      // Se um usuário específico foi solicitado
      if (userIdParam) {
        where.userId = userIdParam;
      }
      
      console.log('Mobile - DEVELOPER: Sem filtros de empresa');
    } 
    else if (auth.role === 'ADMIN' || auth.role === 'MANAGER') {
      // Para admin/manager, buscar primeiro os IDs dos usuários da mesma empresa
      const usersInCompany = await prisma.user.findMany({
        where: {
          companyId: auth.companyId
        },
        select: {
          id: true
        }
      });
      
      const userIds = usersInCompany.map(user => user.id);
      console.log(`Mobile - ${auth.role}: Encontrados ${userIds.length} usuários na empresa ${auth.companyId}`);
      
      if (userIdParam) {
        // Se um usuário específico foi solicitado, verificar se pertence à empresa
        if (userIds.includes(userIdParam)) {
          where = {
            ...baseFilter,
            userId: userIdParam
          };
          console.log(`Mobile - ${auth.role}: Filtrando por usuário específico (${userIdParam}) da mesma empresa`);
        } else {
          // Usuário não pertence à empresa, retornar array vazio
          where = {
            id: 'não-existente' // Garante que nenhum registro será encontrado
          };
          console.log(`Mobile - ${auth.role}: Usuário solicitado (${userIdParam}) não pertence à empresa`);
        }
      } else {
        // Verificar se é um manager e se deseja incluir seus próprios registros
        if (auth.role === 'MANAGER' && includeOwnEntries) {
          // Se for ver apenas os seus próprios registros (Minhas Horas)
          if (includeOwnEntries && userIdParam === auth.id) {
            where = {
              ...baseFilter,
              userId: auth.id
            };
            console.log(`Mobile - MANAGER: Filtrando apenas pelos próprios registros do manager ${auth.id}`);
          } 
          // Se for ver todos os registros incluindo os seus próprios
          else {
            where = {
              ...baseFilter,
              userId: {
                in: userIds
              }
            };
            console.log(`Mobile - MANAGER: Filtrando por ${userIds.length} usuários da mesma empresa (incluindo o próprio manager)`);
          }
        } else {
          // Comportamento original - filtrar por todos os usuários da empresa para Admin
          // ou apenas subordinados para Manager (sem incluir os próprios registros)
          if (auth.role === 'MANAGER') {
            // Para manager, excluir seu próprio ID da lista de usuários
            const filteredUserIds = userIds.filter(id => id !== auth.id);
            where = {
              ...baseFilter,
              userId: {
                in: filteredUserIds
              }
            };
            console.log(`Mobile - MANAGER: Filtrando por ${filteredUserIds.length} usuários subordinados (excluindo o próprio manager)`);
          } else {
            // Para admin, incluir todos os usuários da empresa
            where = {
              ...baseFilter,
              userId: {
                in: userIds
              }
            };
            console.log(`Mobile - ADMIN: Filtrando por ${userIds.length} usuários da mesma empresa`);
          }
        }
      }
    } 
    else {
      // Para funcionários, filtrar apenas por seus próprios registros
      where = {
        ...baseFilter,
        userId: auth.id
      };
      
      console.log('Mobile - EMPLOYEE: Filtrando apenas pelos próprios registros');
    }
    
    // Processar filtro de registros não pagos
    if (unpaidParam === 'true') {
      try {
        // Determinar para qual(is) usuário(s) buscar registros pagos
        let targetUserIds: string[] = [];
        if (auth.role === 'EMPLOYEE') {
          targetUserIds = [auth.id];
        } else if (auth.role === 'ADMIN' || auth.role === 'MANAGER') {
          if (userIdParam) {
            // Verificar se o userIdParam pertence à empresa
            const targetUser = await prisma.user.findFirst({
              where: { id: userIdParam, companyId: auth.companyId },
              select: { id: true }
            });
            if (targetUser) {
              targetUserIds = [userIdParam];
            }
          } else {
            // Se nenhum usuário específico, buscar para todos da empresa
            const usersInCompany = await prisma.user.findMany({
              where: { companyId: auth.companyId },
              select: { id: true }
            });
            targetUserIds = usersInCompany.map(u => u.id);
          }
        } else if (auth.role === 'DEVELOPER') {
          if (userIdParam) {
            targetUserIds = [userIdParam];
          } else {
            // Desenvolvedor buscando não pagos sem especificar usuário - pode ser complexo,
            // por ora, vamos focar nos casos de uso principais. Poderia buscar todos.
            console.warn('Mobile - Filtro unpaid=true para Developer sem userId não é totalmente suportado ainda.');
          }
        }
        
        console.log(`Mobile - Verificando registros pagos para os usuários: ${targetUserIds.join(', ')}`);
        
        if (targetUserIds.length > 0) {
          // Buscar IDs de registros associados a pagamentos para os usuários alvo
          const paymentTimeEntries = await prisma.paymentTimeEntry.findMany({
            where: {
              timeEntry: {
                userId: { in: targetUserIds }
              }
            },
            select: {
              timeEntryId: true
            }
          });
          
          const excludeTimeEntryIds = paymentTimeEntries.map(pte => pte.timeEntryId);
          console.log(`Mobile - Excluindo ${excludeTimeEntryIds.length} registros já pagos.`);
          
          if (excludeTimeEntryIds.length > 0) {
            // Adicionar condição para excluir IDs já pagos
            where.id = {
              ...(where.id || {}), // Preservar outras condições de ID se houver
              notIn: excludeTimeEntryIds
            };
          }
        } else {
          console.log('Mobile - Nenhum usuário alvo para verificar pagamentos.');
        }
      } catch (paymentError) {
        console.error('Erro ao processar filtro de não pagos:', paymentError);
      }
    }
    
    // Parte alterada - após definir o filtro where, antes de fazer a consulta
    console.log('Mobile - Período solicitado:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // Log adicional
    if (auth.role === 'ADMIN' || auth.role === 'MANAGER') {
      console.log(`Mobile - ${auth.role} com ID=${auth.id} buscando registros no período ${startDate.toISOString()} a ${endDate.toISOString()}`);
    }
    
    // Log do filtro final para diagnóstico
    console.log('Mobile - Filtro final para time-entries:', JSON.stringify(where));
    
    // Realizar a consulta usando o método correto para relacionamentos aninhados
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hourlyRate: true,
            companyId: true
          }
        }
      }
    });
    
    // Log dos IDs e datas encontrados
    if (timeEntries.length > 0) {
      console.log('Mobile - Primeiros 5 registros encontrados:', timeEntries.slice(0, 5).map(entry => ({
        id: entry.id,
        date: entry.date.toISOString(),
        userId: entry.userId,
        approved: entry.approved,
        rejected: entry.rejected
      })));
    } else {
      console.log('Mobile - Nenhum registro encontrado com os filtros aplicados');
    }
    
    // Realizar contagens para estatísticas
    const [approved, pending, rejected] = await Promise.all([
      prisma.timeEntry.count({
        where: {
          ...where,
          approved: true,
          rejected: { not: true }
        }
      }),
      prisma.timeEntry.count({
        where: {
          ...where,
          approved: null,
          rejected: null
        }
      }),
      prisma.timeEntry.count({
        where: {
          ...where,
          rejected: true
        }
      })
    ]);
    
    // Contar total de registros para paginação
    const total = timeEntries.length; // Isso pode não ser o total real se a paginação for feita no DB
    const totalCountForPagination = await prisma.timeEntry.count({ where });

    // Adicionar informação se o registro foi pago
    const timeEntryIds = timeEntries.map(entry => entry.id);
    let paidTimeEntryIds = new Set<string>();

    if (timeEntryIds.length > 0) {
      const paymentTimeEntries = await prisma.paymentTimeEntry.findMany({
        where: {
          timeEntryId: { in: timeEntryIds }
        },
        select: {
          timeEntryId: true
        }
      });
      paidTimeEntryIds = new Set(paymentTimeEntries.map(pte => pte.timeEntryId));
    }

    // Transformar as datas em strings para evitar problemas de serialização
    const formattedEntries = timeEntries.map(entry => {
      // Preservar a data original para exibição, sem ajustes de fuso horário
      // A data deve ser exibida exatamente como foi inserida
      const originalDateStr = format(entry.date, 'yyyy-MM-dd');
      
      // Verificar se a data do registro está dentro do intervalo solicitado (log para debug)
      const isInRange = (startDateParam === null || originalDateStr >= startDateParam) && 
                       (endDateParam === null || originalDateStr <= endDateParam);
      
      if (!isInRange) {
        console.log(`Mobile - Alerta: Registro fora do intervalo solicitado:`, {
          registroId: entry.id,
          dataRegistro: originalDateStr,
          dataInicio: startDateParam,
          dataFim: endDateParam
        });
      }
      
      // Preservar a data original conforme armazenada, sem ajustes de fuso horário
      return {
        id: entry.id,
        date: originalDateStr,
        startTime: format(new Date(entry.startTime), 'yyyy-MM-dd\'T\'HH:mm:ss'),
        endTime: format(new Date(entry.endTime), 'yyyy-MM-dd\'T\'HH:mm:ss'),
        totalHours: entry.totalHours,
        observation: entry.observation,
        project: entry.project,
        approved: entry.approved,
        rejected: entry.rejected,
        rejectionReason: entry.rejectionReason,
        isPaid: paidTimeEntryIds.has(entry.id), // Adicionar o campo isPaid
        createdAt: format(entry.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        updatedAt: format(entry.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        user: entry.user ? {
          id: entry.user.id,
          name: entry.user.name,
          email: entry.user.email,
          hourlyRate: entry.user.hourlyRate,
          companyId: entry.user.companyId
        } : null
      };
    });
    
    // Log de sucesso
    console.log('Mobile - Registros de horas acessados:', { 
      userId: auth.id,
      role: auth.role,
      count: timeEntries.length,
      period: periodParam === 'all' ? null : `${format(startDate, 'yyyy-MM-dd')} até ${format(endDate, 'yyyy-MM-dd')}`
    });
    
    // Retornar dados com informações de paginação e estatísticas
    return createCorsResponse({ 
      timeEntries: formattedEntries,
      period: {
        startDate: periodParam === 'all' ? null : format(startDate, 'yyyy-MM-dd'),
        endDate: periodParam === 'all' ? null : format(endDate, 'yyyy-MM-dd')
      },
      pagination: {
        total: totalCountForPagination, // Usar a contagem total real para paginação
        page,
        limit,
        pages: Math.ceil(totalCountForPagination / limit) // Usar a contagem total real
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
        period: periodParam, // Adicionar o filtro de período aplicado
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
    
    // Data formatada sem componente de hora para comparação
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    console.log(`Mobile POST - Verificando conflitos para a data ${dateStr}`);
    
    // Verificar conflitos de horário com melhor filtragem
    const existingEntries = await prisma.timeEntry.findMany({
      where: {
        userId: auth.id,
        // Usar query mais precisa que garante a mesma data
        date: {
          // Intervalo apenas do dia especificado, ignorando hora/minuto/segundo
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: new Date(`${dateStr}T23:59:59.999Z`)
        }
      }
    });
    
    // Log adicional para diagnóstico de conflitos
    console.log('Mobile - Verificação de conflitos:', {
      userId: auth.id,
      dataAtual: dateStr,
      registrosEncontrados: existingEntries.length,
      dataObjOriginal: dateObj.toISOString(),
      primeirosRegistros: existingEntries.slice(0, 3).map(entry => ({
        id: entry.id,
        data: format(entry.date, 'yyyy-MM-dd'),
        horario: `${format(entry.startTime, 'HH:mm')}-${format(entry.endTime, 'HH:mm')}`
      }))
    });
    
    // Filtrar apenas entradas não rejeitadas da data correta
    const nonRejectedEntries = existingEntries.filter(entry => {
      // Verificar se a data é exatamente a mesma
      return format(entry.date, 'yyyy-MM-dd') === dateStr && entry.rejected !== true;
    });
    
    console.log('Mobile - Após filtragem para verificação de conflitos:', {
      totalOriginal: existingEntries.length,
      totalFiltrado: nonRejectedEntries.length,
      dataComparacao: dateStr
    });
    
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
        console.log('Mobile - Conflito detectado:', {
          novoRegistro: {
            data: format(dateObj, 'yyyy-MM-dd'),
            inicio: format(startTimeObj, 'HH:mm'),
            fim: format(endTimeObj, 'HH:mm')
          },
          registroExistente: {
            id: entry.id,
            data: format(entry.date, 'yyyy-MM-dd'),
            inicio: format(entry.startTime, 'HH:mm'),
            fim: format(entry.endTime, 'HH:mm')
          }
        });

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
    // Preservar a data exatamente como enviada pelo cliente sem conversão para UTC
    const dateOnly = dateObj.toISOString().split('T')[0]; // Extrai apenas a parte YYYY-MM-DD
    
    console.log('Mobile - Criando registro com as seguintes datas:', {
      dataOriginal: date,
      dateObj: dateObj.toISOString(),
      dateOnly,
      startTime: startTimeObj.toISOString(),
      endTime: endTimeObj.toISOString()
    });
    
    const newEntry = await prisma.timeEntry.create({
      data: {
        // Criar um novo objeto Date usando apenas a parte da data, para evitar problemas de fuso horário
        date: new Date(`${dateOnly}T12:00:00.000Z`), // Usar meio-dia UTC para evitar problemas de timezone
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
      date: format(newEntry.date, 'yyyy-MM-dd'),
      dateRaw: newEntry.date.toISOString(),
      hours: totalHours
    });
    
    // Retornar nova entrada com a data corretamente formatada
    return createCorsResponse({ 
      timeEntry: {
        ...newEntry,
        date: format(new Date(date), 'yyyy-MM-dd'), // Usar a data original enviada pelo cliente
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