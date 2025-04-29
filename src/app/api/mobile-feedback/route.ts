import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { z } from 'zod';

// Definir schema de validação para feedback
const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'suggestion', 'other'], {
    errorMap: () => ({ message: 'Tipo de feedback inválido' })
  }),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Prioridade inválida' })
  }).optional().default('medium'),
  metadata: z.record(z.any()).optional()
});

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
    const result = feedbackSchema.safeParse(body);
    if (!result.success) {
      return createCorsResponse({
        error: 'Dados inválidos',
        details: result.error.format()
      }, 400);
    }
    
    const { type, title, description, priority, metadata } = result.data;
    
    // Buscar usuário para incluir informações no feedback
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true
      }
    });
    
    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado' }, 404);
    }
    
    // Coletar informações do dispositivo a partir do User-Agent
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    
    // Criar o feedback no banco de dados
    // @ts-ignore - O TypeScript não reconhece o modelo Feedback, mas ele existe no banco de dados
    const feedback = await prisma.feedback.create({
      data: {
        type,
        title,
        description,
        priority,
        metadata: metadata || {},
        userId: auth.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        companyId: user.companyId,
        device: userAgent,
        source: 'mobile'
      }
    });
    
    // Log de sucesso
    console.log('Mobile - Feedback recebido:', { 
      userId: auth.id,
      feedbackId: feedback.id,
      type,
      priority
    });
    
    // Notificar o usuário sobre o recebimento do feedback através de uma notificação
    await prisma.notification.create({
      data: {
        userId: auth.id,
        title: 'Feedback enviado',
        message: `Agradecemos pelo seu feedback "${title}". Nossa equipe irá analisá-lo em breve.`,
        type: 'info',
        read: false,
        relatedId: feedback.id,
        relatedType: 'feedback'
      }
    });
    
    // Enviar alertas para administradores se for um bug de alta prioridade
    if (type === 'bug' && priority === 'high') {
      // Em um sistema completo, aqui poderia ter integração com sistemas de alertas
      // como Slack, emails, ou outros canais para notificar a equipe rapidamente
      console.log('ALERTA: Bug de alta prioridade reportado!', {
        userId: auth.id,
        feedbackId: feedback.id,
        title,
        description: description.substring(0, 100) + (description.length > 100 ? '...' : '')
      });
    }
    
    // Retornar confirmação
    return createCorsResponse({
      success: true,
      feedbackId: feedback.id,
      message: 'Feedback recebido com sucesso. Obrigado pela sua contribuição!'
    }, 201);
    
  } catch (error) {
    console.error('Erro ao processar feedback:', error);
    return createCorsResponse({ error: 'Erro ao processar feedback' }, 500);
  }
}

// GET - Listar feedbacks enviados pelo usuário
export async function GET(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }
  
  try {
    // Pegar parâmetros de query
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Buscar feedbacks enviados pelo usuário
    // @ts-ignore - O TypeScript não reconhece o modelo Feedback, mas ele existe no banco de dados
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    
    // Contar total para paginação
    // @ts-ignore - O TypeScript não reconhece o modelo Feedback, mas ele existe no banco de dados
    const total = await prisma.feedback.count({
      where: { userId: auth.id }
    });
    
    // Log de acesso
    console.log('Mobile - Feedbacks listados:', { userId: auth.id, count: feedbacks.length });
    
    // Retornar lista de feedbacks
    return createCorsResponse({
      feedbacks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar feedbacks:', error);
    return createCorsResponse({ error: 'Erro ao listar feedbacks' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 