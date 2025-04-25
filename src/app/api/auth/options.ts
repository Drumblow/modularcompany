import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { devLog, devWarn, devError } from '@/lib/logger';

// Definir e exportar as opções de autenticação
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'EMPLOYEE',
          companyId: user.companyId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        devLog('JWT Callback - Usuário autenticado:', { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        });
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
      }
      devLog('JWT Callback - Token resultante:', { 
        id: token.id, 
        role: token.role,
        sub: token.sub
      });
      return token;
    },
    async session({ session, token }) {
      if (token) {
        devLog('Session Callback - Token recebido:', { 
          id: token.id, 
          role: token.role 
        });
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
      }
      devLog('Session Callback - Sessão resultante:', { 
        id: session.user.id, 
        role: session.user.role 
      });
      return session;
    }
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 