import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { UserRole } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
import { devLog, devWarn, devError } from "@/lib/logger";

// Criando funções de log do lado do servidor
const serverLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

const serverWarn = (message: string, data?: any) => {
  if (data !== undefined) {
    console.warn(message, data);
  } else {
    console.warn(message);
  }
};

const serverError = (message: string, data?: any) => {
  if (data !== undefined) {
    console.error(message, data);
  } else {
    console.error(message);
  }
};

export async function POST(req: NextRequest) {
  try {
    const requestIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "desconhecido";
    serverLog(`Solicitação setup-demo recebida de IP: ${requestIp}`);
    
    // Verificar ambiente - em produção, aplicar regras mais rigorosas
    const isProd = process.env.NODE_ENV === 'production';
    
    // Extrair dados da requisição
    const reqBody = await req.json().catch(() => ({}));
    const { setupToken, customUsers, requestedRole, clientInfo } = reqBody;
    
    // Verificar token de segurança no header
    const headerToken = req.headers.get("X-Setup-Security-Token");
    
    // Em produção, verificar autenticação e autorização
    if (isProd) {
      // Verificar token de segurança (do header ou do body)
      const validToken = process.env.SETUP_SECRET_TOKEN;
      const providedToken = headerToken || setupToken;
      
      if (!validToken || validToken.length < 32) {
        serverError("Erro de configuração: SETUP_SECRET_TOKEN não definido ou muito curto");
        return NextResponse.json(
          { message: "Erro de configuração do servidor. Contate o administrador." },
          { status: 500 }
        );
      }
      
      if (!providedToken || providedToken !== validToken) {
        serverWarn(`Tentativa de acesso não autorizado à API setup-demo de ${requestIp}. Info cliente: ${JSON.stringify(clientInfo || {})}`);
        return NextResponse.json(
          { message: "Acesso não autorizado" },
          { status: 403 }
        );
      }
      
      // Verificar autenticação do usuário
      const session = await getServerSession(authOptions);
      if (!session) {
        serverWarn(`Tentativa de acesso não autenticado à API setup-demo de ${requestIp}`);
        return NextResponse.json(
          { message: "Autenticação necessária" },
          { status: 401 }
        );
      }
      
      // Verificar se é desenvolvedor
      if (session.user.role !== UserRole.DEVELOPER) {
        serverWarn(`Usuário ${session.user.email} (${session.user.role}) tentou acessar setup-demo sem permissão`);
        return NextResponse.json(
          { message: "Acesso restrito a desenvolvedores" },
          { status: 403 }
        );
      }
      
      serverLog(`Setup-demo autorizado para desenvolvedor: ${session.user.email}`);
    } else {
      // Em desenvolvimento, verificar token básico
      const devToken = process.env.NEXT_PUBLIC_SETUP_TOKEN || 'desenvolvimento-seguro';
      const providedToken = headerToken || setupToken;
      
      if (!providedToken || providedToken !== devToken) {
        serverWarn(`Token inválido em ambiente de desenvolvimento. IP: ${requestIp}`);
        // Em dev, logar mas não bloquear completamente para facilitar testes
        serverLog(`Token esperado: ${devToken}, Token recebido: ${providedToken || 'nenhum'}`);
      }
    }

    // Obter os usuários padrão e configurá-los conforme o ambiente
    let usersToCreate = [];
    
    // Verificar se as variáveis de ambiente obrigatórias estão configuradas em produção
    if (isProd) {
      const devEmail = process.env.DEVELOPER_EMAIL;
      const devPassword = process.env.DEVELOPER_PASSWORD;
      
      if (!devEmail || !devPassword || devPassword.length < 10) {
        serverError("Configuração inválida: credenciais de desenvolvedor não definidas ou senha muito curta");
        return NextResponse.json(
          { message: "Configuração de segurança inválida. Verifique as variáveis de ambiente." },
          { status: 500 }
        );
      }
      
      // Em produção, permitir apenas o usuário desenvolvedor ou customizados explicitamente
      if (customUsers && Array.isArray(customUsers)) {
        // Validar cada usuário customizado
        for (const user of customUsers) {
          if (!user.email || !user.password || user.password.length < 10) {
            return NextResponse.json(
              { message: "Dados de usuário inválidos. Senhas devem ter pelo menos 10 caracteres." },
              { status: 400 }
            );
          }
        }
        usersToCreate = customUsers;
      } else {
        // Usar apenas o usuário desenvolvedor com credenciais definidas em variáveis de ambiente
        usersToCreate = [{
          name: "Desenvolvedor",
          email: devEmail,
          password: devPassword,
          role: UserRole.DEVELOPER
        }];
      }
    } else {
      // Em desenvolvimento, incluir usuários de teste
      usersToCreate = [
        {
          name: "Desenvolvedor",
          email: process.env.DEVELOPER_EMAIL || "dev@example.com",
          password: process.env.DEVELOPER_PASSWORD || "dev123456",
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
      
      // Substitui com usuários customizados se fornecidos
      if (customUsers && Array.isArray(customUsers)) {
        usersToCreate = customUsers;
      }
    }

    // Array para armazenar os resultados
    const results = [];

    // Criar ou atualizar cada usuário
    for (const user of usersToCreate) {
      try {
        // Verificar se o usuário já existe
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });

        // Hash da senha com um fator mais seguro em produção
        const saltRounds = isProd ? 12 : 10;
        const hashedPassword = await hash(user.password, saltRounds);

        if (existingUser) {
          // Atualizar o usuário existente
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: user.name,
              password: hashedPassword,
              role: user.role,
              updatedAt: new Date()
            }
          });
          results.push({
            email: user.email,
            status: "atualizado",
            role: user.role
          });
        } else {
          // Criar novo usuário
          await prisma.user.create({
            data: {
              name: user.name,
              email: user.email,
              password: hashedPassword,
              role: user.role
            }
          });
          results.push({
            email: user.email,
            status: "criado",
            role: user.role
          });
        }
      } catch (userError: any) {
        serverError(`Erro ao configurar usuário ${user.email}:`, userError);
        results.push({
          email: user.email,
          status: "erro",
          message: isProd ? "Erro ao processar usuário" : userError.message
        });
      }
    }

    // Resposta com informações conforme o ambiente
    const response = {
      message: "Usuários configurados com sucesso",
      users: results.map(u => ({
        email: u.email,
        status: u.status,
        role: u.role
      }))
    };

    serverLog(`Setup-demo concluído com sucesso. Usuários processados: ${results.length}`);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    serverError("Erro crítico ao configurar usuários:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 