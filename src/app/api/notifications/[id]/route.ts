import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// PUT - Marcar notificação como lida/não lida
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter o ID da notificação
    const { id } = params;
    
    // Verificar se a notificação existe
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        { message: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem permissão para modificar esta notificação
    // Apenas o proprietário da notificação pode marcá-la como lida/não lida
    if (notification.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'Você não tem permissão para modificar esta notificação' },
        { status: 403 }
      );
    }

    // Parse o corpo da requisição
    const body = await req.json();
    const { read } = body;

    if (typeof read !== 'boolean') {
      return NextResponse.json(
        { message: 'O campo "read" deve ser um booleano' },
        { status: 400 }
      );
    }

    // Atualizar o status da notificação
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read },
    });

    return NextResponse.json(updatedNotification);
  } catch (error: any) {
    console.error('Erro ao atualizar notificação:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Excluir notificação
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter o ID da notificação
    const { id } = params;
    
    // Verificar se a notificação existe
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        { message: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem permissão para excluir esta notificação
    // Apenas o proprietário da notificação pode excluí-la
    if (notification.userId !== session.user.id) {
      return NextResponse.json(
        { message: 'Você não tem permissão para excluir esta notificação' },
        { status: 403 }
      );
    }

    // Excluir a notificação
    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Notificação excluída com sucesso' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao excluir notificação:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor', error: error.message },
      { status: 500 }
    );
  }
} 