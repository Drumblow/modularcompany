import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  // Verificar autenticação
  const { auth, response, corsHeaders } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }
  
  try {
    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        hourlyRate: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            plan: true
          }
        }
      }
    });
    
    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado' }, 404);
    }
    
    // Log de sucesso
    console.log('Mobile - Perfil acessado:', { userId: auth.id });
    
    // Retornar dados do usuário
    return createCorsResponse({ user });
    
  } catch (error) {
    return createCorsResponse({ error: 'Erro ao buscar dados do perfil' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 