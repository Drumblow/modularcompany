import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
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
  reference?: string | null;
  paymentMethod: string;
  status: string;
  timeEntries: PaymentTimeEntry[];
}

interface TimeEntry {
  id: string;
  date: Date;
  totalHours: number;
}

interface PaymentTimeEntry {
  id: string;
  paymentId: string;
  timeEntryId: string;
  amount: number;
  timeEntry: TimeEntry;
}

// GET - Calcular saldo devedor de um funcionário
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter o ID do usuário
    const { id } = params;
    
    // Verificar permissões
    const userRole = session.user.role;
    
    // Funcionários só podem ver seu próprio saldo
    if (userRole === 'EMPLOYEE' && id !== session.user.id) {
      return NextResponse.json(
        { message: 'Permissão negada. Você só pode visualizar seu próprio saldo.' },
        { status: 403 }
      );
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        hourlyRate: true,
        companyId: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Gerentes e admins só podem ver saldos de funcionários da mesma empresa
    if (['MANAGER', 'ADMIN'].includes(userRole) && 
        session.user.companyId !== user.companyId) {
      return NextResponse.json(
        { message: 'Permissão negada. Você só pode visualizar saldos de funcionários da sua empresa.' },
        { status: 403 }
      );
    }

    // Obter parâmetros de data da URL
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Construir filtro de data
    const dateFilter: any = {};
    
    if (startDate) {
      dateFilter.gte = new Date(`${startDate}T00:00:00`);
    }
    
    if (endDate) {
      dateFilter.lte = new Date(`${endDate}T23:59:59`);
    }

    // Buscar registros de horas aprovados do usuário
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: id,
        approved: true,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      }
    });

    // Buscar pagamentos para o usuário
    const payments = await (prisma as any).payment.findMany({
      where: {
        userId: id,
        status: 'completed',
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: {
        timeEntries: {
          include: {
            timeEntry: true
          }
        }
      }
    });

    // Calcular total de horas aprovadas
    const totalApprovedHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    
    // Calcular valor total devido (com base na taxa horária)
    const hourlyRate = user.hourlyRate || 0;
    const totalAmountDue = totalApprovedHours * hourlyRate;
    
    // Calcular total já pago
    const totalPaid = payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
    
    // Calcular horas já pagas
    const paidTimeEntryIds = new Set<string>();
    payments.forEach((payment: Payment) => {
      payment.timeEntries.forEach((entry: PaymentTimeEntry) => {
        paidTimeEntryIds.add(entry.timeEntryId);
      });
    });
    
    const paidTimeEntries = timeEntries.filter(entry => paidTimeEntryIds.has(entry.id));
    const paidHours = paidTimeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    
    // Calcular horas não pagas
    const unpaidTimeEntries = timeEntries.filter(entry => !paidTimeEntryIds.has(entry.id));
    const unpaidHours = unpaidTimeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    
    // Calcular saldo devedor
    const balance = totalAmountDue - totalPaid;

    // Formatar resposta
    const response = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      hourlyRate,
      totalApprovedHours,
      totalAmountDue,
      totalPaid,
      balance,
      paidHours,
      unpaidHours,
      currency: 'BRL',
      
      // Detalhes do período, se aplicável
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      
      // Detalhes dos pagamentos
      payments: payments.map((payment: Payment) => ({
        id: payment.id,
        date: payment.date.toISOString().split('T')[0],
        amount: payment.amount,
        reference: payment.reference,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
      })),
      
      // Detalhes dos registros não pagos
      unpaidTimeEntries: unpaidTimeEntries.map(entry => ({
        id: entry.id,
        date: entry.date.toISOString().split('T')[0],
        totalHours: entry.totalHours,
        estimatedAmount: entry.totalHours * hourlyRate,
      }))
    };

    return NextResponse.json(response);
  } catch (error: any) {
    serverError('Erro ao calcular saldo do usuário:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
} 