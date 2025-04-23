import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { z } from "zod";
import { hash } from "bcryptjs";
import { UserRole, PlanType } from "@/lib/utils";

// Schema de validação para criação de empresa e admin
const createCompanySchema = z.object({
  companyName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  plan: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  adminName: z.string().min(3, "Nome do administrador deve ter pelo menos 3 caracteres"),
  adminEmail: z.string().email("E-mail do administrador inválido"),
  adminPassword: z.string().min(6, "Senha do administrador deve ter pelo menos 6 caracteres"),
  adminPhone: z.string().optional(),
  adminAddress: z.string().optional(),
  adminCity: z.string().optional(),
  adminState: z.string().optional(),
  adminZipCode: z.string().optional(),
  adminBirthDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

// GET - Listar empresas
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Apenas desenvolvedores podem listar todas as empresas
    if (session.user.role !== UserRole.DEVELOPER) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Buscar empresas com seus administradores
    const companies = await prisma.company.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        users: {
          where: {
            role: "ADMIN"
          },
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatar resposta
    const formattedCompanies = companies.map(company => {
      // Encontrar o primeiro administrador (pode haver múltiplos)
      const admin = company.users[0] || { name: 'Sem administrador', email: 'N/A' };
      
      return {
        id: company.id,
        name: company.name,
        plan: company.plan,
        active: company.active,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        ownerId: company.ownerId,
        ownerName: company.owner.name,
        adminName: admin.name,
        adminEmail: admin.email,
      };
    });

    return NextResponse.json(formattedCompanies);
  } catch (error: any) {
    console.error("Erro ao listar empresas:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// POST - Criar nova empresa com administrador
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Apenas desenvolvedores podem criar empresas
    if (session.user.role !== UserRole.DEVELOPER) {
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Validar dados
    const body = await req.json();
    const result = createCompanySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: result.error.format() },
        { status: 400 }
      );
    }

    const { companyName, plan, adminName, adminEmail, adminPassword, adminPhone, adminAddress, adminCity, adminState, adminZipCode, adminBirthDate } = result.data;

    // Verificar se já existe usuário com o mesmo e-mail
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Já existe um usuário com este e-mail" },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await hash(adminPassword, 10);

    // Criar empresa e administrador em transação
    const newCompany = await prisma.$transaction(async (prisma) => {
      // 1. Criar a empresa
      const company = await prisma.company.create({
        data: {
          name: companyName,
          plan: plan,
          active: true,
          ownerId: session.user.id, // Desenvolvedor é o dono
        }
      });

      // 2. Criar o administrador
      const admin = await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: UserRole.ADMIN,
          companyId: company.id,
          phone: adminPhone,
          address: adminAddress,
          city: adminCity,
          state: adminState,
          zipCode: adminZipCode,
          birthDate: adminBirthDate,
        } as any
      });

      return company;
    });

    return NextResponse.json(
      { 
        message: "Empresa criada com sucesso", 
        company: {
          id: newCompany.id,
          name: newCompany.name,
          plan: newCompany.plan,
          active: newCompany.active,
          createdAt: newCompany.createdAt,
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao criar empresa:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
} 