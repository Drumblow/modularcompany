import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format, parseISO } from 'date-fns';

// GET - Listar pagamentos da empresa para Admins/Managers
export async function GET(req: NextRequest) {
  const { auth, response } = await verifyMobileAuth(req);

  if (!auth || response) {
    return response;
  }

  // Verificar permissões
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins e Managers podem listar pagamentos da empresa.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário não está associado a uma empresa.' }, 400);
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status'); // Pode ser um ou mais status separados por vírgula (ex: "pending,awaiting_confirmation")
    const userIdParam = searchParams.get('userId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'date'; // date, amount, status
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc, desc
    
    const skip = (page - 1) * limit;

    // Construir filtro base
    const where: any = {
        // Filtrar por pagamentos onde o USUÁRIO (destinatário) pertence à empresa do Admin/Manager
        user: {
            companyId: auth.companyId
        }
    };
    
    // Adicionar filtro de status
    if (statusParam) {
        const statuses = statusParam.split(',').map(s => s.trim()).filter(s => s);
        if (statuses.length > 0) {
            where.status = { in: statuses };
        }
    }
    
    // Adicionar filtro de usuário específico (destinatário)
    if (userIdParam) {
        where.userId = userIdParam;
    }
    
    // Adicionar filtro de datas (data do pagamento) apenas se fornecidas
    if (startDateParam || endDateParam) {
        where.date = {};
        if (startDateParam) {
            where.date.gte = new Date(`${startDateParam}T00:00:00.000Z`);
        }
        if (endDateParam) {
            where.date.lte = new Date(`${endDateParam}T23:59:59.999Z`);
        }
    }
    
    // Definir ordenação
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;
    
    // Buscar pagamentos
    const [payments, totalCount] = await prisma.$transaction([
        prisma.payment.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } }, // Destinatário
                creator: { select: { id: true, name: true } } // Quem criou
            },
            orderBy,
            skip,
            take: limit,
        }),
        prisma.payment.count({ where })
    ]);
    
    // Formatar resposta
    const formattedPayments = payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        date: format(payment.date, 'yyyy-MM-dd'),
        description: payment.description,
        reference: payment.reference,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        confirmedAt: payment.confirmedAt ? format(payment.confirmedAt, 'yyyy-MM-dd\'T\'HH:mm:ss') : null,
        periodStart: format(payment.periodStart, 'yyyy-MM-dd'),
        periodEnd: format(payment.periodEnd, 'yyyy-MM-dd'),
        user: payment.user, // Informações do destinatário
        creator: payment.creator // Informações de quem criou
    }));

    console.log(`Mobile - ${auth.role} ${auth.id} listou ${payments.length}/${totalCount} pagamentos da empresa ${auth.companyId} com filtro:`, { status: statusParam, userId: userIdParam });

    return createCorsResponse({
      payments: formattedPayments,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
      appliedFilters: {
        status: statusParam,
        userId: userIdParam,
        startDate: startDateParam,
        endDate: endDateParam,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Erro ao listar pagamentos para admin/manager:', error);
    return createCorsResponse({ error: 'Erro ao buscar pagamentos da empresa' }, 500);
  }
}

// OPTIONS - Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 