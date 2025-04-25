// @ts-nocheck
// Desativando checagem de tipos do TypeScript temporariamente até resolver questões de tipagem do Prisma
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
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

// Definir interfaces para os tipos do Prisma que não estão sendo reconhecidos
interface Payment {
  id: string;
  amount: number;
  date: Date;
  description?: string | null;
  reference?: string | null;
  paymentMethod: string;
  status: string;
  userId: string;
  creatorId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
  receiptUrl?: string | null;
  confirmedAt?: Date | null;
}

interface TimeEntry {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  totalHours: number;
  observation?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  approved?: boolean | null;
  project?: string | null;
  rejected?: boolean | null;
  rejectionReason?: string | null;
}

interface PaymentTimeEntry {
  id: string;
  paymentId: string;
  timeEntryId: string;
  amount: number;
  timeEntry: TimeEntry;
}

// Tipo para os objetos do prisma com relações
type PaymentWithRelations = Payment & {
  user: {
    id: string;
    name: string;
    email: string;
    hourlyRate: number | null;
    companyId: string | null;
    company?: {
      id: string;
      name: string;
    } | null;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
  timeEntries: PaymentTimeEntry[];
};

// Tipo de status de pagamento
type PaymentStatus = 'pending' | 'awaiting_confirmation' | 'completed' | 'cancelled';

// Schema para validação de pagamentos
const paymentSchema = z.object({
  amount: z.number().positive('O valor deve ser positivo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  description: z.string().optional(),
  reference: z.string().optional(),
  paymentMethod: z.string(),
  status: z.enum(['pending', 'awaiting_confirmation', 'completed', 'cancelled']).default('pending'),
  userId: z.string().uuid('ID do usuário inválido'),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de fim deve estar no formato YYYY-MM-DD'),
  timeEntryIds: z.array(z.string().uuid('ID de registro inválido')),
});

// GET - Listar pagamentos
export async function GET(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { message: 'Você precisa estar autenticado para visualizar pagamentos.' },
        { status: 401 }
      );
    }
    
    // Adicionar log para depuração
    serverLog("Sessão do usuário:", JSON.stringify(session, null, 2));
    
    // Obter usuário atual
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });
    
    // Adicionar log para depuração do usuário atual
    serverLog("Usuário atual:", currentUser);
    
    if (!currentUser) {
      return NextResponse.json(
        { message: 'Usuário não encontrado.' },
        { status: 404 }
      );
    }
    
    // Extrair parâmetros de busca
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status') as PaymentStatus | null;
    const search = searchParams.get('search');
    
    // Verificar permissões
    const isDeveloper = currentUser.role === "DEVELOPER";
    const isAdmin = currentUser.role === "ADMIN";
    const isManager = currentUser.role === "MANAGER";
    const isEmployee = currentUser.role === "EMPLOYEE";

    // Construir o filtro where baseado nas permissões e parâmetros
    const where: any = {};

    // Adicionar filtro por status, se fornecido
    if (status) {
      where.status = status;
    }

    // Filtros baseados em permissões
    if (isEmployee) {
      // Funcionário só pode ver seus próprios pagamentos
      where.userId = currentUser.id;
    } else if (isManager) {
      if (!currentUser.companyId) {
        return NextResponse.json(
          { message: "Gerente não está associado a nenhuma empresa" },
          { status: 403 }
        );
      }

      // Gerente só pode ver pagamentos de usuários da sua empresa
      where.user = {
        companyId: currentUser.companyId
      };

      // Se um userId específico foi fornecido, verificar se o usuário pertence à mesma empresa
      if (userId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { companyId: true }
        });

        if (!targetUser) {
          return NextResponse.json(
            { message: "Usuário não encontrado" },
            { status: 404 }
          );
        }

        if (targetUser.companyId !== currentUser.companyId) {
          return NextResponse.json(
            { message: "Você só pode visualizar pagamentos de usuários da sua empresa" },
            { status: 403 }
          );
        }

        where.userId = userId;
      }
    } else if (isAdmin) {
      if (!currentUser.companyId) {
        return NextResponse.json(
          { message: "Administrador não está associado a nenhuma empresa" },
          { status: 403 }
        );
      }

      // Admin só pode ver pagamentos de usuários da sua empresa
      where.user = {
        companyId: currentUser.companyId
      };

      // Se um userId específico foi fornecido, verificar se o usuário pertence à mesma empresa
      if (userId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { companyId: true }
        });

        if (!targetUser) {
          return NextResponse.json(
            { message: "Usuário não encontrado" },
            { status: 404 }
          );
        }

        if (targetUser.companyId !== currentUser.companyId) {
          return NextResponse.json(
            { message: "Você só pode visualizar pagamentos de usuários da sua empresa" },
            { status: 403 }
          );
        }

        where.userId = userId;
      }
    } else if (isDeveloper) {
      // Developer pode ver tudo, ou filtrar por companyId/userId se especificado
      if (companyId) {
        where.user = {
          companyId: companyId
        };
      }

      if (userId) {
        where.userId = userId;
      }
    }

    // Adicionar pesquisa por termo, se fornecido
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Filtros comuns para todos os tipos de usuário
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (startDate) {
      where.createdAt = {
        ...(where.createdAt as any || {}),
        gte: new Date(startDate)
      };
    }

    if (endDate) {
      where.createdAt = {
        ...(where.createdAt as any || {}),
        lte: new Date(endDate)
      };
    }

    try {
      // Buscar pagamentos com base nos filtros
      const payments = await prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              hourlyRate: true,
              companyId: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Formatar os pagamentos para o cliente
      const formattedPayments = payments.map((payment) => {
        try {
          const totalHours = payment.timeEntries.reduce((sum, entry) => {
            return sum + entry.timeEntry.totalHours;
          }, 0);
          
          return {
            id: payment.id,
            amount: payment.amount,
            date: payment.date.toISOString().split('T')[0],
            description: payment.description,
            reference: payment.reference,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            userId: payment.userId,
            userName: payment.user?.name || 'Usuário desconhecido',
            userEmail: payment.user?.email || 'Email não disponível',
            hourlyRate: payment.user?.hourlyRate || 0,
            companyId: payment.user?.companyId || null,
            companyName: payment.user?.company?.name || 'Empresa não especificada',
            creatorId: payment.creatorId,
            createdByName: payment.creator?.name || 'Usuário não informado',
            periodStart: payment.periodStart.toISOString().split('T')[0],
            periodEnd: payment.periodEnd.toISOString().split('T')[0],
            totalHours: totalHours,
            timeEntries: payment.timeEntries.map((entry) => ({
              id: entry.timeEntry.id,
              date: entry.timeEntry.date.toISOString().split('T')[0],
              totalHours: entry.timeEntry.totalHours,
              amount: entry.amount,
            })),
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
          };
        } catch (entryError) {
          serverError('Erro ao processar entrada de pagamento:', entryError, payment);
          // Retorna um objeto básico se houver erro no processamento
          return {
            id: payment.id,
            amount: payment.amount,
            date: payment.date.toISOString().split('T')[0],
            status: payment.status,
            userId: payment.userId,
            creatorId: payment.creatorId,
            periodStart: payment.periodStart.toISOString().split('T')[0],
            periodEnd: payment.periodEnd.toISOString().split('T')[0],
            timeEntries: [],
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            error: 'Erro ao processar detalhes do pagamento'
          };
        }
      });
      
      return NextResponse.json(formattedPayments);
    } catch (dbError) {
      serverError('Erro na consulta ao banco de dados:', dbError);
      return NextResponse.json(
        { message: 'Erro na consulta ao banco de dados', error: dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    serverError('Erro ao listar pagamentos:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Criar um novo pagamento
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Você precisa estar autenticado para criar pagamentos.' },
        { status: 401 }
      );
    }

    serverLog("Session POST:", JSON.stringify(session, null, 2));

    // Obter usuário atual
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { message: 'Usuário não encontrado.' },
        { status: 404 }
      );
    }

    // Verificar permissões
    const isDeveloper = currentUser.role === 'DEVELOPER';
    const isAdmin = currentUser.role === 'ADMIN';
    const isManager = currentUser.role === 'MANAGER';

    if (!isAdmin && !isDeveloper && !isManager) {
      return NextResponse.json(
        { message: 'Você não tem permissão para criar pagamentos.' },
        { status: 403 }
      );
    }

    // Verificar se o usuário está associado a uma empresa (exceto para DEVELOPER)
    if (!isDeveloper && !currentUser.companyId) {
      return NextResponse.json(
        { message: 'Usuário não está associado a nenhuma empresa.' },
        { status: 403 }
      );
    }

    // Obter dados do request
    const data = await req.json();

    // Validar dados
    const validationResult = paymentSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          message: 'Dados de pagamento inválidos.', 
          errors: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const paymentData = validationResult.data;

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: paymentData.userId },
      select: {
        id: true,
        name: true,
        email: true,
        companyId: true,
        hourlyRate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado.' },
        { status: 404 }
      );
    }

    // Verificar se o usuário pertence à mesma empresa que o admin/manager
    if (!isDeveloper && user.companyId !== currentUser.companyId) {
      return NextResponse.json(
        { message: 'Você só pode criar pagamentos para usuários da sua empresa.' },
        { status: 403 }
      );
    }

    // Verificar se todas as entradas de tempo existem e pertencem ao usuário
    if (paymentData.timeEntryIds && paymentData.timeEntryIds.length > 0) {
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          id: {
            in: paymentData.timeEntryIds
          }
        }
      });

      // Verificar se todas as entradas de tempo foram encontradas
      if (timeEntries.length !== paymentData.timeEntryIds.length) {
        return NextResponse.json(
          { message: 'Uma ou mais entradas de tempo não foram encontradas.' },
          { status: 404 }
        );
      }

      // Verificar se todas as entradas de tempo pertencem ao usuário
      const allBelongToUser = timeEntries.every(entry => entry.userId === paymentData.userId);
      if (!allBelongToUser) {
        return NextResponse.json(
          { message: 'Uma ou mais entradas de tempo não pertencem ao usuário selecionado.' },
          { status: 400 }
        );
      }
    }

    // Buscar os registros de horas selecionados
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        id: { in: paymentData.timeEntryIds },
        userId: paymentData.userId,
        approved: true // Apenas registros aprovados podem ser pagos
      }
    });
    
    if (timeEntries.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum registro de horas válido encontrado para pagamento.' },
        { status: 400 }
      );
    }

    // Verificar se algum dos registros já foi pago
    const alreadyPaid = await prisma.paymentTimeEntry.findMany({
      where: {
        timeEntryId: { in: paymentData.timeEntryIds }
      }
    });
    
    if (alreadyPaid.length > 0) {
      const paidEntryIds = alreadyPaid.map((value: { timeEntryId: string }) => value.timeEntryId);
      
      return NextResponse.json({
        error: `Os seguintes registros de horas já estão associados a outros pagamentos: ${paidEntryIds.join(', ')}`,
      }, { status: 400 });
    }

    // Calcular valor por registro (proporcional às horas)
    const totalHours = timeEntries.reduce((sum: number, entry: TimeEntry) => {
      return sum + entry.totalHours;
    }, 0);
    const hourlyRate = user.hourlyRate || 0;
    
    // Se o valor total não foi explicitamente fornecido, calcular com base na taxa horária
    const totalAmount = paymentData.amount || (totalHours * hourlyRate);
    
    // Criar o pagamento com os registros de horas
    // @ts-ignore -- Ignorando erros de tipo devido a discrepâncias entre o schema e os tipos gerados
    const payment = await prisma.payment.create({
      data: {
        amount: totalAmount,
        date: new Date(paymentData.date),
        description: paymentData.description,
        reference: paymentData.reference,
        paymentMethod: paymentData.paymentMethod,
        status: paymentData.status,
        userId: paymentData.userId,
        creatorId: currentUser.id,
        periodStart: new Date(`${paymentData.periodStart}T00:00:00`),
        periodEnd: new Date(`${paymentData.periodEnd}T23:59:59`),
        timeEntries: {
          create: timeEntries.map((timeEntry: TimeEntry) => ({
            timeEntryId: timeEntry.id,
            amount: totalHours > 0 ? (timeEntry.totalHours / totalHours) * totalAmount : 0
          }))
        }
      },
      include: {
        user: true,
        creator: true,
        timeEntries: {
          include: {
            timeEntry: true
          }
        }
      }
    });

    // Enviar notificação para o funcionário sobre o pagamento
    try {
      await prisma.notification.create({
        data: {
          title: 'Novo pagamento registrado',
          message: `Um pagamento de $ ${totalAmount.toFixed(2)} foi registrado para o período de ${paymentData.periodStart} a ${paymentData.periodEnd}.`,
          type: 'success',
          userId: paymentData.userId,
          relatedId: payment.id,
          relatedType: 'payment',
        }
      });
    } catch (notificationError) {
      serverError('Erro ao criar notificação de pagamento:', notificationError);
      // Não impede o fluxo principal
    }

    // Formatar resposta
    const formattedPayment = {
      id: payment.id,
      amount: payment.amount,
      date: payment.date,
      description: payment.description,
      reference: payment.reference,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      userId: payment.userId,
      userName: payment.user?.name || 'Usuário não identificado',
      userEmail: payment.user?.email || 'Email não disponível',
      hourlyRate: payment.user?.hourlyRate || 0,
      periodStart: payment.periodStart.toISOString().split('T')[0],
      periodEnd: payment.periodEnd.toISOString().split('T')[0],
      totalHours,
      timeEntries: payment.timeEntries?.map((entry) => ({
        id: entry.timeEntry.id,
        date: entry.timeEntry.date.toISOString().split('T')[0],
        totalHours: entry.timeEntry.totalHours,
        amount: entry.amount,
      })) || [],
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
    
    return NextResponse.json(formattedPayment, { status: 201 });
  } catch (error: any) {
    serverError('Erro ao criar pagamento:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
} 