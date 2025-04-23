import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { UserRole } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { message: "Esta função só está disponível em ambiente de desenvolvimento" },
        { status: 403 }
      );
    }

    // Criar usuários de teste para diferentes papéis
    const testUsers = [
      {
        name: "Desenvolvedor Teste",
        email: "dev@example.com",
        password: "dev123456",
        role: UserRole.DEVELOPER
      },
      {
        name: "Admin Teste",
        email: "admin@example.com",
        password: "admin123456",
        role: UserRole.ADMIN
      },
      {
        name: "Gerente Teste",
        email: "manager@example.com",
        password: "manager123456",
        role: UserRole.MANAGER
      },
      {
        name: "Funcionário Teste",
        email: "employee@example.com",
        password: "employee123456",
        role: UserRole.EMPLOYEE
      }
    ];

    // Array para armazenar os resultados
    const results = [];

    // Criar ou atualizar cada usuário
    for (const user of testUsers) {
      // Verificar se o usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      });

      // Hash da senha
      const hashedPassword = await hash(user.password, 10);

      if (existingUser) {
        // Atualizar o usuário existente
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: user.name,
            password: hashedPassword,
            role: user.role
          }
        });
        results.push({
          email: user.email,
          status: "atualizado"
        });
      } else {
        // Criar novo usuário
        const newUser = await prisma.user.create({
          data: {
            name: user.name,
            email: user.email,
            password: hashedPassword,
            role: user.role
          }
        });
        results.push({
          email: user.email,
          status: "criado"
        });
      }
    }

    return NextResponse.json({
      message: "Usuários de demonstração configurados com sucesso",
      users: results
    }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao configurar usuários de demonstração:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor", error: error.message },
      { status: 500 }
    );
  }
} 