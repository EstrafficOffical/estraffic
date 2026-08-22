// src/lib/auth.ts
import crypto from "crypto";
import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/nexus-rate-limit";
import {
  decryptTwoFactorSecret,
  hashLoginChallengeToken,
  isTwoFactorRequiredForRole,
  recoveryHashMatches,
  verifyTotpCode,
} from "@/lib/nexus-2fa";

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
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
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
      twoFactorEnabled?: boolean;
      twoFactorVerified?: boolean;
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
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  }
}

function userPayload(
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: Role;
    status: UserStatus;
    tier: number;
  },
  twoFactorEnabled: boolean,
  twoFactorVerified: boolean,
) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    role: user.role,
    status: user.status,
    tier: user.tier ?? 3,
    twoFactorEnabled,
    twoFactorVerified,
  } as any;
}

const credentialsProvider = Credentials({
  name: "Email & Password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    challengeToken: { label: "Challenge token", type: "text" },
    verificationCode: { label: "2FA code", type: "text" },
  },

  async authorize(creds, req) {
    try {
      const credentialsIpLimit = await checkRateLimit({
        scope: "auth-credentials-ip",
        identifier: clientIpFromHeaders((req as any)?.headers),
        limit: 30,
        windowSeconds: 15 * 60,
      });

      if (!credentialsIpLimit.allowed) {
        console.warn("[AUTH] credentials IP rate limited");
        return null;
      }

      const challengeToken = String(creds?.challengeToken || "").trim();
      const verificationCode = String(creds?.verificationCode || "").trim();

      // Second stage: one-time server-side challenge + TOTP/recovery code.
      if (challengeToken) {
        if (!verificationCode) return null;

        const tokenHash = hashLoginChallengeToken(challengeToken);
        const now = new Date();

        return await prisma.$transaction(
          async (tx) => {
            const challenge = await tx.nexusLoginChallenge.findUnique({
              where: { tokenHash },
              include: {
                user: {
                  include: {
                    twoFactor: true,
                  },
                },
              },
            });

            if (
              !challenge ||
              challenge.consumedAt ||
              challenge.expiresAt <= now ||
              challenge.attempts >= 5
            ) {
              return null;
            }

            const user = challenge.user;
            const factor = user.twoFactor;

            if (
              user.status !== "APPROVED" ||
              !factor?.enabled ||
              !factor.secretEnc
            ) {
              return null;
            }

            let verified = false;
            let recoveryIndex = -1;

            if (/^\d{6}$/.test(verificationCode)) {
              const secret = decryptTwoFactorSecret(factor.secretEnc);
              verified = verifyTotpCode(secret, verificationCode);
            } else {
              recoveryIndex = factor.recoveryHashes.findIndex((hash) =>
                recoveryHashMatches(hash, verificationCode),
              );
              verified = recoveryIndex >= 0;
            }

            if (!verified) {
              await tx.nexusLoginChallenge.updateMany({
                where: {
                  id: challenge.id,
                  consumedAt: null,
                  attempts: { lt: 5 },
                },
                data: {
                  attempts: { increment: 1 },
                },
              });

              return null;
            }

            // Atomic one-time claim prevents concurrent reuse of the same
            // pre-auth challenge.
            const claimed = await tx.nexusLoginChallenge.updateMany({
              where: {
                id: challenge.id,
                consumedAt: null,
                expiresAt: { gt: now },
              },
              data: {
                consumedAt: now,
              },
            });

            if (claimed.count !== 1) {
              return null;
            }

            if (recoveryIndex >= 0) {
              const remaining = factor.recoveryHashes.filter(
                (_, index) => index !== recoveryIndex,
              );

              await tx.nexusTwoFactor.update({
                where: { userId: user.id },
                data: {
                  recoveryHashes: remaining,
                  lastUsedAt: now,
                },
              });
            } else {
              await tx.nexusTwoFactor.update({
                where: { userId: user.id },
                data: {
                  lastUsedAt: now,
                },
              });
            }

            return userPayload(
              {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role as Role,
                status: user.status as UserStatus,
                tier: user.tier,
              },
              true,
              true,
            );
          },
          {
            isolationLevel: "Serializable",
          },
        );
      }

      // First-stage direct credentials login is allowed only for accounts
      // that do not use 2FA and are not roles that require 2FA.
      const email = (creds?.email ?? "").trim().toLowerCase();
      const password = creds?.password ?? "";

      if (!email || !password) return null;

      const credentialsEmailLimit = await checkRateLimit({
        scope: "auth-credentials-email",
        identifier: email,
        limit: 30,
        windowSeconds: 60 * 60,
      });

      if (!credentialsEmailLimit.allowed) {
        console.warn("[AUTH] credentials account rate limited");
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          twoFactor: true,
        },
      });

      if (!user?.passwordHash) return null;
      if (user.status !== "APPROVED") return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      const factorEnabled = Boolean(user.twoFactor?.enabled);

      if (
        factorEnabled ||
        isTwoFactorRequiredForRole(user.role)
      ) {
        // Must complete /api/auth/2fa/preauth + challenge stage.
        return null;
      }

      return userPayload(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as Role,
          status: user.status as UserStatus,
          tier: user.tier,
        },
        false,
        false,
      );
    } catch (error) {
      console.error("[AUTH] credentials authorize failed", error);
      return null;
    }
  },
});

