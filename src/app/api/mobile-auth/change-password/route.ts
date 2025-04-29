import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Definir schema de validação para mudança de senha
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Senha atual deve ter pelo menos 6 caracteres'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha deve ter pelo menos 6 caracteres')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

// POST - Alterar senha do usuário
export async function POST(req: NextRequest) {
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
    const result = changePasswordSchema.safeParse(body);
    if (!result.success) {
      return createCorsResponse({
        error: 'Dados inválidos',
        details: result.error.format()
      }, 400);
    }
    
    const { currentPassword, newPassword } = result.data;
    
    // Buscar usuário com senha atual
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        password: true
      }
    });
    
    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado' }, 404);
    }
    
    // Verificar se a senha atual está correta
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return createCorsResponse({ error: 'Senha atual incorreta' }, 400);
    }
    
    // Verificar se a nova senha é igual à atual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    
    if (isSamePassword) {
      return createCorsResponse({ error: 'A nova senha deve ser diferente da senha atual' }, 400);
    }
    
    // Gerar hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Atualizar a senha do usuário
    await prisma.user.update({
      where: { id: auth.id },
      data: { password: hashedPassword }
    });
    
    // Log de sucesso
    console.log('Mobile - Senha alterada:', { userId: auth.id });
    
    // Retornar sucesso
    return createCorsResponse({
      success: true,
      message: 'Senha alterada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return createCorsResponse({ error: 'Erro ao alterar senha' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 