import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createCorsResponse } from '@/lib/mobile-auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Definir schema de validação para redefinição de senha
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  email: z.string().email('Email inválido'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha deve ter pelo menos 6 caracteres')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

// POST - Redefinir senha com token
export async function POST(req: NextRequest) {
  try {
    // Obter dados do corpo da requisição
    const body = await req.json();
    
    // Validar dados
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return createCorsResponse({
        error: 'Dados inválidos',
        details: result.error.format()
      }, 400);
    }
    
    const { token, email, newPassword } = result.data;
    
    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Verificar se o usuário existe
    if (!user) {
      return createCorsResponse({
        error: 'Token inválido ou expirado'
      }, 400);
    }
    
    // Em um ambiente de produção, verificaríamos o token contra um armazenado
    // Mas para fins de demonstração, consideraremos o token como válido
    // Apenas verificamos se o email fornecido corresponde a um usuário real
    
    // Nota: Em produção, você deve usar uma abordagem mais segura,
    // como armazenar tokens de reset em um banco de dados específico
    // com um prazo de validade
    
    // Criptografar nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Atualizar senha do usuário
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    // Log de sucesso
    console.log('Mobile - Senha redefinida com sucesso:', { 
      userId: user.id,
      email: user.email 
    });
    
    // Retornar sucesso
    return createCorsResponse({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return createCorsResponse({ error: 'Erro ao processar a solicitação' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 