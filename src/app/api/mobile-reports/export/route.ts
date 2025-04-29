import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

// POST - Gerar relatório detalhado para exportação
export async function POST(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }
  
  try {
    // Obter dados do corpo da requisição para filtrar o relatório
    const body = await req.json();
    const { 
      startDate: startDateString, 
      endDate: endDateString,
      includeRejected = false,
      format: reportFormat = 'summary' // 'summary' ou 'detailed'
    } = body;
    
    // Definir período do relatório
    const today = new Date();
    const defaultStartDate = startOfMonth(today);
    const defaultEndDate = endOfMonth(today);
    
    const startDate = startDateString ? parseISO(startDateString) : defaultStartDate;
    const endDate = endDateString ? parseISO(endDateString) : defaultEndDate;
    
    // Buscar usuário para obter taxa horária
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        email: true,
        hourlyRate: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado' }, 404);
    }
    
    // Construir filtro para time entries
    const timeEntryFilter: any = {
      userId: auth.id,
      date: {
        gte: startDate,
        lte: endDate
      }
    };
    
    // Incluir apenas aprovados, ou aprovados e rejeitados
    if (!includeRejected) {
      timeEntryFilter.approved = true;
    }
    
    // Buscar registros de horas filtrados
    const timeEntries = await prisma.timeEntry.findMany({
      where: timeEntryFilter,
      orderBy: {
        date: 'asc'
      }
    });
    
    // Buscar pagamentos relacionados no período
    const payments = await prisma.payment.findMany({
      where: {
        userId: auth.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        timeEntries: {
          include: {
            timeEntry: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Filtrar os registros aprovados
    const approvedEntries = timeEntries.filter(entry => entry.approved === true);
    
    // Calcular métricas para o relatório
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    const totalApprovedHours = approvedEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    const hourlyRate = user.hourlyRate || 0;
    const totalValue = totalApprovedHours * hourlyRate;
    
    // Mapear IDs de registros que já foram pagos
    const paidEntryIds = new Set<string>();
    payments.forEach(payment => {
      payment.timeEntries.forEach(entry => {
        paidEntryIds.add(entry.timeEntryId);
      });
    });
    
    // Separar registros pagos e não pagos
    const paidEntries = approvedEntries.filter(entry => paidEntryIds.has(entry.id));
    const unpaidEntries = approvedEntries.filter(entry => !paidEntryIds.has(entry.id));
    
    const paidHours = paidEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    const unpaidHours = unpaidEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
    
    const paidAmount = paidHours * hourlyRate;
    const unpaidAmount = unpaidHours * hourlyRate;
    
    // Gerar dados do relatório
    const reportData: any = {
      title: `Relatório de Horas - ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hourlyRate: user.hourlyRate
      },
      company: user.company,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      },
      summary: {
        totalEntries: timeEntries.length,
        totalHours,
        approvedEntries: approvedEntries.length,
        approvedHours: totalApprovedHours,
        totalValue,
        paidHours,
        paidAmount,
        unpaidHours,
        unpaidAmount
      },
      generatedAt: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss')
    };
    
    // Adicionar detalhes dos registros se solicitado
    if (reportFormat === 'detailed') {
      reportData.entries = timeEntries.map(entry => ({
        id: entry.id,
        date: format(entry.date, 'yyyy-MM-dd'),
        startTime: format(entry.startTime, 'HH:mm'),
        endTime: format(entry.endTime, 'HH:mm'),
        totalHours: entry.totalHours,
        value: entry.approved ? entry.totalHours * hourlyRate : 0,
        observation: entry.observation || '',
        project: entry.project || '',
        status: entry.approved ? 'Aprovado' : (entry.rejected ? 'Rejeitado' : 'Pendente'),
        paid: paidEntryIds.has(entry.id)
      }));
      
      reportData.payments = payments.map(payment => ({
        id: payment.id,
        date: format(payment.date, 'yyyy-MM-dd'),
        amount: payment.amount,
        description: payment.description || '',
        reference: payment.reference || '',
        status: payment.status,
        entriesCount: payment.timeEntries.length
      }));
    }
    
    // Log de sucesso
    console.log('Mobile - Relatório gerado:', { 
      userId: auth.id,
      period: `${format(startDate, 'yyyy-MM-dd')} até ${format(endDate, 'yyyy-MM-dd')}`,
      format: reportFormat
    });
    
    // Retornar dados do relatório
    return createCorsResponse({ report: reportData });
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return createCorsResponse({ error: 'Erro ao gerar relatório' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 