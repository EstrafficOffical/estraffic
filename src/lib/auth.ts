// src/lib/auth.ts
import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type Role = "USER" | "MANAGER" | "ADMIN" | "OWNER";
type UserStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "BANNED";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    status: UserStatus;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    tier?: number;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role: Role;
      status: UserStatus;
      image?: string | null;
      tier?: number;
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
    tier?: number;
  }
}

const credentialsProvider = Credentials({
  name: "Email & Password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },

  async authorize(creds) {
    try {
      const email = (creds?.email ?? "").trim().toLowerCase();
      const password = creds?.password ?? "";

      if (!email || !password) return null;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) return null;
      if (user.status !== "APPROVED") return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ?? null,
        role: user.role as Role,
        status: user.status as UserStatus,
        tier: user.tier ?? 3,
      } as any;
    } catch (error) {
      console.error("[AUTH] credentials authorize failed", error);
      return null;
    }
  },
});

const providers: NextAuthOptions["providers"] = [credentialsProvider];

// Google auth stays OFF until explicitly enabled. This avoids accidental
// auto-linking / account creation while NEXUS uses approval-gated accounts.
if (
  process.env.ENABLE_GOOGLE_AUTH === "true" &&
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Intentionally no allowDangerousEmailAccountLinking.
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  session: {
    strategy: "jwt",
    // Shorter production session window than the old 30-day token.
    maxAge: 12 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        // Host-only cookie: do not broaden auth cookies to sibling subdomains.
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  pages: {
    signIn: "/ru/login",
    error: "/ru/login",
  },

  providers,

  callbacks: {
    async signIn({ user }) {
      // Every provider, not only Credentials, must resolve to a real
      // pre-approved NEXUS account.
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            status: true,
          },
        });

        return Boolean(dbUser && dbUser.status === "APPROVED");
      } catch (error) {
        console.error("[AUTH] signIn approval check failed", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role as Role;
        token.status = (user as any).status as UserStatus;
        token.email = (user as any).email ?? token.email;
        token.name = (user as any).name ?? token.name;
        token.picture = (user as any).image ?? token.picture;
        token.tier = (user as any).tier ?? 3;
        return token;
      }

      // Refresh role/status/tier from the DB whenever NextAuth refreshes JWT
      // state, so demotions and suspensions propagate into future sessions.
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: String(token.email).toLowerCase() },
            select: {
              id: true,
              role: true,
              status: true,
              name: true,
              image: true,
              tier: true,
            },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role as Role;
            token.status = dbUser.status as UserStatus;
            token.name = dbUser.name ?? token.name;
            token.picture = dbUser.image ?? token.picture;
            token.tier = dbUser.tier ?? token.tier ?? 3;
          } else {
            token.id = "";
            token.role = "USER";
            token.status = "BANNED";
          }
        } catch (error) {
          console.error("[AUTH] jwt user refresh failed", error);
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
        role: ((token.role as Role) ?? "USER") as Role,
        status: ((token.status as UserStatus) ?? "PENDING") as UserStatus,
        tier: Number(token.tier ?? 3),
      };

      return session;
    },

    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);

        // Only same-origin redirects are allowed, but preserve the requested
        // deep path/query instead of collapsing everything to /ru.
        if (target.origin !== baseUrl) {
          return `${baseUrl}/ru`;
        }

        return target.toString();
      } catch {
        return `${baseUrl}/ru`;
      }
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

const nextAuthHandler = (NextAuth as any)(authOptions);
export const handlers = { GET: nextAuthHandler, POST: nextAuthHandler };

export { signIn, signOut } from "next-auth/react";
