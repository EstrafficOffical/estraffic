// src/lib/auth.ts
import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Строковые типы под схему */
type Role = "USER" | "ADMIN";
type UserStatus = "PENDING" | "APPROVED" | "BANNED";

/** Augmentation next-auth */
declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    status: UserStatus;
    name?: string | null;
    email?: string | null;
    image?: string | null;
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
    email?: string | null;
    name?: string | null;
    picture?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

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

        // без select — пусть Prisma вернёт все поля,
        // так TS не будет спорить про наличие role/status
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        if ((user as any).status === "BANNED") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          role: (user as any).role as Role,
          status: (user as any).status as UserStatus,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Первый вход
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role as Role;
        token.status = (user as any).status as UserStatus;
        token.email = (user as any).email ?? token.email;
        token.name = (user as any).name ?? token.name;
        token.picture = (user as any).image ?? token.picture;
        return token;
      }

      // Последующие запросы — подтягиваем актуальные поля из БД
      if (token.email) {
        const u = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (u) {
          token.id = u.id;
          token.role = (u as any).role as Role;
          token.status = (u as any).status as UserStatus;
          token.name = u.name ?? token.name;
          token.picture = u.image ?? token.picture;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        ...(session.user || {}),
        id: (token.id as string) ?? "",
        email: (token.email as string) ?? session.user?.email ?? null,
        name: (token.name as string) ?? session.user?.name ?? null,
        image: (token.picture as string) ?? session.user?.image ?? null,
        role: (token.role as Role) ?? "USER",
        status: (token.status as UserStatus) ?? "PENDING",
      };
      return session;
    },
  },
};

// server helper
export function auth() {
  return getServerSession(authOptions);
}

// хендлеры для app/api/auth/[...nextauth]
const nextAuthHandler = (NextAuth as any)(authOptions);
export const handlers = { GET: nextAuthHandler, POST: nextAuthHandler };

// клиентские хелперы
export { signIn, signOut } from "next-auth/react";
