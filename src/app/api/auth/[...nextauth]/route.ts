// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import { authOptions as baseAuthOptions } from "@/lib/auth";

// аккуратно расширяем callbacks, чтобы в токене и сессии появилась role
const authOptions: NextAuthOptions = {
  ...baseAuthOptions,
  callbacks: {
    async jwt(args) {
      // сначала даём отработать базовой логике (если она есть)
      let token = args.token;
      if (baseAuthOptions.callbacks?.jwt) {
        token = await baseAuthOptions.callbacks.jwt(args as any);
      }
      // прокидываем роль из user в токен при логине
      if (args.user && (args.user as any).role) {
        (token as any).role = (args.user as any).role;
      }
      return token;
    },
    async session(args) {
      // базовая логика (если есть)
      let session = args.session;
      if (baseAuthOptions.callbacks?.session) {
        session = await baseAuthOptions.callbacks.session(args as any);
      }
      // прокинуть role из токена в session.user
      if (session?.user) {
        (session.user as any).role = (args.token as any)?.role;
      }
      return session;
    },
    // оставляем другие возможные callbacks из базовой конфигурации
    ...baseAuthOptions.callbacks,
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
