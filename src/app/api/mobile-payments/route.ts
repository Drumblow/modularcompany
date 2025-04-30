import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { z } from 'zod';
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
  let startDateParam = searchParams.get('startDate');
  let endDateParam = searchParams.get('endDate');
  let status = searchParams.get('status');
  
  // Se não fornecidos, usar o mês atual
  const today = new Date();
  const defaultStartDate = startOfMonth(today);
  const defaultEndDate = endOfMonth(today);
  
  // Analisar datas fornecidas ou usar padrões
  let startDate = startDateParam ? parseISO(startDateParam) : defaultStartDate;
  let endDate = endDateParam ? parseISO(endDateParam) : defaultEndDate;
  
  try {
    // Construir filtro de consulta
    const where: any = {
      userId: auth.id,
      date: {
        gte: startDate,
        lte: endDate
      }
    };
    
    // Filtrar por status se fornecido
    if (status) {
      where.status = status;
    }
    
    // Buscar pagamentos do usuário
    const payments = await prisma.payment.findMany({
      where,
      include: {
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
        date: 'desc'
      }
    });
    
    // Transformar as datas em strings para evitar problemas de serialização
    const formattedPayments = payments.map(payment => {
      // Calcular total de horas dos registros associados
      const totalHours = payment.timeEntries.reduce((sum, entry) => {
        return sum + entry.timeEntry.totalHours;
      }, 0);
      
      return {
        id: payment.id,
        amount: payment.amount,
        date: format(payment.date, 'yyyy-MM-dd'),
        description: payment.description,
        reference: payment.reference,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        periodStart: format(payment.periodStart, 'yyyy-MM-dd'),
        periodEnd: format(payment.periodEnd, 'yyyy-MM-dd'),
        totalHours: totalHours,
        createdBy: {
          id: payment.creator?.id || null,
          name: payment.creator?.name || 'Usuário não informado'
        },
        timeEntries: payment.timeEntries.map(entry => ({
          id: entry.timeEntry.id,
          date: format(entry.timeEntry.date, 'yyyy-MM-dd'),
          totalHours: entry.timeEntry.totalHours,
          observation: entry.timeEntry.observation,
          project: entry.timeEntry.project,
          amount: entry.amount
        })),
        createdAt: format(payment.createdAt, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        updatedAt: format(payment.updatedAt, 'yyyy-MM-dd\'T\'HH:mm:ss')
      };
    });
    
    // Log de sucesso
    console.log('Mobile - Pagamentos acessados:', { 
      userId: auth.id,
      count: payments.length,
      period: `${format(startDate, 'yyyy-MM-dd')} até ${format(endDate, 'yyyy-MM-dd')}`
    });
    
    // Retornar dados
    return createCorsResponse({ 
      payments: formattedPayments,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return createCorsResponse({ error: 'Erro ao buscar pagamentos' }, 500);
  }
}

// Schema para validação de criação de pagamentos via mobile
const mobilePaymentSchema = z.object({
  amount: z.number().positive('O valor deve ser positivo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  description: z.string().optional(),
  reference: z.string().optional(),
  paymentMethod: z.string(),
  status: z.enum(['pending', 'awaiting_confirmation', 'completed', 'cancelled']).default('pending'),
  userId: z.string().uuid('ID do usuário inválido'),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de fim deve estar no formato YYYY-MM-DD'),
  timeEntryIds: z.array(z.string().uuid('ID de registro inválido')).min(1, 'Pelo menos um registro de horas deve ser selecionado'),
});

// POST - Criar um novo pagamento (Admin/Manager)
export async function POST(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  if (!auth || response) {
    return response;
  }
  
  // Verificar permissões
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins e Managers podem criar pagamentos.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário criador não está associado a uma empresa.' }, 400);
  }
  
  try {
    const body = await req.json();
    
    // Validar dados
    const validationResult = mobilePaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return createCorsResponse({
        error: 'Dados de pagamento inválidos.',
        details: validationResult.error.format()
      }, 400);
    }
    
    const paymentData = validationResult.data;
    
    // Verificar se o usuário alvo existe e pertence à mesma empresa
    const targetUser = await prisma.user.findFirst({
      where: {
        id: paymentData.userId,
        companyId: auth.companyId
      },
      select: { id: true, name: true, hourlyRate: true }
    });
    
    if (!targetUser) {
      return createCorsResponse({ error: 'Usuário alvo não encontrado ou não pertence à sua empresa.' }, 404);
    }
    
    // Buscar os registros de horas selecionados
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        id: { in: paymentData.timeEntryIds },
        userId: paymentData.userId,
        approved: true // Apenas registros aprovados
      }
    });
    
    // Verificar se todos os IDs correspondem a registros encontrados e aprovados
    if (timeEntries.length !== paymentData.timeEntryIds.length) {
      const foundIds = timeEntries.map(te => te.id);
      const missingIds = paymentData.timeEntryIds.filter(id => !foundIds.includes(id));
      return createCorsResponse({
        error: 'Alguns registros de horas não foram encontrados, não pertencem ao usuário ou não estão aprovados.',
        missingOrInvalidIds: missingIds
      }, 400);
    }
    
    // Verificar se algum dos registros já foi pago
    const alreadyPaid = await prisma.paymentTimeEntry.findMany({
      where: {
        timeEntryId: { in: paymentData.timeEntryIds }
      },
      select: { timeEntryId: true }
    });
    
    if (alreadyPaid.length > 0) {
      const paidEntryIds = alreadyPaid.map(pte => pte.timeEntryId);
      return createCorsResponse({
        error: `Os seguintes registros de horas já estão associados a outros pagamentos: ${paidEntryIds.join(', ')}`,
      }, 409);
    }
    
    // Calcular valor total e por entrada (se necessário)
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    const totalAmount = paymentData.amount; // Usar o valor fornecido

    // Criar o pagamento dentro de uma transação
    const newPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          amount: totalAmount,
          date: new Date(`${paymentData.date}T12:00:00.000Z`), // Usar meio-dia UTC
          description: paymentData.description,
          reference: paymentData.reference,
          paymentMethod: paymentData.paymentMethod,
          status: paymentData.status,
          userId: paymentData.userId,
          creatorId: auth.id, // ID do Admin/Manager que criou
          periodStart: new Date(`${paymentData.periodStart}T00:00:00.000Z`),
          periodEnd: new Date(`${paymentData.periodEnd}T23:59:59.999Z`),
        },
      });
      
      // Criar as associações PaymentTimeEntry
      await tx.paymentTimeEntry.createMany({
        data: timeEntries.map((timeEntry) => ({
          paymentId: payment.id,
          timeEntryId: timeEntry.id,
          // Calcular valor proporcional baseado nas horas, se possível
          amount: totalHours > 0 ? (timeEntry.totalHours / totalHours) * totalAmount : 0
        }))
      });
      
      return payment; // Retornar o pagamento criado
    });
    
    // Enviar notificação para o funcionário
    try {
      await prisma.notification.create({
        data: {
          title: 'Novo pagamento registrado',
          message: `Um pagamento de R$ ${totalAmount.toFixed(2)} foi registrado para você por ${auth.name || 'Admin/Manager'}.`,
          type: 'success',
          userId: paymentData.userId,
          relatedId: newPayment.id,
          relatedType: 'payment',
        }
      });
    } catch (notificationError) {
      console.error('Erro ao criar notificação de pagamento mobile:', notificationError);
    }
    
    // Buscar o pagamento completo para retornar
    const completePayment = await prisma.payment.findUnique({
      where: { id: newPayment.id },
      include: {
        user: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        timeEntries: { include: { timeEntry: true } }
      }
    });
    
    // Verificar se o pagamento foi encontrado (embora improvável após criação)
    if (!completePayment) {
      console.error('Mobile - Falha ao buscar pagamento recém-criado:', newPayment.id);
      return createCorsResponse({ error: 'Falha ao recuperar detalhes do pagamento criado.' }, 500);
    }

    // Log de sucesso
    console.log('Mobile - Pagamento criado:', { 
      paymentId: newPayment.id,
      creatorId: auth.id,
      userId: paymentData.userId,
      amount: totalAmount,
      entriesIncluded: timeEntries.length
    });
    
    // Retornar o pagamento criado e formatado
    const formattedPayment = {
      id: completePayment.id,
      amount: completePayment.amount,
      date: format(completePayment.date, 'yyyy-MM-dd'),
      description: completePayment.description,
      reference: completePayment.reference,
      paymentMethod: completePayment.paymentMethod,
      status: completePayment.status,
      periodStart: format(completePayment.periodStart, 'yyyy-MM-dd'),
      periodEnd: format(completePayment.periodEnd, 'yyyy-MM-dd'),
      user: completePayment.user,
      creator: completePayment.creator,
      timeEntries: completePayment.timeEntries.map(pte => ({
        id: pte.timeEntry.id,
        date: format(pte.timeEntry.date, 'yyyy-MM-dd'),
        totalHours: pte.timeEntry.totalHours,
        amount: pte.amount
      }))
    };

    return createCorsResponse({ payment: formattedPayment }, 201);

  } catch (error) {
    console.error('Erro ao criar pagamento mobile:', error);
    // Tratar erros específicos do Prisma (ex: unique constraint)
    const typedError = error as any; // Tipar para acessar 'code'
    if (typedError?.code === 'P2002') { // Verificar se code existe
       return createCorsResponse({ error: 'Erro: Um dos registros de horas já está em outro pagamento.' }, 409);
    }
    return createCorsResponse({ error: 'Erro interno ao criar pagamento' }, 500);
  }
}

// OPTIONS Handler (atualizado para incluir POST)
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 