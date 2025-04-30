import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format } from 'date-fns';

// PUT - Confirmar recebimento de pagamento (Funcionário)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, response } = await verifyMobileAuth(req);

  if (!auth || response) {
    return response;
  }

  const paymentId = params.id;

  if (!paymentId) {
    return createCorsResponse({ error: 'ID do pagamento não fornecido.' }, 400);
  }

  try {
    // Encontrar o pagamento
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, name: true } }, // Incluir usuário para verificar permissão
        creator: { select: { id: true, name: true } } // Incluir criador para notificação
      }
    });

    if (!payment) {
      return createCorsResponse({ error: 'Pagamento não encontrado.' }, 404);
    }

    // Verificar permissão: Apenas o usuário que recebeu o pagamento pode confirmar
    if (payment.userId !== auth.id) {
      return createCorsResponse({ error: 'Você não tem permissão para confirmar este pagamento.' }, 403);
    }

    // Verificar status: Só pode confirmar se estiver pendente ou aguardando confirmação
    if (payment.status !== 'pending' && payment.status !== 'awaiting_confirmation') {
      return createCorsResponse({ error: `Não é possível confirmar um pagamento com status "${payment.status}".` }, 400);
    }

    // Atualizar o pagamento
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        confirmedAt: new Date() // Registrar data/hora da confirmação
      },
      include: { // Incluir dados para retornar resposta completa
        user: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        timeEntries: { include: { timeEntry: { select: { id: true, date: true, totalHours: true } } } }
      }
    });
    
    // Enviar notificação para o criador (Admin/Manager)
    if (updatedPayment.creatorId) {
      try {
        await prisma.notification.create({
          data: {
            title: 'Pagamento Confirmado',
            message: `O funcionário ${updatedPayment.user.name} confirmou o recebimento do pagamento de R$ ${updatedPayment.amount.toFixed(2)} (Ref: ${updatedPayment.reference || paymentId}).`,
            type: 'success',
            userId: updatedPayment.creatorId, // Notificar o criador
            relatedId: updatedPayment.id,
            relatedType: 'payment',
          }
        });
      } catch (notificationError) {
        console.error(`Erro ao criar notificação de confirmação para ${updatedPayment.creatorId}:`, notificationError);
        // Não bloquear a resposta principal por causa da notificação
      }
    }
    
    // Formatar resposta
    const formattedPayment = {
        id: updatedPayment.id,
        amount: updatedPayment.amount,
        date: format(updatedPayment.date, 'yyyy-MM-dd'),
        description: updatedPayment.description,
        reference: updatedPayment.reference,
        paymentMethod: updatedPayment.paymentMethod,
        status: updatedPayment.status,
        confirmedAt: updatedPayment.confirmedAt ? format(updatedPayment.confirmedAt, 'yyyy-MM-dd\'T\'HH:mm:ss') : null,
        periodStart: format(updatedPayment.periodStart, 'yyyy-MM-dd'),
        periodEnd: format(updatedPayment.periodEnd, 'yyyy-MM-dd'),
        user: updatedPayment.user,
        creator: updatedPayment.creator,
        timeEntries: updatedPayment.timeEntries.map(pte => ({
          id: pte.timeEntry.id,
          date: format(pte.timeEntry.date, 'yyyy-MM-dd'),
          totalHours: pte.timeEntry.totalHours,
          amount: pte.amount
        }))
      };

    console.log(`Mobile - Pagamento ${paymentId} confirmado por ${auth.id}`);
    return createCorsResponse({ payment: formattedPayment });

  } catch (error) {
    console.error(`Erro ao confirmar pagamento ${paymentId}:`, error);
    return createCorsResponse({ error: 'Erro interno ao confirmar pagamento' }, 500);
  }
}

// OPTIONS - Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 