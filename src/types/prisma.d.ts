import { PrismaClient } from '@prisma/client';

declare module '@prisma/client' {
  export interface PrismaClient {
    notification: {
      findUnique: (args: any) => Promise<any>;
      findMany: (args: any) => Promise<any[]>;
      create: (args: any) => Promise<any>;
      update: (args: any) => Promise<any>;
      delete: (args: any) => Promise<any>;
      count: (args: any) => Promise<number>;
    };
  }
}

export {}; 