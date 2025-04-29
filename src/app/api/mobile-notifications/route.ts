import { NextRequest } from 'next/server';
import { prisma } from "@/lib/prisma";
import { verifyMobileAuth, createCorsResponse } from "@/lib/mobile-auth";
import { z } from 'zod';

// GET para listar notificações
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const { auth, response } = await verifyMobileAuth(request);
    
    // Se a verificação falhou, retorne a resposta de erro
    if (!auth || response) {
      return response;
    }
    
    const userId = auth.id;

    // Pegar parâmetros de query
    const url = new URL(request.url);
    const readParam = url.searchParams.get('read');
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');

    // Definir valores padrão e converter parâmetros
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = (page - 1) * limit;

    // Construir filtros
    const filters: any = { userId };
    if (readParam !== null) {
      filters.read = readParam === 'true';
    }

    // Contar total de notificações e não lidas
    const totalCount = await prisma.notification.count({
      where: filters
    });
    
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });

    // Buscar notificações com paginação
    const notifications = await prisma.notification.findMany({
      where: filters,
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`[INFO] Usuário ${userId} acessou suas notificações`);

    // Retornar resposta com CORS
    return createCorsResponse({
      notifications,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: totalPages
      },
      unreadCount
    }, 200);
    
  } catch (error) {
    console.error(`[ERROR] Erro ao buscar notificações:`, error);
    return createCorsResponse({
      error: 'Erro ao buscar notificações'
    }, 500);
  }
}

// PUT para marcar notificações como lidas
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const { auth, response } = await verifyMobileAuth(request);
    
    // Se a verificação falhou, retorne a resposta de erro
    if (!auth || response) {
      return response;
    }
    
    const userId = auth.id;

    // Validar corpo da requisição
    const schema = z.object({
      id: z.string().optional(),
      read: z.boolean().optional(),
      all: z.boolean().optional()
    });
    
    // Extrair dados do corpo
    const body = await request.json();
    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return createCorsResponse({
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, 400);
    }
    
    const { id, read, all } = validationResult.data;

    // Marcar todas as notificações como lidas
    if (all) {
      await prisma.notification.updateMany({
        where: { userId },
        data: { read: true }
      });
      
      console.log(`[INFO] Todas as notificações do usuário ${userId} foram marcadas como lidas`);
      
      return createCorsResponse({
        success: true,
        message: 'Todas as notificações foram marcadas como lidas'
      }, 200);
    }
    
    // Marcar uma notificação específica como lida/não lida
    if (id && read !== undefined) {
      // Verificar se a notificação existe e pertence ao usuário
      const notification = await prisma.notification.findFirst({
        where: {
          id,
          userId
        }
      });
      
      if (!notification) {
        return createCorsResponse({
          error: 'Notificação não encontrada'
        }, 404);
      }
      
      // Atualizar a notificação
      await prisma.notification.update({
        where: { id },
        data: { read }
      });
      
      console.log(`[INFO] Notificação ${id} do usuário ${userId} marcada como ${read ? 'lida' : 'não lida'}`);
      
      return createCorsResponse({
        success: true,
        message: `Notificação marcada como ${read ? 'lida' : 'não lida'}`
      }, 200);
    }
    
    return createCorsResponse({
      error: 'É necessário fornecer um ID de notificação ou marcar todas'
    }, 400);
    
  } catch (error) {
    console.error(`[ERROR] Erro ao atualizar notificações:`, error);
    return createCorsResponse({
      error: 'Erro ao atualizar notificações'
    }, 500);
  }
}

// DELETE para excluir notificações
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const { auth, response } = await verifyMobileAuth(request);
    
    // Se a verificação falhou, retorne a resposta de erro
    if (!auth || response) {
      return response;
    }
    
    const userId = auth.id;

    // Pegar parâmetros de query
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return createCorsResponse({
        error: 'ID da notificação é obrigatório'
      }, 400);
    }

    // Verificar se a notificação existe e pertence ao usuário
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!notification) {
      return createCorsResponse({
        error: 'Notificação não encontrada'
      }, 404);
    }
    
    // Excluir a notificação
    await prisma.notification.delete({
      where: { id }
    });
    
    console.log(`[INFO] Notificação ${id} do usuário ${userId} foi excluída`);
    
    return createCorsResponse({
      success: true,
      message: 'Notificação excluída com sucesso'
    }, 200);
    
  } catch (error) {
    console.error(`[ERROR] Erro ao excluir notificação:`, error);
    return createCorsResponse({
      error: 'Erro ao excluir notificação'
    }, 500);
  }
}

// OPTIONS para suporte a CORS
export async function OPTIONS() {
  return createCorsResponse({}, 200);
} 