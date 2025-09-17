import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "./db-utils";

interface UserRow {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  unit_id: number | null;
  full_name: string;
  move_in_date: Date | null;
  move_out_date: Date | null;
  phone: string | null;
  email: string | null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // 사용자 조회
          const users = await query<UserRow[]>(
            `SELECT id, username, password, role, status, unit_id, full_name,
                    move_in_date, move_out_date, phone, email
             FROM users
             WHERE username = ? AND status = 'active'`,
            [credentials.username]
          );

          if (users.length === 0) {
            return null;
          }

          const user = users[0];

          // 비밀번호 검증
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.log(`Login failed for user: ${credentials.username}`);
            return null;
          }

          // 세션에 저장할 사용자 정보
          return {
            id: user.id.toString(),
            username: user.username,
            name: user.full_name,
            role: user.role,
            unitId: user.unit_id,
            moveInDate: user.move_in_date,
            moveOutDate: user.move_out_date,
            phone: user.phone,
            email: user.email
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.unitId = user.unitId;
        token.moveInDate = user.moveInDate;
        token.moveOutDate = user.moveOutDate;
        token.phone = user.phone;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          username: token.username as string,
          name: session.user?.name || '',
          role: token.role as 'admin' | 'viewer',
          unitId: token.unitId as number | null,
          moveInDate: token.moveInDate as Date | null,
          moveOutDate: token.moveOutDate as Date | null,
          phone: token.phone as string | null,
          email: token.email as string | null
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
};