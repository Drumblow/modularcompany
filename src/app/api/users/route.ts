import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { z } from "zod";
import { hash } from "bcryptjs";

// Schema de validação para criação de usuários
const createUserSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE", "DEVELOPER"]),
  companyId: z.string().uuid("ID da empresa inválido"),
  hourlyRate: z.number().optional(),
  managerId: z.string().uuid("ID do gerente inválido").optional(),
  // Campos adicionais de perfil
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  birthDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

// GET - Listar usuários (com filtros opcionais)
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

    // Obter parâmetros de filtro da URL
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const managerIdFilter = searchParams.get('managerId');

    // Verificar permissões baseado no papel do usuário
    const userRole = session.user.role;
    const userCompanyId = session.user.companyId;
    const userId = session.user.id;
    
    // Construir a query para buscar usuários
    const query: any = {};
    
    // Filtrar por empresa se necessário
    if (userRole === "DEVELOPER") {
      // Desenvolvedores podem ver todos os usuários
      
      // Aplicar filtros se fornecidos
      if (roleFilter) {
        query.role = roleFilter;
      }
      
      if (managerIdFilter) {
        // @ts-ignore - Ignorar erro de tipagem temporariamente até que o Prisma Client seja regenerado
        query.managerId = managerIdFilter;
      }
    } else if (userRole === "ADMIN" && userCompanyId) {
      // Admins só podem ver usuários da própria empresa
      query.companyId = userCompanyId;
      
      // Aplicar filtros se fornecidos
      if (roleFilter) {
        query.role = roleFilter;
      }
      
      if (managerIdFilter) {
        // @ts-ignore - Ignorar erro de tipagem temporariamente até que o Prisma Client seja regenerado
        query.managerId = managerIdFilter;
      }
    } else if (userRole === "MANAGER" && userCompanyId) {
      // Managers só podem ver funcionários (EMPLOYEE) da própria empresa
      query.companyId = userCompanyId;
      
      // Forçar filtro para mostrar apenas funcionários (EMPLOYEE)
      query.role = "EMPLOYEE";
      
      // Se o filtro de managerId estiver presente, aplicá-lo
      if (managerIdFilter) {
        // @ts-ignore - Ignorar erro de tipagem temporariamente até que o Prisma Client seja regenerado
        query.managerId = managerIdFilter;
      }
    } else if (userRole === "EMPLOYEE") {
      // Funcionários só podem ver suas próprias informações
      const selfInfoParam = searchParams.get('selfInfo');
      
      if (selfInfoParam === 'true') {
        // Permitir que o funcionário obtenha apenas suas próprias informações
        query.id = userId;
      } else {
        // Funcionários não podem listar todos os usuários
        return NextResponse.json(
          { message: "Acesso negado" },
          { status: 403 }
        );
      }
    } else {
      // Outros papéis não têm permissão para listar usuários
      return NextResponse.json(
        { message: "Acesso negado" },
        { status: 403 }
      );
    }

    // Usar uma abordagem alternativa para evitar problemas de tipagem
    // Primeiro buscar os IDs dos usuários
    const userIds = await prisma.user.findMany({
      where: query,
      select: { id: true },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Depois buscar os detalhes completos de cada usuário
    const users = await Promise.all(
      userIds.map(async ({ id }) => {
        const user = await prisma.user.findUnique({
          where: { id },
          include: {
            company: {
              select: {
                name: true
              }
            }
          }
        });
        
        // Remover a senha por segurança
        if (user) {
          const { password, ...userWithoutPassword } = user;
          
          // Adicionar o nome da empresa ao objeto do usuário
          return {
            ...userWithoutPassword,
            companyName: user.company?.name || null
          };
        }
        return null;
      })
    );
    
    // Filtrar possíveis nulos
    const filteredUsers = users.filter(user => user !== null);

    return NextResponse.json(filteredUsers);
  } catch (error: any) {
    console.error("Erro ao listar usuários:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
}

// POST - Criar novo usuário
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await req.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(", ");
      return NextResponse.json(
        { message: `Dados inválidos: ${errorMessage}` },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verificar se o e-mail já está em uso
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "E-mail já cadastrado." },
        { status: 400 }
      );
    }

    // Criptografar a senha
    const hashedPassword = await hash(data.password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        companyId: data.companyId,
        hourlyRate: data.hourlyRate,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        birthDate: data.birthDate,
      },
    });

    // Retornar o usuário criado (sem a senha)
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      hourlyRate: user.hourlyRate,
      phone: user.phone,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      birthDate: user.birthDate,
    });
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { message: `Erro ao criar usuário: ${error.message}` },
      { status: 500 }
    );
  }
}
