import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";
import { UserRole } from "@/lib/utils";

// Declarar tipos para o TypeScript
declare module "next-auth" {
  interface User {
    role: string;
    companyId?: string | null;
  }
  
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      companyId?: string | null;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    companyId?: string | null;
  }
}

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
        console.log('JWT Callback - Usuário autenticado:', { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        });
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
      }
      console.log('JWT Callback - Token resultante:', { 
        id: token.id, 
        role: token.role,
        sub: token.sub
      });
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log('Session Callback - Token recebido:', { 
          id: token.id, 
          role: token.role 
        });
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
      }
      console.log('Session Callback - Sessão resultante:', { 
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 