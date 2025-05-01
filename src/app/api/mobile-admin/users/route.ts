import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';
// import bcrypt from 'bcrypt'; // Remover bcrypt
import bcryptjs from 'bcryptjs'; // Usar bcryptjs
import { z } from 'zod';

// Schema de validação para criação de usuário
const createUserSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  role: z.enum(['EMPLOYEE', 'MANAGER']).optional().default('EMPLOYEE'), // Permitir criar EMPLOYEE ou MANAGER
  hourlyRate: z.number().optional().nullable(),
});

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

// POST - Endpoint para criar um novo usuário na empresa
export async function POST(req: NextRequest) {
  // Verificar autenticação
  const { auth, response: authResponse } = await verifyMobileAuth(req);
  if (!auth || authResponse) {
    return authResponse;
  }

  // Verificar autorização (ADMIN ou MANAGER)
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
     return createCorsResponse({ error: 'Acesso não autorizado para esta operação' }, 403);
  }

  try {
    // Verificar se o admin/manager pertence a uma empresa
     if (!auth.companyId) {
      return createCorsResponse({ error: 'Usuário administrador não está associado a uma empresa para criar novos usuários' }, 400);
    }

    // Validar o corpo da requisição
    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return createCorsResponse({ error: 'Dados inválidos', details: validation.error.flatten().fieldErrors }, 400);
    }

    const { name, email, password, role, hourlyRate } = validation.data;

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createCorsResponse({ error: 'Email já cadastrado' }, 409); // 409 Conflict
    }

    // Hashear a senha usando bcryptjs
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Criar o usuário no banco
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role, // Role vem do input validado (EMPLOYEE ou MANAGER)
        hourlyRate,
        companyId: auth.companyId, // Associa à empresa do admin/manager
      },
      select: { // Selecionar apenas os campos seguros para retornar
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        hourlyRate: true,
        createdAt: true,
      }
    });

    console.log(`Mobile - Admin/Manager ${auth.id} criou novo usuário ${newUser.id} na empresa ${auth.companyId}`);
    return createCorsResponse({ user: newUser }, 201); // 201 Created

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    // Tratar erro de constraint única de forma mais específica, se necessário
     if (error instanceof Error && 'code' in error && error.code === 'P2002' && 'meta' in error && (error.meta as any)?.target?.includes('email')) {
      return createCorsResponse({ error: 'Email já cadastrado (conflito DB)' }, 409);
    }
    return createCorsResponse({ error: 'Erro interno ao criar usuário' }, 500);
  }
}

// OPTIONS - Handler para CORS preflight
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 