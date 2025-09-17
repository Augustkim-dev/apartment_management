import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    name: string;
    role: 'admin' | 'viewer';
    unitId: number | null;
    moveInDate: Date | null;
    moveOutDate: Date | null;
    phone: string | null;
    email: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: 'admin' | 'viewer';
    unitId: number | null;
    moveInDate: Date | null;
    moveOutDate: Date | null;
    phone: string | null;
    email: string | null;
  }
}