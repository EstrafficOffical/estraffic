// src/lib/auth.ts
import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Типы ролей/статусов — под твою схему
type Role = "USER" | "ADMIN";
type UserStatus = "PENDING" | "APPROVED" | "BANNED";

// Augmentation: чтобы TS знал, что кладём в session/jwt
declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    status: UserStatus;
    name?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role: Role;
      status: UserStatus;
      image?: string | null;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    status?: UserStatus;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  // ВАЖНО: указываем свою страницу входа (русская локаль по умолчанию).
  // Если нужны другие локали — можно подставлять динамически через middleware,
  // но для устранения текущего редиректа этого достаточно.
  pages: {
    signIn: "/ru/login",
    error: "/ru/login",
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),

    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const email = (creds?.email ?? "").trim().toLowerCase();
        const password = creds?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        if (user.status === "BANNED") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          status: user.status as UserStatus,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.status = (user as any).status;
      } else if (token.email) {
        const u = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, status: true },
        });
        if (u) {
          token.id = u.id;
          token.role = u.role as Role;
          token.status = u.status as UserStatus;
        }
      }
      return token;
    },

    async session({ session, token }: any) {
      session.user = {
        ...(session.user || {}),
        id: (token.id as string) ?? "",
        role: (token.role as Role) ?? "USER",
        status: (token.status as UserStatus) ?? "PENDING",
      };
      return session;
    },
  },
};

// ──────────────────────────────────────────────────────────
// Утилиты под v4 (App Router)
// ──────────────────────────────────────────────────────────

// server-хелпер, как твоё прежнее auth()
export function auth() {
  return getServerSession(authOptions);
}

// хендлеры для app/api/auth/[...nextauth]
const nextAuthHandler = (NextAuth as any)(authOptions);
export const handlers = { GET: nextAuthHandler, POST: nextAuthHandler };

// re-export client helpers
export { signIn, signOut } from "next-auth/react";
