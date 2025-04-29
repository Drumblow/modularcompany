import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { z } from 'zod';

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

// Definir schema de validação para atualização de perfil
const updateProfileSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').optional(),
  email: z.string().email('Email inválido').optional()
});

// PUT - Atualizar perfil do usuário
export async function PUT(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }
  
  try {
    // Obter dados do corpo da requisição
    const body = await req.json();
    
    // Validar dados
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return createCorsResponse({
        error: 'Dados inválidos',
        details: result.error.format()
      }, 400);
    }
    
    const { name, email } = result.data;
    
    // Verificar se o email já está em uso (se ele foi fornecido)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: auth.id } // Excluir o próprio usuário da busca
        }
      });
      
      if (existingUser) {
        return createCorsResponse({
          error: 'Este email já está sendo usado por outro usuário'
        }, 400);
      }
    }
    
    // Preparar dados para atualização
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    // Atualizar o usuário
    const updatedUser = await prisma.user.update({
      where: { id: auth.id },
      data: updateData,
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
    
    // Log de sucesso
    console.log('Mobile - Perfil atualizado:', { userId: auth.id });
    
    // Retornar dados atualizados
    return createCorsResponse({
      user: updatedUser,
      message: 'Perfil atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return createCorsResponse({ error: 'Erro ao atualizar perfil' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 