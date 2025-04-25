import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { hash } from "bcryptjs";
import { devLog, devWarn, devError } from "@/lib/logger";

// Funções de log do lado do servidor
const serverLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      devLog(message, data);
    } else {
      devLog(message);
    }
  }
};

const serverWarn = (message: string, data?: any) => {
  if (data !== undefined) {
    devWarn(message, data);
  } else {
    devWarn(message);
  }
};

const serverError = (message: string, data?: any) => {
  if (data !== undefined) {
    devError(message, data);
  } else {
    devError(message);
  }
};

// Schema de validação para atualização de usuários
const updateUserSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").optional(),
  email: z.string().email("E-mail inválido").optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE", "DEVELOPER"]).optional(),
  hourlyRate: z.number().optional(),
  // Campos adicionais de perfil
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  birthDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

// PUT - Atualizar usuário
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Validar dados
    const body = await req.json();
    const result = updateUserSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: result.error.format() },
        { status: 400 }
      );
    }

    const { 
      name, email, password, role, hourlyRate,
      phone, address, city, state, zipCode, birthDate 
    } = result.data;

    // Verificar se o usuário existe
    const userToUpdate = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!userToUpdate) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissões baseado no papel do usuário
    const userRole = session.user.role;
    const userCompanyId = session.user.companyId;
    const userId = session.user.id;
    
    // Verificar permissões
    let canUpdateRole = false;

    if (userRole === "DEVELOPER") {
      // Desenvolvedores podem atualizar qualquer usuário e mudar qualquer role
      canUpdateRole = true;
    } else if (userRole === "ADMIN" && userCompanyId === userToUpdate.companyId) {
      // Admins podem atualizar usuários de sua própria empresa, mas com restrições:
      
      // Não podem atualizar outros admins ou desenvolvedores
      if (userToUpdate.role === "ADMIN" || userToUpdate.role === "DEVELOPER") {
        // A menos que seja o próprio admin se atualizando
        if (userToUpdate.id !== userId) {
          return NextResponse.json(
            { message: "Administradores não podem editar outros administradores ou desenvolvedores" },
            { status: 403 }
          );
        }
      }
      
      // Admins podem mudar roles, mas não para ADMIN ou DEVELOPER
      canUpdateRole = true;
      if (role && (role === "ADMIN" || role === "DEVELOPER") && userToUpdate.id !== userId) {
        return NextResponse.json(
          { message: "Administradores não podem promover usuários para administrador ou desenvolvedor" },
          { status: 403 }
        );
      }
    } else if (userId === params.id) {
      // Usuários podem editar seus próprios perfis, mas não podem mudar seu próprio role
      canUpdateRole = false;
      if (role && role !== userToUpdate.role) {
        return NextResponse.json(
          { message: "Você não pode alterar sua própria função no sistema" },
          { status: 403 }
        );
      }
    } else {
      // Outros papéis não têm permissão para atualizar usuários
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Se estamos atualizando o email, verificar se já existe outro usuário com este email
    if (email && email !== userToUpdate.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return NextResponse.json(
          { message: "Já existe um usuário com este e-mail" },
          { status: 400 }
        );
      }
    }

    // Preparar os dados para atualização
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    
    // Apenas atualizar a senha se foi fornecida
    if (password) {
      updateData.password = await hash(password, 10);
    }
    
    // Apenas atualizar o role se tiver permissão
    if (role && canUpdateRole) {
      updateData.role = role;
    }

    // Atualizar o usuário
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData
    });

    // Remover a senha do objeto retornado
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      message: "Usuário atualizado com sucesso",
      user: userWithoutPassword
    });
  } catch (error: any) {
    serverError("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Excluir usuário
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Apenas desenvolvedores podem excluir qualquer usuário
    // Administradores podem excluir usuários apenas da própria empresa
    const userRole = session.user.role;
    const userCompanyId = session.user.companyId;

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!user) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissões
    if (userRole === "DEVELOPER") {
      // Desenvolvedores podem excluir qualquer usuário
    } else if (userRole === "ADMIN" && userCompanyId === user.companyId) {
      // Administradores podem excluir usuários da própria empresa
      // mas não podem excluir outros administradores ou desenvolvedores
      if (user.role === "ADMIN" || user.role === "DEVELOPER") {
        return NextResponse.json(
          { message: "Administradores não podem excluir outros administradores ou desenvolvedores" },
          { status: 403 }
        );
      }
    } else {
      // Outros papéis não têm permissão para excluir usuários
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Excluir o usuário
    await prisma.user.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      message: "Usuário excluído com sucesso"
    });
  } catch (error: any) {
    serverError("Erro ao excluir usuário:", error);
    
    // Verificar se é um erro de restrição de integridade referencial
    if (error.code === 'P2003' || error.code === 'P2014') {
      return NextResponse.json(
        { message: "Não é possível excluir este usuário porque existem registros vinculados a ele." },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
} 