const providers: NextAuthOptions["providers"] = [credentialsProvider];

if (
  process.env.ENABLE_GOOGLE_AUTH === "true" &&
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  session: {
    strategy: "jwt",
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
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            role: true,
            status: true,
            twoFactor: {
              select: {
                enabled: true,
              },
            },
          },
        });

        if (!dbUser || dbUser.status !== "APPROVED") {
          return false;
        }

        const requiresTwoFactor =
          isTwoFactorRequiredForRole(dbUser.role) ||
          Boolean(dbUser.twoFactor?.enabled);

        if (
          requiresTwoFactor &&
          (user as any).twoFactorVerified !== true
        ) {
          return false;
        }

        return true;
      } catch (error) {
        console.error("[AUTH] signIn approval/2FA check failed", error);
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
        token.twoFactorEnabled = Boolean(
          (user as any).twoFactorEnabled,
        );
        token.twoFactorVerified =
          (user as any).twoFactorVerified === true;

        return token;
      }

      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: {
              email: String(token.email).toLowerCase(),
            },
            select: {
              id: true,
              role: true,
              status: true,
              name: true,
              image: true,
              tier: true,
              twoFactor: {
                select: {
                  enabled: true,
                },
              },
            },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role as Role;
            token.status = dbUser.status as UserStatus;
            token.name = dbUser.name ?? token.name;
            token.picture = dbUser.image ?? token.picture;
            token.tier = dbUser.tier ?? token.tier ?? 3;
            token.twoFactorEnabled = Boolean(
              dbUser.twoFactor?.enabled,
            );

            if (!token.twoFactorEnabled) {
              token.twoFactorVerified = false;
            }
          } else {
            token.id = "";
            token.role = "USER";
            token.status = "BANNED";
            token.twoFactorEnabled = false;
            token.twoFactorVerified = false;
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
        email:
          (token.email as string) ??
          session.user?.email ??
          null,
        name:
          (token.name as string) ??
          session.user?.name ??
          null,
        image:
          (token.picture as string) ??
          session.user?.image ??
          null,
        role: ((token.role as Role) ?? "USER") as Role,
        status: ((token.status as UserStatus) ??
          "PENDING") as UserStatus,
        tier: Number(token.tier ?? 3),
        twoFactorEnabled: Boolean(token.twoFactorEnabled),
        twoFactorVerified:
          token.twoFactorVerified === true,
      };

      return session;
    },

    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);

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

export async function auth() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return session;
  }

  const requiresTwoFactor =
    isTwoFactorRequiredForRole(session.user.role) ||
    session.user.twoFactorEnabled === true;

  if (
    requiresTwoFactor &&
    session.user.twoFactorVerified !== true
  ) {
    return null;
  }

  return session;
}

const nextAuthHandler = (NextAuth as any)(authOptions);
export const handlers = {
  GET: nextAuthHandler,
  POST: nextAuthHandler,
};

export { signIn, signOut } from "next-auth/react";
