import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createCorsResponse } from '@/lib/mobile-auth';
import { z } from 'zod';
import crypto from 'crypto';
import { addHours } from 'date-fns';
import { sendEmail } from '@/lib/email';

// Definir schema de validação para solicitação de recuperação de senha
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido')
});

// POST - Solicitar recuperação de senha
export async function POST(req: NextRequest) {
  try {
    // Obter dados do corpo da requisição
    const body = await req.json();
    
    // Validar dados
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return createCorsResponse({
        error: 'Dados inválidos',
        details: result.error.format()
      }, 400);
    }
    
    const { email } = result.data;
    
    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Por segurança, não informamos se o email existe ou não
    if (!user) {
      // Registrar para fins de segurança
      console.log('Mobile - Tentativa de recuperação de senha para email não cadastrado:', email);
      
      // Retornar sucesso de qualquer forma para não revelar que o email não existe
      return createCorsResponse({
        success: true,
        message: 'Se o email estiver cadastrado, enviaremos instruções para recuperar sua senha'
      });
    }
    
    // Gerar token de recuperação (hash do ID do usuário + timestamp + random)
    const resetToken = crypto
      .createHash('sha256')
      .update(`${user.id}-${Date.now()}-${Math.random()}`)
      .digest('hex');
    
    // No ambiente de desenvolvimento/teste, não precisamos realmente 
    // armazenar o token no banco de dados.
    // Apenas simularemos isso para fins de demonstração.
    
    // URL de reset (app ou web)
    const resetUrl = `https://modularcompany.vercel.app/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    // Enviar email com link de recuperação
    await sendEmail({
      to: email,
      subject: 'Recuperação de Senha - ModularCompany',
      text: `Para redefinir sua senha, clique no link a seguir ou cole-o no seu navegador: ${resetUrl}\n\nEste link é válido por 1 hora.\n\nSe você não solicitou a recuperação de senha, por favor ignore este email.`,
      html: `
        <h1>Recuperação de Senha - ModularCompany</h1>
        <p>Para redefinir sua senha, clique no link a seguir ou cole-o no seu navegador:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Este link é válido por 1 hora.</p>
        <p>Se você não solicitou a recuperação de senha, por favor ignore este email.</p>
      `
    });
    
    // Log de sucesso
    console.log('Mobile - Solicitação de recuperação de senha enviada:', { 
      email,
      resetToken, // Em produção, não logar o token
      resetUrl // Em produção, não logar a URL completa
    });
    
    // Retornar sucesso
    return createCorsResponse({
      success: true,
      message: 'Se o email estiver cadastrado, enviaremos instruções para recuperar sua senha'
    });
    
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    return createCorsResponse({ error: 'Erro ao processar a solicitação' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 