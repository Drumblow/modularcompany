import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { z } from 'zod';

// Schema para validação da atualização de usuário por Admin/Manager via mobile
const updateUserSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.').optional(),
  role: z.enum(['MANAGER', 'EMPLOYEE'], { message: 'Papel inválido. Deve ser MANAGER ou EMPLOYEE.' }).optional(),
  hourlyRate: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  birthDate: z.string().datetime({ message: "Data de nascimento deve ser uma data válida." }).optional().nullable(),
  managerId: z.string().uuid("ID do gerente inválido.").optional().nullable(),
  // active: z.boolean().optional(), // Removido temporariamente - adicione após atualizar o schema
});


// GET - Obter detalhes de um usuário específico (por Admin/Manager)
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { auth, response: authResponse } = await verifyMobileAuth(req);
  const { userId } = params;

  if (!auth || authResponse) {
    return authResponse;
  }

  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins ou Managers podem visualizar usuários.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário Admin/Manager não está associado a uma empresa.' }, 400);
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: auth.companyId, 
      },
      select: {
        id: true, name: true, email: true, role: true, companyId: true,
        hourlyRate: true, phone: true, address: true, city: true, state: true,
        zipCode: true, birthDate: true, managerId: true, createdAt: true, updatedAt: true,
        // active: true, // Removido temporariamente
      },
    });

    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado ou não pertence à sua empresa.' }, 404);
    }

    return createCorsResponse({ user });

  } catch (error) {
    console.error(`Erro ao buscar usuário ${userId} via mobile admin:`, error);
    return createCorsResponse({ error: 'Erro interno ao buscar usuário.' }, 500);
  }
}

// PUT - Atualizar um usuário existente (por Admin/Manager)
export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const { auth, response: authResponse } = await verifyMobileAuth(req);
  const { userId } = params;

  if (!auth || authResponse) {
    return authResponse;
  }

  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins ou Managers podem atualizar usuários.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário Admin/Manager não está associado a uma empresa.' }, 400);
  }

  try {
    const body = await req.json();
    // Adicionar active ao schema de validação se você o adicionar ao User e quiser permitir sua atualização
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return createCorsResponse({
        error: 'Dados de atualização de usuário inválidos.',
        details: validationResult.error.format(),
      }, 400);
    }

    let updateData = validationResult.data as any; // Usar 'as any' temporariamente devido à remoção de 'active'

    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: auth.companyId,
      },
    });

    if (!existingUser) {
      return createCorsResponse({ error: 'Usuário a ser atualizado não encontrado ou não pertence à sua empresa.' }, 404);
    }
    
    if (updateData.managerId) {
      const managerExists = await prisma.user.findFirst({
        where: {
          id: updateData.managerId,
          role: 'MANAGER',
          companyId: auth.companyId,
        }
      });
      if (!managerExists) {
        return createCorsResponse({ error: 'Gerente especificado para atualização não encontrado ou não pertence à sua empresa.' }, 400);
      }
    }

    if (updateData.role && updateData.role !== 'EMPLOYEE') {
      updateData = { ...updateData, managerId: null };
    } else if (updateData.role === 'EMPLOYEE'){
      if (updateData.managerId === undefined && existingUser.role === 'EMPLOYEE'){
          updateData = { ...updateData, managerId: existingUser.managerId };
      }
    }

    if (updateData.role && updateData.role === 'MANAGER') {
        updateData = { ...updateData, hourlyRate: null };
    }
    
    // Remover 'active' de updateData se ele não for um campo editável ou não existir no schema atual
    // delete updateData.active; 

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        birthDate: updateData.birthDate ? new Date(updateData.birthDate) : undefined,
      },
      select: {
        id: true, name: true, email: true, role: true, companyId: true,
        hourlyRate: true, phone: true, address: true, city: true, state: true,
        zipCode: true, birthDate: true, managerId: true, createdAt: true, updatedAt: true,
        // active: true // Removido temporariamente
      },
    });

    console.log(`Mobile - ${auth.role} ${auth.id} atualizou usuário ${updatedUser.id} na empresa ${auth.companyId}`);
    return createCorsResponse({ user: updatedUser });

  } catch (error) {
    console.error(`Erro ao atualizar usuário ${userId} via mobile admin:`, error);
    return createCorsResponse({ error: 'Erro interno ao atualizar usuário.' }, 500);
  }
}


// DELETE - Desativar um usuário (por Admin/Manager)
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const { auth, response: authResponse } = await verifyMobileAuth(req);
  const { userId } = params;

  if (!auth || authResponse) {
    return authResponse;
  }

  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins ou Managers podem desativar usuários.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário Admin/Manager não está associado a uma empresa.' }, 400);
  }
  
  if (auth.id === userId) {
      return createCorsResponse({ error: 'Você não pode se auto-desativar por esta rota.' }, 403);
  }

  try {
    const userToDelete = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: auth.companyId,
      },
    });

    if (!userToDelete) {
      return createCorsResponse({ error: 'Usuário a ser excluído/desativado não encontrado ou não pertence à sua empresa.' }, 404);
    }

    // TODO: Implementar desativação (setar active: false) ou exclusão.
    // Se for desativação, adicione o campo 'active' ao schema e descomente:
    // const deactivatedUser = await prisma.user.update({
    //   where: { id: userId },
    //   data: { active: false }, 
    //   select: { id: true, name: true, email: true, active: true },
    // });
    // console.log(`Mobile - ${auth.role} ${auth.id} desativou usuário ${deactivatedUser.id} na empresa ${auth.companyId}`);
    // return createCorsResponse({ user: deactivatedUser, message: 'Usuário desativado com sucesso.' });

    // Se for exclusão permanente (CUIDADO):
    await prisma.user.delete({
      where: { id: userId }
    });
    console.log(`Mobile - ${auth.role} ${auth.id} EXCLUIU usuário ${userId} na empresa ${auth.companyId}`);
    return createCorsResponse({ message: 'Usuário excluído com sucesso.' });

  } catch (error: any) {
    console.error(`Erro ao excluir/desativar usuário ${userId} via mobile admin:`, error);
    if (error.code === 'P2025') { 
        return createCorsResponse({ error: 'Usuário não encontrado para exclusão/desativação.' }, 404);
    }
    return createCorsResponse({ error: 'Erro interno ao excluir/desativar usuário.' }, 500);
  }
}

// OPTIONS - Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse(null);
} 