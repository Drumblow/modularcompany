import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { UserRole } from '@/lib/utils';
import { z } from 'zod';

// Schema para validação da aprovação/rejeição
const approvalSchema = z.object({
  approved: z.boolean().optional(),
  rejected: z.boolean().optional(),
  rejectionReason: z.string().optional(),
});

// Rota PUT para aprovar ou rejeitar um registro de horas
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Apenas managers e admins podem aprovar/rejeitar
    const userRole = session.user.role as string;
    if (![UserRole.MANAGER, UserRole.ADMIN, UserRole.DEVELOPER].includes(userRole as any)) {
      return NextResponse.json(
        { message: 'Permissão negada' },
        { status: 403 }
      );
    }

    // Obter o ID do registro
    const { id } = params;
    
    // Verificar se o registro existe
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: { 
            id: true,
            name: true,
            email: true,
            companyId: true
          }
        }
      }
    });

    if (!timeEntry) {
      return NextResponse.json(
        { message: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem permissão para aprovar este registro
    // Managers só podem aprovar registros de sua própria empresa
    if (userRole === UserRole.MANAGER) {
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { companyId: true }
      });

      // Verificando empresa do manager vs empresa do usuário que criou o registro
      const managerCompanyId = manager?.companyId;
      const entryUserCompanyId = timeEntry.user.companyId;

      if (!managerCompanyId || managerCompanyId !== entryUserCompanyId) {
        console.error(`Erro de permissão: Manager (companyId: ${managerCompanyId}) tentando aprovar registro de usuário de outra empresa (companyId: ${entryUserCompanyId})`);
        return NextResponse.json(
          { 
            message: 'Você não tem permissão para aprovar este registro', 
            details: 'Manager só pode aprovar registros de funcionários da mesma empresa'
          },
          { status: 403 }
        );
      }
    }

    // Parse e validar os dados
    const data = await req.json();
    const validatedData = approvalSchema.parse(data);

    // Criar objeto de dados para atualização
    const updateData: any = {};
    if (validatedData.approved !== undefined) updateData.approved = validatedData.approved;
    if (validatedData.rejected !== undefined) updateData.rejected = validatedData.rejected;
    if (validatedData.rejectionReason !== undefined) updateData.rejectionReason = validatedData.rejectionReason;

    // Atualizar o status do registro
    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    // Criar notificação para o usuário
    try {
      const notificationType = validatedData.approved ? 'success' : 'error';
      const notificationTitle = validatedData.approved 
        ? 'Registro de horas aprovado' 
        : 'Registro de horas rejeitado';
      
      const notificationMessage = validatedData.approved 
        ? `Seu registro de horas do dia ${updatedTimeEntry.date.toLocaleDateString('pt-BR')} foi aprovado.` 
        : `Seu registro de horas do dia ${updatedTimeEntry.date.toLocaleDateString('pt-BR')} foi rejeitado${validatedData.rejectionReason ? ': ' + validatedData.rejectionReason : '.'}`;
      
      console.log(`Tentando criar notificação para usuário ${updatedTimeEntry.userId} sobre registro ${updatedTimeEntry.id}`);
      console.log(`Tipo: ${notificationType}, Título: ${notificationTitle}`);
      console.log(`Mensagem: ${notificationMessage}`);
      
      try {
        const notification = await prisma.notification.create({
          data: {
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            userId: updatedTimeEntry.userId,
            relatedId: updatedTimeEntry.id,
            relatedType: 'timeEntry',
          }
        });
        
        console.log(`Notificação criada com sucesso para usuário ${updatedTimeEntry.userId}:`, {
          id: notification.id,
          title: notification.title,
          type: notification.type
        });
      } catch (createError) {
        console.error('Erro específico ao criar notificação:', createError);
        console.error('Detalhes da tentativa:', {
          userId: updatedTimeEntry.userId,
          timeEntryId: updatedTimeEntry.id,
          title: notificationTitle,
          type: notificationType
        });
      }
    } catch (notificationError) {
      console.error('Erro geral ao preparar notificação:', notificationError);
      // Não impedimos o fluxo principal se a notificação falhar
    }

    // Formatar os dados para o cliente
    const formattedEntry = {
      id: updatedTimeEntry.id,
      date: updatedTimeEntry.date.toISOString().split('T')[0],
      startTime: updatedTimeEntry.startTime.getHours().toString().padStart(2, '0') + ':' + 
                updatedTimeEntry.startTime.getMinutes().toString().padStart(2, '0'),
      endTime: updatedTimeEntry.endTime.getHours().toString().padStart(2, '0') + ':' + 
               updatedTimeEntry.endTime.getMinutes().toString().padStart(2, '0'),
      totalHours: updatedTimeEntry.totalHours,
      observation: updatedTimeEntry.observation,
      userId: updatedTimeEntry.userId,
      userName: updatedTimeEntry.user.name,
      approved: (updatedTimeEntry as any).approved,
      rejected: (updatedTimeEntry as any).rejected,
      rejectionReason: (updatedTimeEntry as any).rejectionReason,
      project: (updatedTimeEntry as any).project,
      createdAt: updatedTimeEntry.createdAt,
      updatedAt: updatedTimeEntry.updatedAt
    };

    return NextResponse.json(formattedEntry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Erro ao aprovar/rejeitar registro:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 