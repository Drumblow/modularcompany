import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  // Verificar autenticação e permissões (Admin/Manager)
  const { auth, response } = await verifyMobileAuth(req);
  
  if (!auth || response) {
    return response;
  }
  
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins e Managers podem acessar este resumo.' }, 403);
  }
  
  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário não está associado a uma empresa.' }, 400);
  }
  
  try {
    // 1. Contar registros pendentes de aprovação na empresa
    const pendingApprovalCount = await prisma.timeEntry.count({
      where: {
        user: {
          companyId: auth.companyId,
        },
        approved: null, // Não aprovado
        rejected: null, // Não rejeitado
      },
    });
    
    // 2. Contar usuários totais na empresa (considerando ativos se o campo existir, senão todos)
    // Assumindo que não há campo 'active' explícito por enquanto, contamos todos.
    const totalUserCount = await prisma.user.count({
      where: {
        companyId: auth.companyId,
      },
    });
    
    // 3. Contar notificações não lidas PARA O ADMIN/MANAGER LOGADO
    const unreadNotificationCount = await prisma.notification.count({
      where: {
        userId: auth.id, // Notificações do usuário autenticado
        read: false,
      },
    });
    
    // 4. Buscar nome da empresa usando o companyId
    let companyName = 'Empresa não encontrada';
    if (auth.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: auth.companyId },
        select: { name: true },
      });
      if (company) {
        companyName = company.name;
      }
    }
    
    // Log de sucesso
    console.log(`Mobile - Admin/Manager ${auth.id} acessou dashboard summary da empresa ${auth.companyId}`);
    
    // Montar resposta
    const summaryData = {
      summary: {
        pendingApprovalCount,
        totalUserCount,
        unreadNotificationCount,
      },
      user: { // Informações do Admin/Manager logado
        id: auth.id,
        name: auth.name,
        role: auth.role,
      },
      company: { // Informações da empresa
        id: auth.companyId,
        name: companyName,
      },
    };
    
    return createCorsResponse({ dashboard: summaryData });
    
  } catch (error) {
    console.error('Erro ao gerar resumo do dashboard para admin/manager:', error);
    return createCorsResponse({ error: 'Erro ao gerar resumo do dashboard' }, 500);
  }
}

// OPTIONS Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 