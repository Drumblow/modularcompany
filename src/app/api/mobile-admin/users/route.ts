import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// GET - Listar usuários da empresa para Admins/Managers
export async function GET(req: NextRequest) {
  const { auth, response } = await verifyMobileAuth(req);

  if (!auth || response) {
    return response;
  }

  // Verificar permissões
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins e Managers podem listar usuários.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário não está associado a uma empresa.' }, 400);
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        companyId: auth.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hourlyRate: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Mobile - ${auth.role} ${auth.id} listou ${users.length} usuários da empresa ${auth.companyId}`);

    return createCorsResponse({ users });
  } catch (error) {
    console.error('Erro ao listar usuários para admin/manager:', error);
    return createCorsResponse({ error: 'Erro ao buscar usuários da empresa' }, 500);
  }
}

// Schema para validação da criação de usuário por Admin/Manager via mobile
const createUserSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  role: z.enum(['MANAGER', 'EMPLOYEE'], { message: 'Papel inválido. Deve ser MANAGER ou EMPLOYEE.' }),
  hourlyRate: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  birthDate: z.string().datetime({ message: "Data de nascimento deve ser uma data válida." }).optional().nullable(), // Espera string ISO 8601
  managerId: z.string().uuid("ID do gerente inválido.").optional().nullable(),
});

// POST - Criar um novo usuário (por Admin/Manager)
export async function POST(req: NextRequest) {
  const { auth, response: authResponse } = await verifyMobileAuth(req);

  if (!auth || authResponse) {
    return authResponse;
  }

  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    return createCorsResponse({ error: 'Acesso negado. Apenas Admins ou Managers podem criar usuários.' }, 403);
  }

  if (!auth.companyId) {
    return createCorsResponse({ error: 'Usuário Admin/Manager não está associado a uma empresa.' }, 400);
  }

  try {
    const body = await req.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      return createCorsResponse({
        error: 'Dados de criação de usuário inválidos.',
        details: validationResult.error.format(),
      }, 400);
    }

    const { 
      name, email, password, role, hourlyRate,
      phone, address, city, state, zipCode, birthDate, managerId 
    } = validationResult.data;

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createCorsResponse({ error: 'Este email já está em uso.' }, 409);
    }

    // Se managerId for fornecido, verificar se ele existe e pertence à mesma empresa
    if (managerId) {
      const managerExists = await prisma.user.findFirst({
        where: {
          id: managerId,
          role: 'MANAGER', // Garantir que o ID é de um gerente
          companyId: auth.companyId,
        }
      });
      if (!managerExists) {
        return createCorsResponse({ error: 'Gerente especificado não encontrado ou não pertence à sua empresa.' }, 400);
      }
    }

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar o novo usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyId: auth.companyId,
        hourlyRate: role === 'EMPLOYEE' ? hourlyRate : null,
        phone,
        address,
        city,
        state,
        zipCode,
        birthDate: birthDate ? new Date(birthDate) : null,
        managerId: role === 'EMPLOYEE' ? managerId : null, // ManagerId só para Employees
      },
      select: { 
        id: true, name: true, email: true, role: true, companyId: true,
        hourlyRate: true, phone: true, address: true, city: true, state: true,
        zipCode: true, birthDate: true, managerId: true, createdAt: true,
      },
    });

    console.log(`Mobile - ${auth.role} ${auth.id} criou novo usuário ${newUser.id} (${newUser.email}) na empresa ${auth.companyId}`);

    return createCorsResponse({ user: newUser }, 201);

  } catch (error: any) { // Especificar 'any' ou um tipo mais específico para error
    console.error('Erro ao criar usuário via mobile admin:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return createCorsResponse({ error: 'Este email já está em uso.' }, 409);
    }
    return createCorsResponse({ error: 'Erro interno ao criar usuário.' }, 500);
  }
}

// OPTIONS - Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 