// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Собираем массив провайдеров динамически,
 * чтобы OAuth не падал при отсутствии ENV.
 */
const providers: NextAuthOptions["providers"] = [];

// Google OAuth — только если заданы ENV
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

// Apple OAuth (по желанию; можно закомментировать, если пока не используешь)
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    })
  );
}

// Credentials (email + password)
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

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        // любые доп. поля можно добавить в JWT колбэке
        role: (user as any).role ?? "USER",
      } as any;
    },
  })
);

export const authOptions: NextAuthOptions = {
  // Приводим тип адаптера, чтобы удовлетворить TS даже при разночтениях версий
  adapter: PrismaAdapter(prisma) as any,

  session: { strategy: "jwt" },

  providers,

  pages: {
    // можешь переопределить свои страницы, если нужно
    // signIn: "/ru/login"
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role ?? "USER";
      }
      return session;
    },
  },
};
