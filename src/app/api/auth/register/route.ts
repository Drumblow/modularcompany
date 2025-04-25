import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";
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

// Schema de validação para o corpo da requisição
const registerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  role: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar os dados recebidos
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role } = result.data;

    // Verificar se o email já está em uso
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Este email já está em uso" },
        { status: 400 }
      );
    }

    // Criar hash da senha
    const hashedPassword = await hash(password, 10);

    // Criar o usuário no banco de dados
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      }
    });

    // Excluir a senha do objeto retornado
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { message: "Usuário criado com sucesso", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    serverError("Erro ao registrar usuário:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
} 