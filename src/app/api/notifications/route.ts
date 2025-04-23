import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { z } from 'zod';

// Schema para validar a criação de notificações
const createNotificationSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  message: z.string().min(5, 'Mensagem deve ter pelo menos 5 caracteres'),
  type: z.enum(['info', 'success', 'warning', 'error']),
  userId: z.string().uuid('ID do usuário inválido'),
  relatedId: z.string().uuid('ID relacionado inválido').optional(),
  relatedType: z.string().optional(),
});

// GET - Listar notificações do usuário atual
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter parâmetros de filtro da URL
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 20;
    
    // Construir a query para buscar notificações
    const query: any = {
      where: {
        userId: session.user.id as string,
      },
      orderBy: {
        createdAt: 'desc' as const,
      },
      take: limit,
    };
    
    // Filtrar apenas não lidas se solicitado
    if (unreadOnly) {
      query.where.read = false;
    }

    // Buscar notificações
    const notifications = await prisma.notification.findMany(query);
    
    // Contar notificações não lidas
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id as string,
        read: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Erro ao listar notificações:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Criar nova notificação
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Apenas admins, gerentes e desenvolvedores podem criar notificações para outros usuários
    const userRole = session.user.role as string;
    if (!['ADMIN', 'MANAGER', 'DEVELOPER'].includes(userRole)) {
      return NextResponse.json(
        { message: 'Permissão negada' },
        { status: 403 }
      );
    }

    // Validar dados
    const body = await req.json();
    const result = createNotificationSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: result.error.format() },
        { status: 400 }
      );
    }

    const { title, message, type, userId, relatedId, relatedType } = result.data;

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Criar notificação
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        userId,
        relatedId,
        relatedType,
      },
    });

    return NextResponse.json(
      { 
        message: 'Notificação criada com sucesso', 
        notification 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
} 