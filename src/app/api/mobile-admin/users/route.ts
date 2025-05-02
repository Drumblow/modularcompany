import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth } from '@/lib/mobile-auth';
import { applyCorsHeaders, handleCorsPreflight } from '@/lib/cors';
// import bcrypt from 'bcrypt'; // Remover bcrypt
import bcryptjs from 'bcryptjs'; // Usar bcryptjs
import { z } from 'zod';

// Schema de validação expandido para criação de usuário
const createUserSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  role: z.enum(['EMPLOYEE', 'MANAGER']).optional().default('EMPLOYEE'),
  hourlyRate: z.number().optional().nullable(),
  // Campos opcionais adicionados
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  birthDate: z.string().datetime({ message: "Formato de data inválido (esperado ISO 8601)" }).optional().nullable(), // Espera string ISO 8601
});

// GET - Listar usuários da empresa para Admins/Managers
export async function GET(req: NextRequest) {
  // Lidar com preflight CORS
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Verificar autenticação (renomear response para evitar conflito)
  const { auth, response: authResponse } = await verifyMobileAuth(req);

  if (!auth || authResponse) {
    // Adiciona cabeçalhos CORS à resposta de erro antes de retornar
    return applyCorsHeaders(req, authResponse || new NextResponse(JSON.stringify({ error: 'Authentication required' }), { status: 401 }));
  }

  // Verificar permissões
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
    // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
    return applyCorsHeaders(req, NextResponse.json({ error: 'Acesso negado. Apenas Admins e Managers podem listar usuários.' }, { status: 403 }));
  }

  if (!auth.companyId) {
    // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
    return applyCorsHeaders(req, NextResponse.json({ error: 'Usuário não está associado a uma empresa.' }, { status: 400 }));
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

    // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
    return applyCorsHeaders(req, NextResponse.json({ users }));
  } catch (error) {
    console.error('Erro ao listar usuários para admin/manager:', error);
    // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
    return applyCorsHeaders(req, NextResponse.json({ error: 'Erro ao buscar usuários da empresa' }, { status: 500 }));
  }
}

// POST - Endpoint para criar um novo usuário na empresa (com campos opcionais)
export async function POST(req: NextRequest) {
  // Lidar com preflight CORS
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Verificar autenticação (renomear response para evitar conflito)
  const { auth, response: authResponse } = await verifyMobileAuth(req);
  if (!auth || authResponse) {
    // Adiciona cabeçalhos CORS à resposta de erro antes de retornar
    return applyCorsHeaders(req, authResponse || new NextResponse(JSON.stringify({ error: 'Authentication required' }), { status: 401 }));
  }

  // Verificar autorização (ADMIN ou MANAGER)
  if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
     // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
     return applyCorsHeaders(req, NextResponse.json({ error: 'Acesso não autorizado para esta operação' }, { status: 403 }));
  }

  try {
    // Verificar se o admin/manager pertence a uma empresa
     if (!auth.companyId) {
      // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
      return applyCorsHeaders(req, NextResponse.json({ error: 'Usuário administrador não está associado a uma empresa para criar novos usuários' }, { status: 400 }));
    }

    // Validar o corpo da requisição
    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      // Log detalhado do erro de validação
      console.error('Erro de validação ao criar usuário:', validation.error.flatten());
      // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
      return applyCorsHeaders(req, NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten().fieldErrors }, { status: 400 }));
    }

    const { name, email, password, role, hourlyRate, phone, address, city, state, zipCode, birthDate } = validation.data;

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
      return applyCorsHeaders(req, NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 }));
    }

    // Hashear a senha
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Preparar dados para criação, incluindo a conversão da data de nascimento
    const userData: any = {
        name,
        email,
        password: hashedPassword,
        role,
        hourlyRate,
        companyId: auth.companyId,
        phone,
        address,
        city,
        state,
        zipCode,
    };

    // Converter birthDate de string ISO para Date apenas se fornecido
    if (birthDate) {
      try {
        userData.birthDate = new Date(birthDate);
      } catch (dateError) {
         console.error('Erro ao converter data de nascimento:', birthDate, dateError);
         // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
         return applyCorsHeaders(req, NextResponse.json({ error: 'Formato inválido para data de nascimento' }, { status: 400 }));
      }
    }

    // Criar o usuário no banco
    const newUser = await prisma.user.create({
      data: userData,
      select: { // Selecionar os campos seguros para retornar, incluindo os novos
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        hourlyRate: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        birthDate: true,
        createdAt: true,
      }
    });

    console.log(`Mobile - Admin/Manager ${auth.id} criou novo usuário ${newUser.id} na empresa ${auth.companyId}`);
    // Remover createCorsResponse e usar NextResponse com applyCorsHeaders
    return applyCorsHeaders(req, NextResponse.json({ user: newUser }, { status: 201 }));

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    // Ajustar tratamento de erro para usar a nova resposta CORS
    if (error instanceof Error && 'code' in error && error.code === 'P2002' && 'meta' in error && (error.meta as any)?.target?.includes('email')) {
      return applyCorsHeaders(req, NextResponse.json({ error: 'Email já cadastrado (conflito DB)' }, { status: 409 }));
    }
    return applyCorsHeaders(req, NextResponse.json({ error: 'Erro interno ao criar usuário' }, { status: 500 }));
  }
}

// OPTIONS - Handler para CORS preflight (usando o helper)
export async function OPTIONS(request: NextRequest) { // Mudar para NextRequest
  const preflightResponse = handleCorsPreflight(request);
  if (preflightResponse) {
    return preflightResponse;
  }
  // Fallback
  return new NextResponse(null, { status: 204 });
} 