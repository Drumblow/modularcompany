import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';

// GET - Listar usuários da empresa para Admins/Managers
export async function GET(req: NextRequest) {
  const { auth, response } = await verifyMobileAuth(req);

  if (!auth || response) {
    return response;
  }

  // Verificar permissões
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins e Managers podem listar usuários.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário não está associado a uma empresa.' }, 400);
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        companyId: auth.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hourlyRate: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Mobile - ${auth.role} ${auth.id} listou ${users.length} usuários da empresa ${auth.companyId}`);

    return createCorsResponse({ users });
  } catch (error) {
    console.error('Erro ao listar usuários para admin/manager:', error);
    return createCorsResponse({ error: 'Erro ao buscar usuários da empresa' }, 500);
  }
}

// OPTIONS - Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 