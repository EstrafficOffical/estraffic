// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  allowDangerousEmailAccountLinking: process.env.NODE_ENV !== "production",
})

  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    })
  );
}

// === Credentials: разрешаем вход независимо от статуса (PENDING тоже можно)
// Гейт по статусу будем делать на страницах/в API, если понадобится.
providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password ?? "";
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      // ⚠️ НЕ блокируем PENDING
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role,
        status: user.status,
      } as any;
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  providers,
  // Разрешаем вход всем (OAuth тоже). Статус используем уже в UI/API.
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "USER";
        token.status = (user as any).status ?? "PENDING";
      } else if (token.email) {
        const u = await prisma.user.findUnique({ where: { email: String(token.email) } });
        if (u) {
          token.id = u.id;
          token.role = u.role;
          token.status = u.status;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role ?? "USER";
        (session.user as any).status = token.status ?? "PENDING";
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV !== "production",
};

// Удобный хелпер для серверных компонентов / API
export const auth = () => getServerSession(authOptions);
