import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extending the built-in Session type
   */
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: string;
      companyId?: string;
      hourlyRate?: number;
    } & DefaultSession["user"];
  }

  /**
   * Extending the built-in User type
   */
  interface User {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: string;
    companyId?: string;
    hourlyRate?: number;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extending the built-in JWT type
   */
  interface JWT {
    id: string;
    role: string;
    companyId?: string;
    hourlyRate?: number;
  }
} 