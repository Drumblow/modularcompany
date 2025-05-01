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
    // Buscar usuário no banco de dados, incluindo campos opcionais
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        hourlyRate: true,
        phone: true,     // Selecionar
        address: true,   // Selecionar
        city: true,      // Selecionar
        state: true,     // Selecionar
        zipCode: true,   // Selecionar
        birthDate: true, // Selecionar
        createdAt: true,
        updatedAt: true, // Adicionar updatedAt também é útil
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

// Definir schema de validação expandido para atualização de perfil
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').optional(),
  // Campos opcionais adicionados para atualização
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  birthDate: z.string().datetime({ message: "Formato de data inválido (esperado ISO 8601)" }).optional().nullable(), // Espera string ISO 8601
});

// PUT - Atualizar perfil do usuário (com campos opcionais)
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
      console.error('Erro de validação ao atualizar perfil:', result.error.flatten());
      return createCorsResponse({
        error: 'Dados inválidos',
        details: result.error.flatten().fieldErrors
      }, 400);
    }
    
    const { name, email, phone, address, city, state, zipCode, birthDate } = result.data;
    
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
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    
    // Converter birthDate de string ISO para Date apenas se fornecido
    if (birthDate !== undefined) {
      if (birthDate === null) { // Permitir limpar a data
        updateData.birthDate = null;
      } else {
        try {
          updateData.birthDate = new Date(birthDate);
        } catch (dateError) {
           console.error('Erro ao converter data de nascimento na atualização:', birthDate, dateError);
           return createCorsResponse({ error: 'Formato inválido para data de nascimento' }, 400);
        }
      }
    }

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      return createCorsResponse({ error: 'Nenhum dado fornecido para atualização' }, 400);
    }
    
    // Atualizar o usuário
    const updatedUser = await prisma.user.update({
      where: { id: auth.id },
      data: updateData,
      // Selecionar todos os campos relevantes, incluindo os novos
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        hourlyRate: true,
        phone: true,     // Incluir na seleção
        address: true,   // Incluir na seleção
        city: true,      // Incluir na seleção
        state: true,     // Incluir na seleção
        zipCode: true,   // Incluir na seleção
        birthDate: true, // Incluir na seleção
        createdAt: true,
        updatedAt: true, // Incluir updatedAt
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
    console.log('Mobile - Perfil atualizado:', { userId: auth.id, fields: Object.keys(updateData) });
    
    // Retornar dados atualizados
    return createCorsResponse({
      user: updatedUser,
      message: 'Perfil atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    // Tratar erro específico de email duplicado no update
    if (error instanceof Error && 'code' in error && error.code === 'P2002' && 'meta' in error && (error.meta as any)?.target?.includes('email')) {
        return createCorsResponse({ error: 'Este email já está sendo usado por outro usuário' }, 409);
    }
    return createCorsResponse({ error: 'Erro ao atualizar perfil' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 