import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { UserRole, PlanType } from "@/lib/utils";
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

// Schema de validação para atualização de empresa
const updateCompanySchema = z.object({
  name: z.string().min(3, "Nome da empresa deve ter pelo menos 3 caracteres").optional(),
  plan: z.enum([PlanType.BASIC, PlanType.STANDARD, PlanType.PREMIUM]).optional(),
  active: z.boolean().optional(),
});

// GET - Buscar empresa específica
export async function GET(
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

    // Apenas desenvolvedores, admin da empresa ou usuários da empresa podem ver detalhes
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isDeveloper = session.user.role === UserRole.DEVELOPER;
    const isMemberOfCompany = session.user.companyId === params.id;
    
    if (!isDeveloper && !isAdmin && !isMemberOfCompany) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Buscar empresa com dados relacionados
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        modules: {
          select: {
            id: true,
            name: true,
            description: true,
            active: true,
          }
        }
      }
    });

    if (!company) {
      return NextResponse.json(
        { message: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Formatar resposta
    const formattedCompany = {
      id: company.id,
      name: company.name,
      plan: company.plan,
      active: company.active,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      owner: {
        id: company.owner.id,
        name: company.owner.name,
        email: company.owner.email,
      },
      users: company.users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })),
      modules: company.modules.map(module => ({
        id: module.id,
        name: module.name,
        description: module.description,
        active: module.active,
      })),
    };

    return NextResponse.json(formattedCompany);
  } catch (error: any) {
    serverError("Erro ao buscar empresa:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Atualizar empresa
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

    // Apenas desenvolvedores podem atualizar empresas
    if (session.user.role !== UserRole.DEVELOPER) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Validar dados
    const body = await req.json();
    const result = updateCompanySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: result.error.format() },
        { status: 400 }
      );
    }

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: params.id }
    });

    if (!company) {
      return NextResponse.json(
        { message: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar empresa
    const updatedCompany = await prisma.company.update({
      where: { id: params.id },
      data: result.data,
    });

    return NextResponse.json({
      message: "Empresa atualizada com sucesso",
      company: updatedCompany,
    });
  } catch (error: any) {
    serverError("Erro ao atualizar empresa:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Ativar/Desativar empresa
export async function PATCH(
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

    // Apenas desenvolvedores podem ativar/desativar empresas
    if (session.user.role !== UserRole.DEVELOPER) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: params.id }
    });

    if (!company) {
      return NextResponse.json(
        { message: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Inverter status de ativação
    const updatedCompany = await prisma.company.update({
      where: { id: params.id },
      data: {
        active: !company.active,
      },
    });

    const status = updatedCompany.active ? "ativada" : "desativada";

    return NextResponse.json({
      message: `Empresa ${status} com sucesso`,
      company: updatedCompany,
    });
  } catch (error: any) {
    serverError("Erro ao atualizar status da empresa:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Excluir empresa
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

    // Apenas desenvolvedores podem excluir empresas
    if (session.user.role !== UserRole.DEVELOPER) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        users: true
      }
    });

    if (!company) {
      return NextResponse.json(
        { message: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Executar a operação em uma transação para garantir consistência
    await prisma.$transaction(async (prisma) => {
      // 1. Excluir todos os usuários da empresa
      await prisma.user.deleteMany({
        where: { companyId: params.id }
      });

      // 2. Remover relações com módulos
      await prisma.company.update({
        where: { id: params.id },
        data: {
          modules: {
            set: []
          }
        }
      });

      // 3. Excluir a empresa
      await prisma.company.delete({
        where: { id: params.id }
      });
    });

    return NextResponse.json({
      message: "Empresa excluída com sucesso"
    });
  } catch (error: any) {
    serverError("Erro ao excluir empresa:", error);
    
    // Verificar se é um erro de restrição de integridade referencial
    if (error.code === 'P2003' || error.code === 'P2014') {
      return NextResponse.json(
        { message: "Não é possível excluir esta empresa porque existem registros vinculados a ela." },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
} 