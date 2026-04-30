import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { verify as verifyTotp } from "@/server/security/totp";
import type { UserRole, SubscriptionTier } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tier: SubscriptionTier;
      username: string | null;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // Either a 6-digit TOTP code or a recovery code in XXXX-XXXX-XX format.
  totpToken: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  providers: [
    ...(process.env.AUTH_GITHUB_ID
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpToken: { label: "2FA code", type: "text" },
      },
      async authorize(creds) {
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;
        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        // 2FA gate. If enabled, require either a valid TOTP token or a single
        // recovery code (which is consumed on use).
        if (user.totpEnabledAt && user.totpSecret) {
          const tok = (parsed.data.totpToken ?? "").trim();
          if (!tok) return null;

          // Recovery codes are XXXX-XXXX-XX hex; TOTP codes are 6 digits.
          const looksRecovery = /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{2}$/i.test(tok);

          let pass = false;
          if (looksRecovery) {
            const upper = tok.toUpperCase();
            for (const hashed of user.recoveryCodes) {
              if (await bcrypt.compare(upper, hashed)) {
                pass = true;
                // Consume this code so it cannot be reused
                const remaining = user.recoveryCodes.filter((c) => c !== hashed);
                await db.user.update({
                  where: { id: user.id },
                  data: { recoveryCodes: remaining },
                });
                break;
              }
            }
          } else {
            pass = verifyTotp(tok, user.totpSecret);
          }
          if (!pass) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const u = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true, tier: true, username: true },
        });
        if (u) {
          token.role = u.role;
          token.tier = u.tier;
          token.username = u.username;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as UserRole) ?? "READER";
        session.user.tier = (token.tier as SubscriptionTier) ?? "FREE";
        session.user.username = (token.username as string | null) ?? null;
      }
      return session;
    },
  },
});
